/**
 * SurfGame production server
 * - Serves built static assets from dist/
 * - WebSocket multiplayer: broadcasts player snapshots to all peers
 * - Railway-compatible: reads PORT from environment
 */

import express from 'express';
import { WebSocketServer } from 'ws';
import { createServer } from 'http';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3000;

const app = express();
const httpServer = createServer(app);
const wss = new WebSocketServer({ server: httpServer });

// ── Static files ──────────────────────────────────────────────────────────────
const distPath = join(__dirname, '../../dist');
app.use(express.static(distPath));
app.get('*', (_req, res) => res.sendFile(join(distPath, 'index.html')));

// ── Multiplayer state ─────────────────────────────────────────────────────────
const players = new Map(); // clientId -> { ws, lastSnap }
let nextId = 1;

function broadcastExcept(senderId, msg) {
  const data = JSON.stringify(msg);
  for (const [id, p] of players) {
    if (id !== senderId && p.ws.readyState === 1) {
      p.ws.send(data);
    }
  }
}

wss.on('connection', (ws) => {
  const id = nextId++;
  players.set(id, { ws, lastSnap: null });

  // Welcome: send own id + list of existing players
  const existing = [];
  for (const [pid, p] of players) {
    if (pid !== id && p.lastSnap) existing.push({ id: pid, ...p.lastSnap });
  }
  ws.send(JSON.stringify({ type: 'welcome', id, count: players.size, existing }));

  // Notify others of new join
  broadcastExcept(id, { type: 'join', id });

  console.log(`[+] Player ${id} connected  (${players.size} online)`);

  ws.on('message', (raw) => {
    try {
      const msg = JSON.parse(raw);
      if (msg.type === 'snap') {
        const snap = {
          x: msg.x, y: msg.y, z: msg.z,
          vx: msg.vx, vy: msg.vy, vz: msg.vz,
          yaw: msg.yaw, onRamp: msg.onRamp,
        };
        players.get(id).lastSnap = snap;
        broadcastExcept(id, { type: 'snap', id, ...snap });
      }
    } catch { /* malformed – ignore */ }
  });

  ws.on('close', () => {
    players.delete(id);
    broadcastExcept(id, { type: 'leave', id });
    console.log(`[-] Player ${id} left  (${players.size} online)`);
  });

  ws.on('error', () => {});
});

// ── Start ─────────────────────────────────────────────────────────────────────
httpServer.listen(PORT, () => {
  console.log(`[SurfGame] Server running on port ${PORT}`);
});
