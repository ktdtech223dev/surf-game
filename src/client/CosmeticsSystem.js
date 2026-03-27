/**
 * CosmeticsSystem — Skin catalog, rarity tiers, level-unlock schedule
 * Works alongside XPSystem and KnifeSystem.
 */

// ── Rarity ────────────────────────────────────────────────────────────────────
export const RARITY = {
  COMMON:    'common',
  UNCOMMON:  'uncommon',
  RARE:      'rare',
  EPIC:      'epic',
  LEGENDARY: 'legendary',
};

export const RARITY_COLOR = {
  [RARITY.COMMON]:    '#9ca3af',
  [RARITY.UNCOMMON]:  '#22c55e',
  [RARITY.RARE]:      '#3b82f6',
  [RARITY.EPIC]:      '#a855f7',
  [RARITY.LEGENDARY]: '#f59e0b',
};

export const RARITY_GLOW = {
  [RARITY.COMMON]:    'none',
  [RARITY.UNCOMMON]:  '0 0 6px #22c55e88',
  [RARITY.RARE]:      '0 0 8px #3b82f688',
  [RARITY.EPIC]:      '0 0 12px #a855f788',
  [RARITY.LEGENDARY]: '0 0 18px #f59e0b99',
};

// ── Knife Types (model shapes) ─────────────────────────────────────────────────
export const KNIFE_TYPES = [
  {
    id:       'classic',
    name:     'Classic',
    desc:     'Standard military combat knife. Reliable and iconic.',
    rarity:   RARITY.COMMON,
    unlockLevel: 1,
    unlockDesc: 'Default unlock',
  },
  {
    id:       'karambit',
    name:     'Karambit',
    desc:     'Curved blade inspired by a tiger claw. Deadly ring at the base.',
    rarity:   RARITY.UNCOMMON,
    unlockLevel: 5,
    unlockDesc: 'Reach Level 5',
  },
  {
    id:       'butterfly',
    name:     'Butterfly',
    desc:     'Balisong with a split handle. Mesmerizing flip animation.',
    rarity:   RARITY.RARE,
    unlockLevel: 10,
    unlockDesc: 'Reach Level 10',
  },
  {
    id:       'bayonet',
    name:     'M9 Bayonet',
    desc:     'Long-bladed military bayonet. Heavy and authoritative.',
    rarity:   RARITY.RARE,
    unlockLevel: 20,
    unlockDesc: 'Reach Level 20',
  },
  {
    id:       'tanto',
    name:     'Tanto',
    desc:     'Angular Japanese blade. Geometric precision, low-poly perfection.',
    rarity:   RARITY.RARE,
    unlockLevel: 25,
    unlockDesc: 'Reach Level 25',
  },
  {
    id:       'dagger',
    name:     'Dagger',
    desc:     'Symmetrical double-edged blade. Fast and balanced.',
    rarity:   RARITY.EPIC,
    unlockLevel: 30,
    unlockDesc: 'Reach Level 30',
  },
];

export const KNIFE_TYPE_BY_ID = Object.fromEntries(KNIFE_TYPES.map(t => [t.id, t]));

// ── Knife Skins (color/material variants) ─────────────────────────────────────
// These are applied on top of knife type models.
// blade = blade color hex, handle = handle color hex
export const KNIFE_SKINS = [
  // Default (always owned)
  { id: 'default',      name: 'Default',       rarity: RARITY.COMMON,    blade: 0x888888, handle: 0x1a1a1a, accent: 0x444444 },
  // Unlocked by map completion (map knife IDs map to these)
  { id: 'knife_shoreline',  name: 'Shoreline',  rarity: RARITY.COMMON,   blade: 0x1e90ff, handle: 0x0a2a4a, accent: 0x3399ff },
  { id: 'knife_coastal',    name: 'Coastal',    rarity: RARITY.COMMON,   blade: 0x22c55e, handle: 0x0a2a10, accent: 0x44ee88 },
  { id: 'knife_basin',      name: 'Basin',      rarity: RARITY.COMMON,   blade: 0xff4444, handle: 0x2a0a0a, accent: 0xff8888 },
  { id: 'knife_inlet',      name: 'Inlet',      rarity: RARITY.COMMON,   blade: 0xffaa00, handle: 0x2a1800, accent: 0xffcc44 },
  { id: 'knife_cove',       name: 'Cove',       rarity: RARITY.UNCOMMON, blade: 0xaa44ff, handle: 0x1a0a2a, accent: 0xcc88ff },
  { id: 'knife_bay',        name: 'Bay',        rarity: RARITY.UNCOMMON, blade: 0x00ffcc, handle: 0x002a1a, accent: 0x44ffee },
  { id: 'knife_delta',      name: 'Delta',      rarity: RARITY.UNCOMMON, blade: 0xdddd00, handle: 0x1a1a00, accent: 0xffff44 },
  { id: 'knife_lagoon',     name: 'Lagoon',     rarity: RARITY.UNCOMMON, blade: 0x00aaff, handle: 0x00152a, accent: 0x44ccff },
  { id: 'knife_gorge',      name: 'Gorge',      rarity: RARITY.UNCOMMON, blade: 0xff6600, handle: 0x2a0f00, accent: 0xff9933 },
  { id: 'knife_canyon',     name: 'Canyon',     rarity: RARITY.UNCOMMON, blade: 0xff8844, handle: 0x2a1200, accent: 0xffaa77 },
  { id: 'knife_ravine',     name: 'Ravine',     rarity: RARITY.RARE,     blade: 0x88ff44, handle: 0x0a1a00, accent: 0xaaffaa },
  { id: 'knife_chasm',      name: 'Chasm',      rarity: RARITY.RARE,     blade: 0x4488ff, handle: 0x000f2a, accent: 0x77aaff },
  { id: 'knife_abyss',      name: 'Abyss',      rarity: RARITY.RARE,     blade: 0xff0088, handle: 0x2a0015, accent: 0xff44cc },
  { id: 'knife_ridge',      name: 'Ridge',      rarity: RARITY.RARE,     blade: 0xaaaaff, handle: 0x10102a, accent: 0xccccff },
  { id: 'knife_summit',     name: 'Summit',     rarity: RARITY.RARE,     blade: 0xffffff, handle: 0x1a1a1a, accent: 0xdddddd },
  { id: 'knife_peak',       name: 'Peak',       rarity: RARITY.RARE,     blade: 0x00ffff, handle: 0x002a2a, accent: 0x44ffff },
  { id: 'knife_storm',      name: 'Storm',      rarity: RARITY.EPIC,     blade: 0xffff00, handle: 0x1a1a00, accent: 0xffffaa },
  { id: 'knife_tempest',    name: 'Tempest',    rarity: RARITY.EPIC,     blade: 0x0088ff, handle: 0x00102a, accent: 0x44aaff },
  { id: 'knife_gale',       name: 'Gale',       rarity: RARITY.EPIC,     blade: 0xff0055, handle: 0x2a000f, accent: 0xff4488 },
  { id: 'knife_squall',     name: 'Squall',     rarity: RARITY.EPIC,     blade: 0x00ff88, handle: 0x001a10, accent: 0x44ffaa },
  { id: 'knife_cyclone',    name: 'Cyclone',    rarity: RARITY.EPIC,     blade: 0x8800ff, handle: 0x0f002a, accent: 0xaa44ff },
  { id: 'knife_vortex',     name: 'Vortex',     rarity: RARITY.EPIC,     blade: 0xffaa22, handle: 0x1a0f00, accent: 0xffcc66 },
  { id: 'knife_maelstrom',  name: 'Maelstrom',  rarity: RARITY.EPIC,     blade: 0x4400ff, handle: 0x08002a, accent: 0x8844ff },
  { id: 'knife_typhoon',    name: 'Typhoon',    rarity: RARITY.EPIC,     blade: 0xff00ff, handle: 0x1a001a, accent: 0xff66ff },
  { id: 'knife_void',       name: 'Void',       rarity: RARITY.LEGENDARY, blade: 0xff2200, handle: 0x0a0000, accent: 0xff6644 },
  { id: 'knife_null',       name: 'Null',       rarity: RARITY.LEGENDARY, blade: 0x00ffaa, handle: 0x001a10, accent: 0x44ffcc },
  { id: 'knife_zenith',     name: 'Zenith',     rarity: RARITY.LEGENDARY, blade: 0xbbaaff, handle: 0x100a1a, accent: 0xddd4ff },
  { id: 'knife_apex',       name: 'Apex',       rarity: RARITY.LEGENDARY, blade: 0xff5500, handle: 0x1a0800, accent: 0xff8844 },
  { id: 'knife_omega',      name: 'Omega',      rarity: RARITY.LEGENDARY, blade: 0x00ff66, handle: 0x001a08, accent: 0x44ffaa },
  { id: 'knife_sigma',      name: 'Sigma',      rarity: RARITY.LEGENDARY, blade: 0xff44ff, handle: 0x1a001a, accent: 0xff88ff },
  { id: 'knife_prime',      name: 'Prime',      rarity: RARITY.LEGENDARY, blade: 0x00aaff, handle: 0x00102a, accent: 0x44ccff },
  { id: 'knife_absolute',   name: 'Absolute',   rarity: RARITY.LEGENDARY, blade: 0xffd700, handle: 0x1a1200, accent: 0xffe855 },
  // Level unlock skins
  { id: 'skin_neon',   name: 'Neon',   rarity: RARITY.UNCOMMON, blade: 0x00ffcc, handle: 0x0a0a0a, accent: 0x00ffff, emissive: true },
  { id: 'skin_chrome', name: 'Chrome', rarity: RARITY.EPIC,     blade: 0xcccccc, handle: 0x888888, accent: 0xffffff, metalness: 0.9 },
  { id: 'skin_gold',   name: 'Gold',   rarity: RARITY.LEGENDARY,blade: 0xffd700, handle: 0xcc9900, accent: 0xffe855, metalness: 0.95 },
  { id: 'skin_prism',  name: 'Prism',  rarity: RARITY.LEGENDARY,blade: 0xff00ff, handle: 0x0a0a0a, accent: 0x00ffff, rainbow: true },
  { id: 'skin_void',   name: 'Void Crystal', rarity: RARITY.LEGENDARY, blade: 0x110022, handle: 0x080010, accent: 0x8800ff, emissive: true },
  // Special challenge skins
  { id: 'knife_daily',  name: 'Daily',  rarity: RARITY.RARE,      blade: 0x00ccff, handle: 0x001a2a, accent: 0x44eeff },
  { id: 'knife_weekly', name: 'Weekly', rarity: RARITY.EPIC,      blade: 0xff8800, handle: 0x1a0800, accent: 0xffaa44 },
];

export const KNIFE_SKIN_BY_ID = Object.fromEntries(KNIFE_SKINS.map(s => [s.id, s]));

// ── Cosmetics utility ─────────────────────────────────────────────────────────

/** Get all knife types available at a given level */
export function knifesUnlockedAtLevel(level) {
  return KNIFE_TYPES.filter(t => t.unlockLevel <= level);
}

/** Get locked types above current level */
export function knifesLockedForLevel(level) {
  return KNIFE_TYPES.filter(t => t.unlockLevel > level);
}
