/**
 * XP + Leveling API routes
 * GET  /api/xp          — get player XP, level, and history
 * POST /api/xp/add      — award XP (server-validates amounts)
 */
import express from 'express';
import { db, stmts } from '../db.js';
import { requireAuth } from '../auth.js';

const router = express.Router();

// ── XP per-level requirement: floor(100 * level^1.18) ─────────────────────────
function xpForNextLevel(level) {
  return Math.max(100, Math.floor(100 * Math.pow(Math.max(1, level), 1.18)));
}

// ── Max XP per source per session (anti-cheat clamps) ─────────────────────────
const SOURCE_CAPS = {
  map_finish:       200,
  kill:              25,
  time_bonus:        60,
  beat_pb:           30,
  race_placement:    60,
  daily_challenge:  120,
  weekly_challenge: 600,
  time_played:       60,   // per call
};

// ── GET /api/xp ───────────────────────────────────────────────────────────────
router.get('/xp', requireAuth, (req, res) => {
  const pid = req.playerId;
  let row = db.prepare('SELECT xp, level FROM player_xp WHERE player_id = ?').get(pid);
  if (!row) {
    db.prepare('INSERT OR IGNORE INTO player_xp (player_id, xp, level) VALUES (?, 0, 1)').run(pid);
    row = { xp: 0, level: 1 };
  }
  const xpNeeded = xpForNextLevel(row.level);
  res.json({ xp: row.xp, level: row.level, xpNeeded, xpForNextLevel: xpNeeded });
});

// ── POST /api/xp/add ──────────────────────────────────────────────────────────
router.post('/xp/add', requireAuth, (req, res) => {
  const pid    = req.playerId;
  const source = String(req.body.source || 'unknown');
  let   amount = Math.floor(Number(req.body.amount) || 0);

  // Validate + clamp
  if (amount <= 0) return res.status(400).json({ error: 'amount must be > 0' });
  const cap = SOURCE_CAPS[source] ?? 50;
  amount = Math.min(amount, cap);

  // Ensure row exists
  db.prepare('INSERT OR IGNORE INTO player_xp (player_id, xp, level) VALUES (?, 0, 1)').run(pid);
  const row    = db.prepare('SELECT xp, level FROM player_xp WHERE player_id = ?').get(pid);
  let newXp    = row.xp + amount;
  let newLevel = row.level;

  // Level-up loop
  const levelUps = [];
  while (true) {
    const needed = xpForNextLevel(newLevel);
    if (newXp >= needed) {
      newXp   -= needed;
      newLevel += 1;
      levelUps.push(newLevel);
    } else break;
  }

  db.prepare('UPDATE player_xp SET xp = ?, level = ? WHERE player_id = ?')
    .run(newXp, newLevel, pid);

  // Log in xp_history
  db.prepare('INSERT INTO xp_history (player_id, amount, source) VALUES (?, ?, ?)')
    .run(pid, amount, source);

  // Grant level-up unlocks
  const unlocks = [];
  for (const lvl of levelUps) {
    const reward = LEVEL_REWARDS[lvl];
    if (reward) {
      db.prepare('INSERT OR IGNORE INTO unlocks (player_id, item_type, item_id) VALUES (?, ?, ?)')
        .run(pid, reward.type, reward.id);
      unlocks.push({ level: lvl, ...reward });
    }
  }

  res.json({
    xp:          newXp,
    level:       newLevel,
    xpAdded:     amount,
    xpNeeded:    xpForNextLevel(newLevel),
    levelUps,
    unlocks,
  });
});

// ── Level reward table ─────────────────────────────────────────────────────────
// type: 'knife_type' for knife models, 'knife_skin' for cosmetic skins
const LEVEL_REWARDS = {
  5:   { type: 'knife_type', id: 'karambit',    name: 'Karambit',        rarity: 'uncommon' },
  10:  { type: 'knife_type', id: 'butterfly',   name: 'Butterfly Knife', rarity: 'rare'     },
  15:  { type: 'knife_skin', id: 'skin_neon',   name: 'Neon Skin Pack',  rarity: 'uncommon' },
  20:  { type: 'knife_type', id: 'bayonet',     name: 'M9 Bayonet',      rarity: 'rare'     },
  25:  { type: 'knife_type', id: 'tanto',       name: 'Tanto Knife',     rarity: 'rare'     },
  30:  { type: 'knife_type', id: 'dagger',      name: 'Dagger',          rarity: 'epic'     },
  40:  { type: 'knife_skin', id: 'skin_chrome', name: 'Chrome Finish',   rarity: 'epic'     },
  50:  { type: 'knife_skin', id: 'skin_gold',   name: 'Gold Finish',     rarity: 'legendary'},
  75:  { type: 'knife_skin', id: 'skin_prism',  name: 'Prismatic',       rarity: 'legendary'},
  100: { type: 'knife_skin', id: 'skin_void',   name: 'Void Crystal',    rarity: 'legendary'},
};

export default router;
