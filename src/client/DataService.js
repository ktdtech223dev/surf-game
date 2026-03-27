/**
 * DataService — Client-side REST API wrapper
 * - No localStorage or IndexedDB (server-authoritative)
 * - In-memory cache with TTL
 * - Write retry queue for transient failures
 * - Token held in memory only
 */

const API_BASE = '/api';
const RETRY_LIMIT = 3;
const RETRY_DELAY = 2000; // ms

class DataService {
  constructor() {
    this._token   = null;
    this._player  = null;
    this._cache   = new Map();   // key → { data, expiry }
    this._queue   = [];          // pending write retries
    this._flushing = false;
    this._ready   = false;
    this._onReadyCbs = [];
  }

  // ── Auth ───────────────────────────────────────────────────────────────────

  async register(name) {
    const res = await this._req('POST', '/auth/register', { name }, false);
    this._token  = res.token;
    this._player = res.player;
    this._ready  = true;
    this._onReadyCbs.forEach(fn => fn(this._player));
    this._onReadyCbs = [];
    return res;
  }

  onReady(fn) {
    if (this._ready) { fn(this._player); return; }
    this._onReadyCbs.push(fn);
  }

  get player()    { return this._player; }
  get playerId()  { return this._player?.id ?? null; }
  get playerName(){ return this._player?.name ?? 'Player'; }
  get isReady()   { return this._ready; }

  // ── Player Profile ─────────────────────────────────────────────────────────

  async getProfile() {
    return this._cached('profile', 60, () =>
      this._req('GET', '/player/profile').then(r => r.player)
    );
  }

  async updateProfile(updates) {
    this._invalidate('profile');
    const res = await this._retryWrite('PUT', '/player/profile', updates);
    if (res?.player) this._player = res.player;
    return res?.player;
  }

  // ── Scores ─────────────────────────────────────────────────────────────────

  async getScores(mapId) {
    return this._cached(`scores:${mapId}`, 30, () =>
      this._req('GET', `/scores?map_id=${encodeURIComponent(mapId)}`)
    );
  }

  async submitScore(mapId, timeMs) {
    this._invalidate(`scores:${mapId}`);
    return this._retryWrite('POST', '/scores', { map_id: mapId, time_ms: timeMs });
  }

  // ── Ghosts ─────────────────────────────────────────────────────────────────

  async getTopGhost(mapId) {
    return this._cached(`ghost:${mapId}`, 60, () =>
      this._req('GET', `/ghosts?map_id=${encodeURIComponent(mapId)}`).then(r => r.ghost)
    );
  }

  async submitGhost(mapId, timeMs, arrayBuffer) {
    this._invalidate(`ghost:${mapId}`);
    const b64 = _arrayBufferToBase64(arrayBuffer);
    return this._retryWrite('POST', '/ghosts', { map_id: mapId, time_ms: timeMs, data: b64 });
  }

  async fetchGhostData(ghostId) {
    const url = `${API_BASE}/ghosts/${ghostId}/data`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Ghost fetch failed: ${res.status}`);
    return res.arrayBuffer();
  }

  // ── Achievements ───────────────────────────────────────────────────────────

  async getAchievements() {
    return this._cached('achievements', 120, () =>
      this._req('GET', '/achievements').then(r => r.achievements)
    );
  }

  async unlockAchievement(key) {
    this._invalidate('achievements');
    return this._retryWrite('POST', '/achievements', { key });
  }

  // ── Unlocks ────────────────────────────────────────────────────────────────

  async getUnlocks() {
    return this._cached('unlocks', 120, () =>
      this._req('GET', '/unlocks').then(r => r.unlocks)
    );
  }

  async grantUnlock(itemType, itemId) {
    this._invalidate('unlocks');
    return this._retryWrite('POST', '/unlocks', { item_type: itemType, item_id: itemId });
  }

  // ── Settings ───────────────────────────────────────────────────────────────

  async getSettings() {
    return this._cached('settings', 300, () =>
      this._req('GET', '/settings').then(r => r.settings)
    );
  }

  async saveSettings(updates) {
    this._invalidate('settings');
    return this._retryWrite('PUT', '/settings', updates);
  }

  // ── Challenges ─────────────────────────────────────────────────────────────

  async getDailyChallenge() {
    return this._cached('challenge:daily', 60, () =>
      this._req('GET', '/challenges/daily')
    );
  }

  async getWeeklyChallenge() {
    return this._cached('challenge:weekly', 300, () =>
      this._req('GET', '/challenges/weekly')
    );
  }

  async completeChallenge(challengeId) {
    this._invalidate('challenge:daily');
    this._invalidate('challenge:weekly');
    return this._retryWrite('POST', `/challenges/${challengeId}/complete`, {});
  }

  // ── Internal helpers ───────────────────────────────────────────────────────

  async _req(method, path, body = null, auth = true) {
    const headers = { 'Content-Type': 'application/json' };
    if (auth && this._token) headers['Authorization'] = `Bearer ${this._token}`;

    const opts = { method, headers };
    if (body) opts.body = JSON.stringify(body);

    const res = await fetch(`${API_BASE}${path}`, opts);
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw Object.assign(new Error(err.error || 'Request failed'), { status: res.status });
    }
    return res.json();
  }

  async _cached(key, ttlSec, fetcher) {
    const entry = this._cache.get(key);
    if (entry && entry.expiry > Date.now()) return entry.data;
    const data = await fetcher();
    this._cache.set(key, { data, expiry: Date.now() + ttlSec * 1000 });
    return data;
  }

  _invalidate(key) {
    this._cache.delete(key);
  }

  /** Queue a write with retry on failure. Returns immediately with a promise. */
  _retryWrite(method, path, body) {
    return new Promise((resolve, reject) => {
      this._queue.push({ method, path, body, retries: 0, resolve, reject });
      if (!this._flushing) this._flushQueue();
    });
  }

  async _flushQueue() {
    this._flushing = true;
    while (this._queue.length > 0) {
      const item = this._queue[0];
      try {
        const result = await this._req(item.method, item.path, item.body);
        item.resolve(result);
        this._queue.shift();
      } catch (e) {
        item.retries++;
        if (item.retries >= RETRY_LIMIT) {
          item.reject(e);
          this._queue.shift();
        } else {
          await _sleep(RETRY_DELAY * item.retries);
        }
      }
    }
    this._flushing = false;
  }
}

function _sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function _arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary  = '';
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

// Singleton
export const ds = new DataService();
