/**
 * auth.js — Session token generation + Express middleware
 */
import { randomBytes } from 'crypto';
import { db, stmts, transaction } from './db.js';

/** Generate a new 64-char hex session token. */
export function generateToken() {
  return randomBytes(32).toString('hex');
}

/**
 * Register or login a player by name.
 * Returns { token, player }.
 */
export function registerOrLogin(name) {
  const cleanName = String(name).trim().slice(0, 24).replace(/[<>"]/g, '') || 'Player';

  return transaction(() => {
    let player = stmts.getPlayerByName.get(cleanName);
    if (!player) {
      player = stmts.createPlayer.get(cleanName);
      stmts.upsertSettings.run(player.id, 0.002, 90, 0.7, '{}');
    }
    const token = generateToken();
    stmts.createSession.run(token, player.id);
    return { token, player };
  });
}

/**
 * Express middleware — reads Authorization: Bearer <token> header,
 * attaches req.player = { id, name, color, ... } or returns 401.
 */
export function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token  = header.startsWith('Bearer ') ? header.slice(7).trim() : null;
  if (!token) return res.status(401).json({ error: 'No token' });

  const row = stmts.getSession.get(token);
  if (!row) return res.status(401).json({ error: 'Invalid token' });

  const player = stmts.getPlayer.get(row.player_id);
  if (!player) return res.status(401).json({ error: 'Player not found' });

  req.player = player;
  req.token  = token;
  next();
}
