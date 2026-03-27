/**
 * MapCatalog.js — All 32 fixed surf maps + procedural daily/weekly
 * Each map descriptor includes: id, name, difficulty, knifeId, paletteKey,
 * sections (array of ramp section descriptors), FINISH_Z, FINISH_Y, etc.
 *
 * Sections are built by MapBuilder.buildMap(mapId, scene).
 */

export const DIFFICULTY = { BEGINNER: 'beginner', INTERMEDIATE: 'intermediate', ADVANCED: 'advanced', EXPERT: 'expert' };

/** All 32 fixed maps */
export const MAP_CATALOG = [
  // ── Beginner (map01–08) ───────────────────────────────────────────────────
  {
    id: 'map_01', name: 'Shoreline',  difficulty: DIFFICULTY.BEGINNER,
    knifeId: 'knife_shoreline', paletteKey: 'shoreline',
    desc: 'A gentle coastal surf with wide ramps and forgiving transitions.',
    sections: [
      { w: 320, depth: 900, angle: 0.32, dropY: -290 },
      { w: 300, depth: 800, angle: 0.30, dropY: -240 },
    ],
    padLens: [300, 300, 350], spawnY: 0,
  },
  {
    id: 'map_02', name: 'Coastal',    difficulty: DIFFICULTY.BEGINNER,
    knifeId: 'knife_coastal', paletteKey: 'coastal',
    desc: 'Rolling green ramps along a calm shore.',
    sections: [
      { w: 300, depth: 850, angle: 0.30, dropY: -255 },
      { w: 280, depth: 900, angle: 0.28, dropY: -252 },
    ],
    padLens: [280, 280, 320], spawnY: 0,
  },
  {
    id: 'map_03', name: 'Basin',      difficulty: DIFFICULTY.BEGINNER,
    knifeId: 'knife_basin', paletteKey: 'basin',
    desc: 'A volcanic basin with red-hot ramps.',
    sections: [
      { w: 340, depth: 950, angle: 0.33, dropY: -313 },
      { w: 320, depth: 850, angle: 0.31, dropY: -263 },
    ],
    padLens: [300, 280, 340], spawnY: 0,
  },
  {
    id: 'map_04', name: 'Inlet',      difficulty: DIFFICULTY.BEGINNER,
    knifeId: 'knife_inlet', paletteKey: 'inlet',
    desc: 'Amber ramps through a narrow inlet.',
    sections: [
      { w: 290, depth: 800, angle: 0.30, dropY: -240 },
      { w: 270, depth: 850, angle: 0.28, dropY: -238 },
    ],
    padLens: [260, 260, 300], spawnY: 0,
  },
  {
    id: 'map_05', name: 'Cove',       difficulty: DIFFICULTY.BEGINNER,
    knifeId: 'knife_cove', paletteKey: 'cove',
    desc: 'Purple twilight in a hidden cove.',
    sections: [
      { w: 310, depth: 880, angle: 0.31, dropY: -272 },
      { w: 300, depth: 820, angle: 0.30, dropY: -246 },
    ],
    padLens: [280, 280, 320], spawnY: 0,
  },
  {
    id: 'map_06', name: 'Bay',        difficulty: DIFFICULTY.BEGINNER,
    knifeId: 'knife_bay', paletteKey: 'bay',
    desc: 'Teal waves in an open bay.',
    sections: [
      { w: 330, depth: 920, angle: 0.32, dropY: -294 },
      { w: 310, depth: 860, angle: 0.30, dropY: -258 },
    ],
    padLens: [300, 290, 330], spawnY: 0,
  },
  {
    id: 'map_07', name: 'Delta',      difficulty: DIFFICULTY.BEGINNER,
    knifeId: 'knife_delta', paletteKey: 'delta',
    desc: 'Yellow-green ramps at a river delta.',
    sections: [
      { w: 280, depth: 780, angle: 0.29, dropY: -226 },
      { w: 270, depth: 800, angle: 0.28, dropY: -224 },
    ],
    padLens: [260, 260, 300], spawnY: 0,
  },
  {
    id: 'map_08', name: 'Lagoon',     difficulty: DIFFICULTY.BEGINNER,
    knifeId: 'knife_lagoon', paletteKey: 'lagoon',
    desc: 'Crystal blue ramps in a tropical lagoon.',
    sections: [
      { w: 300, depth: 830, angle: 0.31, dropY: -256 },
      { w: 290, depth: 800, angle: 0.29, dropY: -232 },
    ],
    padLens: [280, 270, 310], spawnY: 0,
  },

  // ── Intermediate (map09–16) ───────────────────────────────────────────────
  {
    id: 'map_09', name: 'Gorge',      difficulty: DIFFICULTY.INTERMEDIATE,
    knifeId: 'knife_gorge', paletteKey: 'gorge',
    desc: 'Tight orange corridors through a deep gorge.',
    sections: [
      { w: 260, depth: 950, angle: 0.38, dropY: -358 },
      { w: 240, depth: 900, angle: 0.40, dropY: -360 },
      { w: 250, depth: 850, angle: 0.38, dropY: -323 },
    ],
    padLens: [220, 220, 220, 280], spawnY: 0,
  },
  {
    id: 'map_10', name: 'Canyon',     difficulty: DIFFICULTY.INTERMEDIATE,
    knifeId: 'knife_canyon', paletteKey: 'canyon',
    desc: 'Rocky orange walls flanking a deep canyon.',
    sections: [
      { w: 270, depth: 980, angle: 0.39, dropY: -380 },
      { w: 255, depth: 920, angle: 0.38, dropY: -350 },
      { w: 260, depth: 880, angle: 0.40, dropY: -352 },
    ],
    padLens: [230, 230, 220, 290], spawnY: 0,
  },
  {
    id: 'map_11', name: 'Ravine',     difficulty: DIFFICULTY.INTERMEDIATE,
    knifeId: 'knife_ravine', paletteKey: 'ravine',
    desc: 'Lime-green ramps through a narrow ravine.',
    sections: [
      { w: 250, depth: 960, angle: 0.40, dropY: -384 },
      { w: 240, depth: 910, angle: 0.41, dropY: -373 },
      { w: 245, depth: 870, angle: 0.39, dropY: -339 },
    ],
    padLens: [220, 210, 220, 280], spawnY: 0,
  },
  {
    id: 'map_12', name: 'Chasm',      difficulty: DIFFICULTY.INTERMEDIATE,
    knifeId: 'knife_chasm', paletteKey: 'chasm',
    desc: 'Blue ramps plunging into a bottomless chasm.',
    sections: [
      { w: 265, depth: 970, angle: 0.39, dropY: -377 },
      { w: 250, depth: 930, angle: 0.40, dropY: -372 },
      { w: 255, depth: 890, angle: 0.41, dropY: -365 },
    ],
    padLens: [225, 215, 225, 285], spawnY: 0,
  },
  {
    id: 'map_13', name: 'Abyss',      difficulty: DIFFICULTY.INTERMEDIATE,
    knifeId: 'knife_abyss', paletteKey: 'abyss',
    desc: 'Dark as night, pink edges in infinite black.',
    sections: [
      { w: 255, depth: 990, angle: 0.41, dropY: -406 },
      { w: 240, depth: 940, angle: 0.42, dropY: -395 },
      { w: 250, depth: 900, angle: 0.40, dropY: -360 },
    ],
    padLens: [220, 210, 215, 275], spawnY: 0,
  },
  {
    id: 'map_14', name: 'Ridge',      difficulty: DIFFICULTY.INTERMEDIATE,
    knifeId: 'knife_ridge', paletteKey: 'ridge',
    desc: 'Lavender ramps along a high mountain ridge.',
    sections: [
      { w: 260, depth: 960, angle: 0.38, dropY: -364 },
      { w: 245, depth: 920, angle: 0.39, dropY: -358 },
      { w: 250, depth: 880, angle: 0.38, dropY: -334 },
    ],
    padLens: [225, 215, 220, 280], spawnY: 0,
  },
  {
    id: 'map_15', name: 'Summit',     difficulty: DIFFICULTY.INTERMEDIATE,
    knifeId: 'knife_summit', paletteKey: 'summit',
    desc: 'White ramps in a blizzard at the mountain top.',
    sections: [
      { w: 250, depth: 940, angle: 0.40, dropY: -376 },
      { w: 240, depth: 900, angle: 0.41, dropY: -369 },
      { w: 245, depth: 860, angle: 0.40, dropY: -344 },
    ],
    padLens: [220, 210, 215, 275], spawnY: 0,
  },
  {
    id: 'map_16', name: 'Peak',       difficulty: DIFFICULTY.INTERMEDIATE,
    knifeId: 'knife_peak', paletteKey: 'peak',
    desc: 'Cyan ramps at the icy summit.',
    sections: [
      { w: 255, depth: 950, angle: 0.39, dropY: -371 },
      { w: 245, depth: 910, angle: 0.40, dropY: -364 },
      { w: 250, depth: 870, angle: 0.39, dropY: -339 },
    ],
    padLens: [222, 212, 218, 278], spawnY: 0,
  },

  // ── Advanced (map17–24) ────────────────────────────────────────────────────
  {
    id: 'map_17', name: 'Storm',      difficulty: DIFFICULTY.ADVANCED,
    knifeId: 'knife_storm', paletteKey: 'storm',
    desc: 'Yellow lightning ramps through a violent storm.',
    sections: [
      { w: 220, depth: 1050, angle: 0.46, dropY: -482 },
      { w: 210, depth: 980,  angle: 0.47, dropY: -460 },
      { w: 215, depth: 950,  angle: 0.46, dropY: -437 },
      { w: 205, depth: 900,  angle: 0.48, dropY: -433 },
    ],
    padLens: [190, 190, 190, 190, 250], spawnY: 0,
  },
  {
    id: 'map_18', name: 'Tempest',    difficulty: DIFFICULTY.ADVANCED,
    knifeId: 'knife_tempest', paletteKey: 'tempest',
    desc: 'Blue ramps in a raging ocean tempest.',
    sections: [
      { w: 215, depth: 1060, angle: 0.46, dropY: -487 },
      { w: 205, depth: 990,  angle: 0.47, dropY: -465 },
      { w: 210, depth: 960,  angle: 0.47, dropY: -451 },
      { w: 200, depth: 910,  angle: 0.48, dropY: -437 },
    ],
    padLens: [188, 188, 188, 188, 248], spawnY: 0,
  },
  {
    id: 'map_19', name: 'Gale',       difficulty: DIFFICULTY.ADVANCED,
    knifeId: 'knife_gale', paletteKey: 'gale',
    desc: 'Red-pink ramps in a scorching desert gale.',
    sections: [
      { w: 218, depth: 1070, angle: 0.47, dropY: -501 },
      { w: 208, depth: 1000, angle: 0.48, dropY: -480 },
      { w: 213, depth: 970,  angle: 0.47, dropY: -455 },
      { w: 203, depth: 920,  angle: 0.49, dropY: -451 },
    ],
    padLens: [186, 186, 186, 186, 246], spawnY: 0,
  },
  {
    id: 'map_20', name: 'Squall',     difficulty: DIFFICULTY.ADVANCED,
    knifeId: 'knife_squall', paletteKey: 'squall',
    desc: 'Green ramps in a tropical squall.',
    sections: [
      { w: 210, depth: 1040, angle: 0.45, dropY: -464 },
      { w: 200, depth: 975,  angle: 0.46, dropY: -446 },
      { w: 205, depth: 945,  angle: 0.46, dropY: -435 },
      { w: 195, depth: 895,  angle: 0.47, dropY: -423 },
    ],
    padLens: [184, 184, 184, 184, 244], spawnY: 0,
  },
  {
    id: 'map_21', name: 'Cyclone',    difficulty: DIFFICULTY.ADVANCED,
    knifeId: 'knife_cyclone', paletteKey: 'cyclone',
    desc: 'Purple vortex ramps in a spinning cyclone.',
    sections: [
      { w: 212, depth: 1080, angle: 0.47, dropY: -507 },
      { w: 202, depth: 1010, angle: 0.48, dropY: -485 },
      { w: 207, depth: 980,  angle: 0.47, dropY: -460 },
      { w: 197, depth: 930,  angle: 0.49, dropY: -456 },
    ],
    padLens: [182, 182, 182, 182, 242], spawnY: 0,
  },
  {
    id: 'map_22', name: 'Vortex',     difficulty: DIFFICULTY.ADVANCED,
    knifeId: 'knife_vortex', paletteKey: 'vortex',
    desc: 'Orange spiral ramps through a vortex.',
    sections: [
      { w: 208, depth: 1055, angle: 0.46, dropY: -484 },
      { w: 198, depth: 985,  angle: 0.47, dropY: -462 },
      { w: 203, depth: 955,  angle: 0.47, dropY: -448 },
      { w: 193, depth: 905,  angle: 0.48, dropY: -434 },
    ],
    padLens: [180, 180, 180, 180, 240], spawnY: 0,
  },
  {
    id: 'map_23', name: 'Maelstrom',  difficulty: DIFFICULTY.ADVANCED,
    knifeId: 'knife_maelstrom', paletteKey: 'maelstrom',
    desc: 'Deep blue ramps inside a crushing maelstrom.',
    sections: [
      { w: 205, depth: 1090, angle: 0.48, dropY: -523 },
      { w: 195, depth: 1020, angle: 0.49, dropY: -500 },
      { w: 200, depth: 990,  angle: 0.48, dropY: -474 },
      { w: 190, depth: 940,  angle: 0.50, dropY: -470 },
    ],
    padLens: [178, 178, 178, 178, 238], spawnY: 0,
  },
  {
    id: 'map_24', name: 'Typhoon',    difficulty: DIFFICULTY.ADVANCED,
    knifeId: 'knife_typhoon', paletteKey: 'typhoon',
    desc: 'Pink-magenta ramps in a blinding typhoon.',
    sections: [
      { w: 202, depth: 1065, angle: 0.47, dropY: -498 },
      { w: 192, depth: 995,  angle: 0.48, dropY: -476 },
      { w: 197, depth: 965,  angle: 0.47, dropY: -453 },
      { w: 187, depth: 915,  angle: 0.49, dropY: -448 },
    ],
    padLens: [176, 176, 176, 176, 236], spawnY: 0,
  },

  // ── Expert (map25–32) ─────────────────────────────────────────────────────
  {
    id: 'map_25', name: 'Void',       difficulty: DIFFICULTY.EXPERT,
    knifeId: 'knife_void', paletteKey: 'void',
    desc: 'Red ramps suspended in absolute void.',
    sections: [
      { w: 175, depth: 1200, angle: 0.54, dropY: -648 },
      { w: 165, depth: 1120, angle: 0.55, dropY: -616 },
      { w: 170, depth: 1080, angle: 0.54, dropY: -583 },
      { w: 160, depth: 1030, angle: 0.56, dropY: -577 },
    ],
    padLens: [160, 160, 160, 160, 220], spawnY: 0,
  },
  {
    id: 'map_26', name: 'Null',       difficulty: DIFFICULTY.EXPERT,
    knifeId: 'knife_null', paletteKey: 'null',
    desc: 'Teal edges barely visible in the darkness.',
    sections: [
      { w: 170, depth: 1220, angle: 0.55, dropY: -669 },
      { w: 160, depth: 1140, angle: 0.56, dropY: -638 },
      { w: 165, depth: 1100, angle: 0.55, dropY: -605 },
      { w: 155, depth: 1050, angle: 0.57, dropY: -599 },
    ],
    padLens: [158, 158, 158, 158, 218], spawnY: 0,
  },
  {
    id: 'map_27', name: 'Zenith',     difficulty: DIFFICULTY.EXPERT,
    knifeId: 'knife_zenith', paletteKey: 'zenith',
    desc: 'Lavender at the highest point of existence.',
    sections: [
      { w: 168, depth: 1230, angle: 0.55, dropY: -675 },
      { w: 158, depth: 1150, angle: 0.56, dropY: -644 },
      { w: 163, depth: 1110, angle: 0.55, dropY: -611 },
      { w: 153, depth: 1060, angle: 0.57, dropY: -605 },
    ],
    padLens: [156, 156, 156, 156, 216], spawnY: 0,
  },
  {
    id: 'map_28', name: 'Apex',       difficulty: DIFFICULTY.EXPERT,
    knifeId: 'knife_apex', paletteKey: 'apex',
    desc: 'Orange-red ramps at the apex of difficulty.',
    sections: [
      { w: 165, depth: 1240, angle: 0.56, dropY: -694 },
      { w: 155, depth: 1160, angle: 0.57, dropY: -661 },
      { w: 160, depth: 1120, angle: 0.56, dropY: -627 },
      { w: 150, depth: 1070, angle: 0.58, dropY: -622 },
    ],
    padLens: [154, 154, 154, 154, 214], spawnY: 0,
  },
  {
    id: 'map_29', name: 'Omega',      difficulty: DIFFICULTY.EXPERT,
    knifeId: 'knife_omega', paletteKey: 'omega',
    desc: 'Green ramps in the final stage.',
    sections: [
      { w: 162, depth: 1250, angle: 0.56, dropY: -700 },
      { w: 152, depth: 1170, angle: 0.57, dropY: -667 },
      { w: 157, depth: 1130, angle: 0.56, dropY: -633 },
      { w: 147, depth: 1080, angle: 0.58, dropY: -627 },
    ],
    padLens: [152, 152, 152, 152, 212], spawnY: 0,
  },
  {
    id: 'map_30', name: 'Sigma',      difficulty: DIFFICULTY.EXPERT,
    knifeId: 'knife_sigma', paletteKey: 'sigma',
    desc: 'Magenta ramps for those who have transcended.',
    sections: [
      { w: 158, depth: 1260, angle: 0.57, dropY: -718 },
      { w: 148, depth: 1180, angle: 0.58, dropY: -684 },
      { w: 153, depth: 1140, angle: 0.57, dropY: -650 },
      { w: 143, depth: 1090, angle: 0.59, dropY: -644 },
    ],
    padLens: [150, 150, 150, 150, 210], spawnY: 0,
  },
  {
    id: 'map_31', name: 'Prime',      difficulty: DIFFICULTY.EXPERT,
    knifeId: 'knife_prime', paletteKey: 'prime',
    desc: 'Blue ramps at the edge of the prime dimension.',
    sections: [
      { w: 155, depth: 1270, angle: 0.57, dropY: -724 },
      { w: 145, depth: 1190, angle: 0.58, dropY: -690 },
      { w: 150, depth: 1150, angle: 0.57, dropY: -656 },
      { w: 140, depth: 1100, angle: 0.59, dropY: -650 },
    ],
    padLens: [148, 148, 148, 148, 208], spawnY: 0,
  },
  {
    id: 'map_32', name: 'Absolute',   difficulty: DIFFICULTY.EXPERT,
    knifeId: 'knife_absolute', paletteKey: 'absolute',
    desc: 'Gold ramps. The hardest map ever conceived.',
    sections: [
      { w: 150, depth: 1300, angle: 0.58, dropY: -754 },
      { w: 140, depth: 1220, angle: 0.59, dropY: -719 },
      { w: 145, depth: 1180, angle: 0.58, dropY: -684 },
      { w: 135, depth: 1130, angle: 0.60, dropY: -678 },
    ],
    padLens: [145, 145, 145, 145, 205], spawnY: 0,
  },
];

/** Fast lookup by ID */
export const MAP_BY_ID = Object.fromEntries(MAP_CATALOG.map(m => [m.id, m]));

/** Maps grouped by difficulty */
export const MAPS_BY_DIFF = {
  [DIFFICULTY.BEGINNER]:     MAP_CATALOG.slice(0, 8),
  [DIFFICULTY.INTERMEDIATE]: MAP_CATALOG.slice(8, 16),
  [DIFFICULTY.ADVANCED]:     MAP_CATALOG.slice(16, 24),
  [DIFFICULTY.EXPERT]:       MAP_CATALOG.slice(24, 32),
};

/** Knife unlock ID for a given map */
export function knifeForMap(mapId) {
  return MAP_BY_ID[mapId]?.knifeId ?? null;
}

/** Achievement key for completing all maps of a difficulty */
export function diffAchievement(diff) {
  return { beginner: 'beginner_all', intermediate: 'inter_all', advanced: 'advanced_all', expert: 'expert_all' }[diff] ?? null;
}
