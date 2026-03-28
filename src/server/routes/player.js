/**
 * routes/player.js — Player profile endpoints
 * POST /api/auth/register   { name }         → { token, player }
 * GET  /api/player/profile                   → { player }
 * PUT  /api/player/profile  { name?, color?, skin?, knife?, weapon? } → { player }
 */
import { Router } from 'express';
import { registerOrLogin, requireAuth } from '../auth.js';
import { stmts } from '../db.js';

const router = Router();

router.post('/auth/register', (req, res) => {
  try {
    const { name } = req.body;
    if (!name || typeof name !== 'string') {
      return res.status(400).json({ error: 'name required' });
    }
    const result = registerOrLogin(name);
    res.json(result);
  } catch (e) {
    console.error('[register]', e.message);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/player/profile', requireAuth, (req, res) => {
  res.json({ player: req.player });
});

router.put('/player/profile', requireAuth, (req, res) => {
  try {
    const { name, color, skin, knife, weapon } = req.body;
    // Sanitize
    const cleanName   = name   ? String(name).trim().slice(0, 24).replace(/[<>"]/g, '') : null;
    const cleanColor  = color  ? String(color).match(/^#[0-9a-fA-F]{6}$/)?.[0] ?? null : null;
    const cleanSkin   = skin   ? String(skin).slice(0, 32)   : null;
    const cleanKnife  = knife  ? String(knife).slice(0, 32)  : null;
    const cleanWeapon = weapon ? String(weapon).slice(0, 32) : null;

    stmts.updatePlayer.run({ name: cleanName, color: cleanColor, skin: cleanSkin, knife: cleanKnife, weapon: cleanWeapon, id: req.player.id });
    const updated = stmts.getPlayer.get(req.player.id);
    res.json({ player: updated });
  } catch (e) {
    if (e.message?.includes('UNIQUE')) return res.status(409).json({ error: 'Name taken' });
    console.error('[profile PUT]', e.message);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
