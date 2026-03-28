/**
 * XPSystem — Client-side XP + leveling logic
 * Syncs with server; falls back to localStorage when offline.
 * Usage:
 *   const xp = new XPSystem(ds);
 *   await xp.load();
 *   const result = await xp.add(50, 'map_finish');   // { xp, level, levelUps, unlocks }
 */
import { ds } from './DataService.js';

// ── Constants ─────────────────────────────────────────────────────────────────

export const XP = {
  MAP_FINISH_BASE:  50,
  BEAT_PB:          25,
  TIME_BONUS_MAX:   50,   // scaled by 1 - time/par, floored at 0
  KILL:             10,
  KILL_STREAK:       5,   // bonus per kill after 2-streak within 10s
  RACE_1ST:         50,
  RACE_2ND:         30,
  RACE_3RD:         20,
  DAILY_CHALLENGE: 100,
  WEEKLY_CHALLENGE:500,
  TIME_PLAYED_MIN:   2,   // per minute of play
};

export const DIFFICULTY_MULT = {
  beginner:     1.0,
  intermediate: 1.5,
  advanced:     2.0,
  expert:       3.0,
};

const LS_KEY = 'surfgame_xp';

// ── Level math ────────────────────────────────────────────────────────────────

/** XP needed to go from level N → N+1 */
export function xpForNextLevel(level) {
  return Math.max(100, Math.floor(100 * Math.pow(Math.max(1, level), 1.18)));
}

/** Total XP needed to reach a level from 0 */
export function totalXpForLevel(level) {
  let total = 0;
  for (let i = 1; i < level; i++) total += xpForNextLevel(i);
  return total;
}

/** Level name / title for a given level */
export function levelTitle(level) {
  if (level >= 100) return 'Legend';
  if (level >= 75)  return 'Master';
  if (level >= 50)  return 'Expert';
  if (level >= 30)  return 'Advanced';
  if (level >= 15)  return 'Intermediate';
  if (level >= 5)   return 'Apprentice';
  return 'Rookie';
}

// ── XPSystem class ─────────────────────────────────────────────────────────────

export class XPSystem {
  constructor() {
    this._xp       = 0;
    this._level    = 1;
    this._loaded   = false;

    // Callbacks
    this.onXPGain  = null;  // (amount, source, newXP, newLevel) => void
    this.onLevelUp = null;  // (oldLevel, newLevel, rewards) => void
  }

  get xp()    { return this._xp; }
  get level() { return this._level; }
  get xpNeeded() { return xpForNextLevel(this._level); }
  get progress() { return Math.min(1, this._xp / this.xpNeeded); }
  get title()    { return levelTitle(this._level); }

  // ── Load from server (or localStorage fallback) ────────────────────────────
  async load() {
    if (ds.isReady) {
      try {
        const data = await ds.getXP();
        this._xp    = data.xp    ?? 0;
        this._level = data.level ?? 1;
        this._saveLocal();
        this._loaded = true;
        return;
      } catch (e) {
        console.warn('[XPSystem] Server load failed, using local:', e.message);
      }
    }
    this._loadLocal();
    this._loaded = true;
  }

  // ── Award XP ───────────────────────────────────────────────────────────────
  async add(amount, source = 'unknown') {
    if (amount <= 0) return null;
    const oldLevel = this._level;

    if (ds.isReady) {
      try {
        const res = await ds.addXP(amount, source);
        const oldXP    = this._xp;
        this._xp       = res.xp;
        this._level    = res.level;
        this._saveLocal();

        if (this.onXPGain) this.onXPGain(res.xpAdded, source, this._xp, this._level);

        if (res.levelUps?.length > 0) {
          if (this.onLevelUp) this.onLevelUp(oldLevel, this._level, res.unlocks ?? []);
        }
        return res;
      } catch (e) {
        console.warn('[XPSystem] Server add failed, local only:', e.message);
      }
    }

    // Offline path
    this._xp += amount;
    const levelUps = [];
    while (this._xp >= xpForNextLevel(this._level)) {
      this._xp   -= xpForNextLevel(this._level);
      this._level += 1;
      levelUps.push(this._level);
    }
    this._saveLocal();

    if (this.onXPGain) this.onXPGain(amount, source, this._xp, this._level);
    if (levelUps.length > 0 && this.onLevelUp) this.onLevelUp(oldLevel, this._level, []);

    return { xp: this._xp, level: this._level, xpAdded: amount, levelUps, unlocks: [] };
  }

  // ── Convenience XP award methods ──────────────────────────────────────────
  async awardMapFinish(difficulty = 'beginner', timeSec = null, parSec = null, isPB = false) {
    const mult    = DIFFICULTY_MULT[difficulty] ?? 1.0;
    let   total   = Math.round(XP.MAP_FINISH_BASE * mult);
    let   sources = [{ amount: Math.round(XP.MAP_FINISH_BASE * mult), source: 'map_finish' }];

    if (isPB) {
      sources.push({ amount: XP.BEAT_PB, source: 'beat_pb' });
      total += XP.BEAT_PB;
    }

    if (timeSec && parSec && timeSec < parSec) {
      const ratio  = Math.max(0, 1 - timeSec / parSec);
      const bonus  = Math.round(XP.TIME_BONUS_MAX * ratio * mult);
      if (bonus > 0) {
        sources.push({ amount: bonus, source: 'time_bonus' });
        total += bonus;
      }
    }

    let lastResult = null;
    for (const s of sources) {
      lastResult = await this.add(s.amount, s.source);
    }
    return { total, sources, result: lastResult };
  }

  async awardKill() {
    return this.add(XP.KILL, 'kill');
  }

  async awardDailyChallenge() {
    return this.add(XP.DAILY_CHALLENGE, 'daily_challenge');
  }

  async awardWeeklyChallenge() {
    return this.add(XP.WEEKLY_CHALLENGE, 'weekly_challenge');
  }

  // ── Persistence ───────────────────────────────────────────────────────────
  _saveLocal() {
    try { localStorage.setItem(LS_KEY, JSON.stringify({ xp: this._xp, level: this._level })); } catch {}
  }

  _loadLocal() {
    try {
      const d = JSON.parse(localStorage.getItem(LS_KEY) || '{}');
      this._xp    = d.xp    ?? 0;
      this._level = d.level ?? 1;
    } catch { this._xp = 0; this._level = 1; }
  }
}
