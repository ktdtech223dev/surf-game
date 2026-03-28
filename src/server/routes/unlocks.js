/**
 * routes/unlocks.js — Cosmetic unlock endpoints
 * GET  /api/unlocks                       → { unlocks: [{ item_type, item_id }] }
 * POST /api/unlocks  { item_type, item_id } → { granted: bool }
 *
 * item_type: 'knife' | 'skin' | 'weapon_skin'
 * Grants are server-authoritative — client requests, server validates.
 */
import { Router } from 'express';
import { requireAuth } from '../auth.js';
import { stmts } from '../db.js';

const router = Router();

// Known unlock IDs by type
const VALID_UNLOCKS = {
  knife: new Set([
    'knife_default',
    // Beginner map completion knives (map01–08)
    'knife_shoreline','knife_coastal','knife_basin','knife_inlet',
    'knife_cove','knife_bay','knife_delta','knife_lagoon',
    // Intermediate (map09–16)
    'knife_gorge','knife_canyon','knife_ravine','knife_chasm',
    'knife_abyss','knife_ridge','knife_summit','knife_peak',
    // Advanced (map17–24)
    'knife_storm','knife_tempest','knife_gale','knife_squall',
    'knife_cyclone','knife_vortex','knife_maelstrom','knife_typhoon',
    // Expert (map25–32)
    'knife_void','knife_null','knife_zenith','knife_apex',
    'knife_omega','knife_sigma','knife_prime','knife_absolute',
    // Daily/weekly map knives
    'knife_daily','knife_weekly',
  ]),
  skin: new Set([
    'skin_default','skin_chrome','skin_carbon','skin_neon',
    'skin_camo','skin_gold','skin_shadow','skin_prism',
    'skin_tiger','skin_arctic','skin_crimson','skin_void',
  ]),
  weapon_skin: new Set([
    // rifle skins
    'rifle_default','rifle_chrome','rifle_camo','rifle_gold',
    // pistol skins
    'pistol_default','pistol_chrome','pistol_camo','pistol_gold',
    // shotgun skins
    'shotgun_default','shotgun_chrome','shotgun_camo','shotgun_gold',
    // sniper skins
    'sniper_default','sniper_chrome','sniper_camo','sniper_gold',
    // smg skins
    'smg_default','smg_chrome','smg_camo','smg_gold',
  ]),
};

router.get('/unlocks', requireAuth, (req, res) => {
  const rows = stmts.getUnlocks.all(req.player.id);
  res.json({ unlocks: rows });
});

router.post('/unlocks', requireAuth, (req, res) => {
  try {
    const { item_type, item_id } = req.body;
    if (!item_type || !item_id) return res.status(400).json({ error: 'item_type and item_id required' });

    const validSet = VALID_UNLOCKS[item_type];
    if (!validSet)        return res.status(400).json({ error: 'Unknown item_type' });
    if (!validSet.has(item_id)) return res.status(400).json({ error: 'Unknown item_id' });

    const result = stmts.insertUnlock.run(req.player.id, item_type, item_id);
    res.json({ granted: result.changes > 0 });
  } catch (e) {
    console.error('[unlocks POST]', e.message);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
