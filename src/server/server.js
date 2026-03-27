/**
 * SurfGame server — Phase 2/3
 * Multiplayer: position sync, combat (hitscan), kill feed, chat
 */

import express from 'express';
import { WebSocketServer } from 'ws';
import { createServer } from 'http';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT      = process.env.PORT || 3000;

const app        = express();
const httpServer = createServer(app);
const wss        = new WebSocketServer({ server: httpServer });

// ── Static files ──────────────────────────────────────────────────────────────
const distPath = join(__dirname, '../../dist');
app.use(express.static(distPath));
app.get('*', (_req, res) => res.sendFile(join(distPath, 'index.html')));

// ── Constants ─────────────────────────────────────────────────────────────────
const START_HP      = 100;
const HIT_RADIUS    = 28;    // player collision sphere radius for bullets
const MAX_RANGE     = 4000;  // max bullet range
const BULLET_DAMAGE = 20;    // hp per hit (5 shots to kill)
const RESPAWN_DELAY = 2000;  // ms before respawn after death
const MIN_FINISH_TIME = 15;  // seconds — minimum valid run time
const MAX_LEADERBOARD = 10;  // top N times to keep

// ── Player state ──────────────────────────────────────────────────────────────
const players = new Map(); // id → { ws, snap, hp, name, kills, deaths, pingMs, alive, color }
let nextId = 1;

// ── Run leaderboard (top 10 best times, persists in memory) ───────────────────
const leaderboard = []; // [{ name, time, date }] sorted by time asc

function recordFinish(name, timeSec) {
  // Check if this player already has a better time
  const existing = leaderboard.findIndex(e => e.name === name);
  if (existing !== -1 && leaderboard[existing].time <= timeSec) return; // not a PB
  if (existing !== -1) leaderboard.splice(existing, 1);

  leaderboard.push({ name, time: timeSec, date: new Date().toISOString().slice(0, 10) });
  leaderboard.sort((a, b) => a.time - b.time);
  if (leaderboard.length > MAX_LEADERBOARD) leaderboard.length = MAX_LEADERBOARD;
}

function broadcastLeaderboard() {
  broadcastAll({ type: 'leaderboard', list: leaderboard });
}

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

// ── Player list broadcast (periodic) ─────────────────────────────────────────
function broadcastPlayerList() {
  const list = [];
  for (const [id, p] of players) {
    list.push({ id, name: p.name, kills: p.kills, deaths: p.deaths, hp: p.hp, alive: p.alive });
  }
  broadcastAll({ type: 'players', list });
}
setInterval(broadcastPlayerList, 3000);

// ── WebSocket handler ─────────────────────────────────────────────────────────
wss.on('connection', (ws) => {
  const id = nextId++;
  const name = `Player ${id}`;
  players.set(id, { ws, snap: null, hp: START_HP, name, kills: 0, deaths: 0, pingMs: 0, alive: true });

  // Welcome: send own id + list of existing players
  const existing = [];
  for (const [pid, p] of players) {
    if (pid !== id && p.snap) existing.push({ id: pid, name: p.name, hp: p.hp, ...p.snap });
  }
  send(ws, { type: 'welcome', id, name, count: players.size, existing });
  if (leaderboard.length > 0) send(ws, { type: 'leaderboard', list: leaderboard });
  broadcast(id, { type: 'join', id, name });

  console.log(`[+] ${name} connected  (${players.size} online)`);

  ws.on('message', (raw) => {
    let msg;
    try { msg = JSON.parse(raw); } catch { return; }

    const player = players.get(id);
    if (!player) return;

    switch (msg.type) {

      case 'snap': {
        const snap = {
          x: msg.x, y: msg.y, z: msg.z,
          vx: msg.vx, vy: msg.vy, vz: msg.vz,
          yaw: msg.yaw, onRamp: msg.onRamp,
        };
        player.snap = snap;
        broadcast(id, { type: 'snap', id, t: Date.now(), ...snap });
        break;
      }

      case 'shoot': {
        if (!player.alive) break;

        const { ox, oy, oz, dx, dy, dz } = msg;

        // Server-side hit detection against all other players
        let hitId = null, hitDist = Infinity;
        for (const [pid, p] of players) {
          if (pid === id || !p.alive || !p.snap) continue;
          // Use head position (snap.y + 60 = eye height)
          const cx = p.snap.x, cy = p.snap.y + 36, cz = p.snap.z;
          if (rayHitsSphere(ox, oy, oz, dx, dy, dz, cx, cy, cz, HIT_RADIUS)) {
            const dist = Math.sqrt((ox-cx)**2 + (oy-cy)**2 + (oz-cz)**2);
            if (dist < hitDist) { hitDist = dist; hitId = pid; }
          }
        }

        if (hitId !== null) {
          const target = players.get(hitId);
          target.hp = Math.max(0, target.hp - BULLET_DAMAGE);

          if (target.hp <= 0) {
            // Kill
            target.alive = false;
            target.deaths++;
            player.kills++;

            broadcastAll({ type: 'kill', killerId: id, victimId: hitId,
              killerName: player.name, victimName: target.name });

            // Auto-respawn after delay
            setTimeout(() => {
              const t = players.get(hitId);
              if (t) {
                t.hp = START_HP;
                t.alive = true;
                send(t.ws, { type: 'respawn', hp: START_HP });
                broadcastAll({ type: 'playerHp', id: hitId, hp: START_HP });
              }
            }, RESPAWN_DELAY);

          } else {
            // Damage
            broadcastAll({ type: 'dmg', targetId: hitId, shooterId: id,
              damage: BULLET_DAMAGE, hp: target.hp });
            send(target.ws, { type: 'hurt', damage: BULLET_DAMAGE, hp: target.hp });
          }

          // Confirm hit to shooter
          send(ws, { type: 'hitConfirm', targetId: hitId });
        }
        break;
      }

      case 'meta': {
        if (msg.name && typeof msg.name === 'string') {
          player.name = msg.name.slice(0, 20).replace(/[<>]/g, '');
        }
        if (msg.color && typeof msg.color === 'string') {
          player.color = msg.color.replace(/[^0-9a-fA-F#]/g, '').slice(0, 7);
        }
        broadcast(id, { type: 'meta', id, name: player.name, color: player.color });
        break;
      }

      case 'finish': {
        if (!player.alive) break;
        const timeSec = parseFloat(msg.time);
        if (isNaN(timeSec) || timeSec < MIN_FINISH_TIME) break;
        console.log(`[Finish] ${player.name}: ${timeSec.toFixed(3)}s`);
        recordFinish(player.name, timeSec);
        broadcastAll({ type: 'finish', id, name: player.name, time: timeSec });
        broadcastLeaderboard();
        break;
      }

      case 'chat': {
        if (msg.text && typeof msg.text === 'string') {
          const text = msg.text.slice(0, 120).replace(/[<>]/g, '');
          broadcastAll({ type: 'chat', id, name: player.name, text });
        }
        break;
      }

      case 'ping': {
        send(ws, { type: 'pong', t: msg.t });
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
