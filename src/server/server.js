/**
 * SurfGame server — Production build
 * Express REST API + WebSocket real-time multiplayer
 * SQLite persistence via better-sqlite3
 */

import express from 'express';
import { WebSocketServer } from 'ws';
import { createServer } from 'http';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// DB must be imported before routes
import './db.js';
import { requireAuth } from './auth.js';

// Routes
import playerRoutes      from './routes/player.js';
import scoresRoutes      from './routes/scores.js';
import ghostsRoutes      from './routes/ghosts.js';
import achievementsRoutes from './routes/achievements.js';
import unlocksRoutes     from './routes/unlocks.js';
import challengesRoutes  from './routes/challenges.js';
import settingsRoutes    from './routes/settings.js';
import xpRoutes          from './routes/xp.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT      = process.env.PORT || 3000;

const app        = express();
const httpServer = createServer(app);
const wss        = new WebSocketServer({ server: httpServer });

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(express.json({ limit: '4mb' }));
app.use(express.urlencoded({ extended: false }));

// CORS for dev
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

// ── API Routes ────────────────────────────────────────────────────────────────
app.use('/api', playerRoutes);
app.use('/api', scoresRoutes);
app.use('/api', ghostsRoutes);
app.use('/api', achievementsRoutes);
app.use('/api', unlocksRoutes);
app.use('/api', challengesRoutes);
app.use('/api', settingsRoutes);
app.use('/api', xpRoutes);

// Health check
app.get('/api/health', (_req, res) => res.json({ ok: true }));

// ── Static files ──────────────────────────────────────────────────────────────
const distPath = join(__dirname, '../../dist');
app.use(express.static(distPath));
app.get('*', (_req, res) => res.sendFile(join(distPath, 'index.html')));

// ── Online Lobby ──────────────────────────────────────────────────────────────
const CATALOG_IDS = Array.from({ length: 32 }, (_, i) => `map_${String(i+1).padStart(2,'0')}`);
const LOBBY_MS = 10 * 60 * 1000;

const lobby = {
  mapId:        'map_01',
  nextRotateAt: Date.now() + LOBBY_MS,
  skipVotes:    new Set(),
};

function pickLobbyMap(excludeId = null) {
  if (Math.random() < 0.18) {
    const seed = Math.floor(Math.random() * 999983) + 10007;
    return `proc_${seed}`;
  }
  let pool = excludeId ? CATALOG_IDS.filter(id => id !== excludeId) : [...CATALOG_IDS];
  return pool[Math.floor(Math.random() * pool.length)];
}

function rotateLobbyMap(forced = false) {
  lobby.mapId       = pickLobbyMap(lobby.mapId);
  lobby.nextRotateAt = Date.now() + LOBBY_MS;
  lobby.skipVotes.clear();
  broadcastAll({ type: 'mapChange', mapId: lobby.mapId, nextRotateAt: lobby.nextRotateAt });
  console.log(`[Lobby] ${forced ? 'Force-skipped' : 'Auto-rotated'} to ${lobby.mapId}`);
}

setInterval(() => {
  if (Date.now() >= lobby.nextRotateAt) rotateLobbyMap(false);
}, 10_000);

// ── WebSocket Constants ───────────────────────────────────────────────────────
const START_HP          = 100;
const HIT_RADIUS        = 28;
const MAX_RANGE         = 4000;
const BULLET_DAMAGE     = 20;
const RESPAWN_DELAY     = 2000;
const MIN_FINISH_TIME   = 5;    // seconds
const MAX_LEADERBOARD   = 10;
const SHOOT_INTERVAL_MS = 150;

// ── Player state ──────────────────────────────────────────────────────────────
// id → { ws, snap, hp, name, color, kills, deaths, pingMs, alive, lastShot, playerId }
const players = new Map();
let nextId = 1;

// In-memory leaderboard (top 10 best times, all maps combined or per map)
// For WS leaderboard we use a simple flat array
const wsLeaderboard = []; // [{ name, mapId, time_ms, date }]

function recordWsFinish(name, mapId, timeSec) {
  const timeMs = Math.round(timeSec * 1000);
  const key    = `${name}|${mapId}`;
  const idx    = wsLeaderboard.findIndex(e => `${e.name}|${e.mapId}` === key);
  if (idx !== -1 && wsLeaderboard[idx].time_ms <= timeMs) return;
  if (idx !== -1) wsLeaderboard.splice(idx, 1);
  wsLeaderboard.push({ name, mapId, time_ms: timeMs, date: new Date().toISOString().slice(0, 10) });
  wsLeaderboard.sort((a, b) => a.time_ms - b.time_ms);
  if (wsLeaderboard.length > MAX_LEADERBOARD * 4) wsLeaderboard.length = MAX_LEADERBOARD * 4;
}

// ── Broadcast helpers ─────────────────────────────────────────────────────────
function broadcast(senderId, msg) {
  const data = JSON.stringify(msg);
  for (const [id, p] of players) {
    if (id !== senderId && p.ws.readyState === 1) p.ws.send(data);
  }
}

function broadcastAll(msg) {
  const data = JSON.stringify(msg);
  for (const p of players.values()) {
    if (p.ws.readyState === 1) p.ws.send(data);
  }
}

function send(ws, msg) {
  if (ws.readyState === 1) ws.send(JSON.stringify(msg));
}

function broadcastPlayerList() {
  const list = [];
  for (const [id, p] of players) {
    list.push({ id, name: p.name, color: p.color, kills: p.kills, deaths: p.deaths, hp: p.hp, alive: p.alive });
  }
  broadcastAll({ type: 'players', list });
}
setInterval(broadcastPlayerList, 3000);

// ── Ray-sphere intersection ───────────────────────────────────────────────────
function rayHitsSphere(ox, oy, oz, dx, dy, dz, cx, cy, cz, r) {
  const ex = ox - cx, ey = oy - cy, ez = oz - cz;
  const b  = 2 * (ex * dx + ey * dy + ez * dz);
  const c  = ex * ex + ey * ey + ez * ez - r * r;
  const disc = b * b - 4 * c;
  if (disc < 0) return false;
  const t = (-b - Math.sqrt(disc)) / 2;
  return t >= 0 && t <= MAX_RANGE;
}

// ── WebSocket handler ─────────────────────────────────────────────────────────
wss.on('connection', (ws) => {
  const id   = nextId++;
  const name = `Player ${id}`;
  players.set(id, {
    ws, snap: null, hp: START_HP, name, color: '#00cfff',
    kills: 0, deaths: 0, pingMs: 0, alive: true, lastShot: 0, playerId: null,
  });

  // Welcome
  const existing = [];
  for (const [pid, p] of players) {
    if (pid !== id && p.snap) existing.push({ id: pid, name: p.name, color: p.color, hp: p.hp, ...p.snap });
  }
  send(ws, { type: 'welcome', id, name, count: players.size, existing });

  send(ws, {
    type: 'lobbyState',
    mapId: lobby.mapId,
    nextRotateAt: lobby.nextRotateAt,
    skipVotes: lobby.skipVotes.size,
    skipNeeded: Math.ceil(players.size * 0.51),
    playerCount: players.size,
  });

  const lb = wsLeaderboard.slice(0, MAX_LEADERBOARD);
  if (lb.length > 0) send(ws, { type: 'leaderboard', list: lb });

  broadcast(id, { type: 'join', id, name });
  console.log(`[+] ${name} connected  (${players.size} online)`);

  ws.on('message', (raw) => {
    let msg;
    try { msg = JSON.parse(raw); } catch { return; }

    const player = players.get(id);
    if (!player) return;

    switch (msg.type) {

      case 'snap': {
        const x = +msg.x, y = +msg.y, z = +msg.z;
        if (!isFinite(x) || !isFinite(y) || !isFinite(z)) break;
        if (Math.abs(x) > 6000 || y < -3000 || y > 1000 || z < -1000 || z > 12000) break;
        const snap = {
          x, y, z,
          vx: +msg.vx || 0, vy: +msg.vy || 0, vz: +msg.vz || 0,
          yaw: +msg.yaw || 0, onRamp: msg.onRamp ? 1 : 0,
        };
        player.snap = snap;
        broadcast(id, { type: 'snap', id, t: Date.now(), ...snap });
        break;
      }

      case 'shoot': {
        if (!player.alive) break;
        const now = Date.now();
        if (now - player.lastShot < SHOOT_INTERVAL_MS) break;
        player.lastShot = now;

        const { ox, oy, oz, dx, dy, dz } = msg;
        if ([ox, oy, oz, dx, dy, dz].some(v => !isFinite(+v))) break;

        let hitId = null, hitDist = Infinity;
        for (const [pid, p] of players) {
          if (pid === id || !p.alive || !p.snap) continue;
          const cx = p.snap.x, cy = p.snap.y + 36, cz = p.snap.z;
          if (rayHitsSphere(+ox, +oy, +oz, +dx, +dy, +dz, cx, cy, cz, HIT_RADIUS)) {
            const dist = Math.sqrt((+ox-cx)**2 + (+oy-cy)**2 + (+oz-cz)**2);
            if (dist < hitDist) { hitDist = dist; hitId = pid; }
          }
        }

        if (hitId !== null) {
          const target = players.get(hitId);
          target.hp = Math.max(0, target.hp - BULLET_DAMAGE);

          if (target.hp <= 0) {
            target.alive  = false;
            target.deaths++;
            player.kills++;
            broadcastAll({ type: 'kill', killerId: id, victimId: hitId,
              killerName: player.name, victimName: target.name });
            setTimeout(() => {
              const t = players.get(hitId);
              if (t) {
                t.hp = START_HP; t.alive = true;
                send(t.ws, { type: 'respawn', hp: START_HP });
                broadcastAll({ type: 'playerHp', id: hitId, hp: START_HP });
              }
            }, RESPAWN_DELAY);
          } else {
            broadcastAll({ type: 'dmg', targetId: hitId, shooterId: id,
              damage: BULLET_DAMAGE, hp: target.hp });
            send(target.ws, { type: 'hurt', damage: BULLET_DAMAGE, hp: target.hp });
          }
          send(ws, { type: 'hitConfirm', targetId: hitId });
        }
        break;
      }

      case 'meta': {
        if (msg.name && typeof msg.name === 'string') {
          player.name  = msg.name.slice(0, 24).replace(/[<>"]/g, '');
        }
        if (msg.color && typeof msg.color === 'string') {
          player.color = (msg.color.match(/^#[0-9a-fA-F]{6}$/)?.[0]) ?? player.color;
        }
        broadcast(id, { type: 'meta', id, name: player.name, color: player.color });
        break;
      }

      case 'finish': {
        if (!player.alive) break;
        const timeSec = parseFloat(msg.time);
        const mapId   = String(msg.map_id || 'map_01').slice(0, 32);
        if (isNaN(timeSec) || timeSec < MIN_FINISH_TIME) break;
        console.log(`[Finish] ${player.name} on ${mapId}: ${timeSec.toFixed(3)}s`);
        recordWsFinish(player.name, mapId, timeSec);
        broadcastAll({ type: 'finish', id, name: player.name, mapId, time: timeSec });
        broadcastAll({ type: 'leaderboard', list: wsLeaderboard.slice(0, MAX_LEADERBOARD) });
        break;
      }

      case 'chat': {
        if (msg.text && typeof msg.text === 'string') {
          const text = msg.text.slice(0, 120).replace(/[<>"]/g, '');
          broadcastAll({ type: 'chat', id, name: player.name, text });
        }
        break;
      }

      case 'ping': {
        send(ws, { type: 'pong', t: msg.t });
        break;
      }

      case 'requestRespawn': {
        // Instant respawn on R-key request while dead
        const rp = players.get(id);
        if (rp && !rp.alive) {
          rp.hp    = START_HP;
          rp.alive = true;
          send(ws, { type: 'respawn', hp: START_HP });
          broadcastAll({ type: 'playerHp', id, hp: START_HP });
        }
        break;
      }

      case 'voteSkip': {
        lobby.skipVotes.add(id);
        const needed = Math.max(1, Math.ceil(players.size * 0.51));
        broadcastAll({
          type: 'lobbyState',
          mapId: lobby.mapId,
          nextRotateAt: lobby.nextRotateAt,
          skipVotes: lobby.skipVotes.size,
          skipNeeded: needed,
          playerCount: players.size,
        });
        if (lobby.skipVotes.size >= needed) {
          rotateLobbyMap(true);
        }
        break;
      }
    }
  });

  ws.on('close', () => {
    players.delete(id);
    broadcast(id, { type: 'leave', id });
    console.log(`[-] ${name} left  (${players.size} online)`);
  });

  ws.on('error', () => {});
});

httpServer.listen(PORT, () => console.log(`[SurfGame] Server on port ${PORT}`));
