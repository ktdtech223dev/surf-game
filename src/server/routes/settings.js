/**
 * routes/settings.js — Player settings endpoints
 * GET  /api/settings                                        → { settings }
 * PUT  /api/settings { sensitivity?, fov?, volume?, keybinds? } → { settings }
 */
import { Router } from 'express';
import { requireAuth } from '../auth.js';
import { stmts } from '../db.js';

const router = Router();

const DEFAULTS = { sensitivity: 0.002, fov: 90, volume: 0.7, keybinds: {} };

function getOrCreate(playerId) {
  let row = stmts.getSettings.get(playerId);
  if (!row) {
    stmts.upsertSettings.run(playerId, DEFAULTS.sensitivity, DEFAULTS.fov, DEFAULTS.volume, '{}');
    row = stmts.getSettings.get(playerId);
  }
  return { ...row, keybinds: JSON.parse(row.keybinds || '{}') };
}

router.get('/settings', requireAuth, (req, res) => {
  res.json({ settings: getOrCreate(req.player.id) });
});

router.put('/settings', requireAuth, (req, res) => {
  try {
    const current = getOrCreate(req.player.id);

    const sensitivity = req.body.sensitivity != null
      ? Math.max(0.0001, Math.min(0.02, parseFloat(req.body.sensitivity))) : current.sensitivity;
    const fov = req.body.fov != null
      ? Math.max(60, Math.min(130, parseInt(req.body.fov, 10))) : current.fov;
    const volume = req.body.volume != null
      ? Math.max(0, Math.min(1, parseFloat(req.body.volume))) : current.volume;
    const keybinds = req.body.keybinds != null
      ? JSON.stringify(req.body.keybinds) : JSON.stringify(current.keybinds);

    stmts.upsertSettings.run(req.player.id, sensitivity, fov, volume, keybinds);
    const updated = getOrCreate(req.player.id);
    res.json({ settings: updated });
  } catch (e) {
    console.error('[settings PUT]', e.message);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
