/**
 * MapCatalog.js — All 32 fixed surf maps + procedural daily/weekly
 *
 * Designed with CS:GO surf map philosophy:
 *   • Proper 38–58° ramp angles (0.66–1.01 rad) for authentic surf feel
 *   • Long sections (1200–3600 units) with genuine speed-building drops
 *   • Curved connectors between sections for flow and direction changes
 *   • Each map has a unique identity, personality and visual theme
 *   • Difficulty is reflected in width, angle, section count and curve tightness
 *
 * Famous CS:GO surf map inspirations:
 *   surf_beginner / surf_rookie   → maps 01-04 (forgiving, wide, straight)
 *   surf_kitsune                  → maps 09-10 (flowing S-curves, alternating)
 *   surf_mesa / surf_mesa_rework  → maps 17-18 (canyon, long sections, tight curves)
 *   surf_aircontrol               → maps 11-12 (speed-focused, lots of curves)
 *   surf_ski_2                    → maps 05-06 (speed ramps, open feel)
 *   surf_rebel / surf_utopia      → maps 25-32 (expert, unforgiving)
 */

export const DIFFICULTY = {
  BEGINNER:     'beginner',
  INTERMEDIATE: 'intermediate',
  ADVANCED:     'advanced',
  EXPERT:       'expert',
};

// ── Angle helper: dropY = -depth * sin(angle) ─────────────────────────────
// e.g. angle 0.70 (40°), depth 1800 → dropY ≈ -1154
// e.g. angle 0.79 (45°), depth 2000 → dropY ≈ -1414

/** All 32 fixed maps */
export const MAP_CATALOG = [

  // ═══════════════════════════════════════════════════════════════════════════
  // BEGINNER (map01–08) — Inspired by surf_beginner, surf_rookie, surf_ski_2
  // Wide ramps (280-340), gentle angles (38-44°), 4-5 sections
  // Goal: Learn basic surf movement, build confidence
  // ═══════════════════════════════════════════════════════════════════════════

  {
    id: 'map_01', name: 'Shoreline', difficulty: DIFFICULTY.BEGINNER,
    knifeId: 'knife_shoreline', paletteKey: 'shoreline',
    desc: 'A gentle coastal surf — wide ramps and forgiving S-turns above the ocean.',
    // 4 sections, alternating gentle S-curve. Like surf_beginner stage 1.
    sections: [
      { w: 340, depth: 1600, angle: 0.68, dropY: -1036 },  // 39°, wide opener
      { w: 320, depth: 1800, angle: 0.70, dropY: -1154 },  // 40°, slight speed-up
      { w: 300, depth: 1700, angle: 0.72, dropY: -1130 },  // 41°, narrows a bit
      { w: 280, depth: 1600, angle: 0.74, dropY: -1070 },  // 43°, final sprint
    ],
    padLens: [400, 320, 300, 320, 500], spawnY: 0,
    curvedSections: [
      { afterPad: 0, radius: 500, angle:  0.55, width: 300, height: 22 },
      { afterPad: 1, radius: 480, angle: -0.52, width: 280, height: 22 },
      { afterPad: 2, radius: 460, angle:  0.48, width: 260, height: 22 },
    ],
  },

  {
    id: 'map_02', name: 'Coastal', difficulty: DIFFICULTY.BEGINNER,
    knifeId: 'knife_coastal', paletteKey: 'coastal',
    desc: 'Rolling green ramps descending toward a calm shoreline.',
    sections: [
      { w: 330, depth: 1550, angle: 0.67, dropY:  -976 },
      { w: 315, depth: 1750, angle: 0.69, dropY: -1124 },
      { w: 300, depth: 1650, angle: 0.71, dropY: -1101 },
      { w: 285, depth: 1500, angle: 0.73, dropY: -1014 },
    ],
    padLens: [380, 310, 290, 300, 480], spawnY: 0,
    curvedSections: [
      { afterPad: 0, radius: 480, angle: -0.50, width: 290, height: 22 },
      { afterPad: 2, radius: 460, angle:  0.48, width: 270, height: 22 },
    ],
  },

  {
    id: 'map_03', name: 'Basin', difficulty: DIFFICULTY.BEGINNER,
    knifeId: 'knife_basin', paletteKey: 'basin',
    desc: 'Volcanic basin — red-hot ramps with a long straight drop into the caldera.',
    sections: [
      { w: 360, depth: 1700, angle: 0.69, dropY: -1108 },  // Very wide opener
      { w: 340, depth: 2000, angle: 0.71, dropY: -1341 },  // Long speed section
      { w: 315, depth: 1800, angle: 0.72, dropY: -1196 },
      { w: 295, depth: 1600, angle: 0.74, dropY: -1070 },
    ],
    padLens: [420, 330, 310, 320, 500], spawnY: 0,
    curvedSections: [
      { afterPad: 0, radius: 520, angle:  0.60, width: 320, height: 22 },
      { afterPad: 2, radius: 490, angle: -0.55, width: 280, height: 22 },
    ],
  },

  {
    id: 'map_04', name: 'Inlet', difficulty: DIFFICULTY.BEGINNER,
    knifeId: 'knife_inlet', paletteKey: 'inlet',
    desc: 'Amber canyon walls funnel through a narrow inlet — relaxed pace.',
    sections: [
      { w: 320, depth: 1500, angle: 0.68, dropY:  -966 },
      { w: 305, depth: 1700, angle: 0.70, dropY: -1099 },
      { w: 290, depth: 1650, angle: 0.71, dropY: -1097 },
      { w: 270, depth: 1550, angle: 0.73, dropY: -1047 },
    ],
    padLens: [360, 300, 280, 300, 460], spawnY: 0,
    curvedSections: [
      { afterPad: 1, radius: 460, angle:  0.52, width: 270, height: 22 },
      { afterPad: 2, radius: 440, angle: -0.50, width: 255, height: 22 },
    ],
  },

  {
    id: 'map_05', name: 'Cove', difficulty: DIFFICULTY.BEGINNER,
    knifeId: 'knife_cove', paletteKey: 'cove',
    desc: 'Purple twilight in a hidden cove — pure speed runs with minimal turns.',
    // Inspired by surf_ski_2 — long straight sections, speed focus
    sections: [
      { w: 320, depth: 2000, angle: 0.70, dropY: -1285 },  // Long speed ramp
      { w: 305, depth: 2200, angle: 0.71, dropY: -1466 },  // Even longer
      { w: 285, depth: 2000, angle: 0.72, dropY: -1328 },
      { w: 265, depth: 1800, angle: 0.74, dropY: -1205 },
    ],
    padLens: [400, 280, 260, 280, 480], spawnY: 0,
    curvedSections: [
      { afterPad: 0, radius: 550, angle:  0.45, width: 285, height: 22 },
      { afterPad: 1, radius: 530, angle: -0.42, width: 265, height: 22 },
    ],
  },

  {
    id: 'map_06', name: 'Bay', difficulty: DIFFICULTY.BEGINNER,
    knifeId: 'knife_bay', paletteKey: 'bay',
    desc: 'Teal waves in an open bay — beginner-friendly with multiple recovery pads.',
    sections: [
      { w: 350, depth: 1600, angle: 0.68, dropY: -1033 },
      { w: 330, depth: 1900, angle: 0.70, dropY: -1220 },
      { w: 310, depth: 1750, angle: 0.71, dropY: -1166 },
      { w: 290, depth: 1550, angle: 0.73, dropY: -1047 },
    ],
    padLens: [400, 340, 320, 330, 500], spawnY: 0,
    curvedSections: [
      { afterPad: 0, radius: 500, angle: -0.55, width: 300, height: 22 },
      { afterPad: 2, radius: 470, angle:  0.52, width: 270, height: 22 },
    ],
  },

  {
    id: 'map_07', name: 'Delta', difficulty: DIFFICULTY.BEGINNER,
    knifeId: 'knife_delta', paletteKey: 'delta',
    desc: 'Yellow-green river delta — five sections with a surprise steeper final ramp.',
    sections: [
      { w: 330, depth: 1500, angle: 0.68, dropY:  -966 },
      { w: 315, depth: 1700, angle: 0.70, dropY: -1099 },
      { w: 300, depth: 1800, angle: 0.70, dropY: -1157 },
      { w: 280, depth: 1700, angle: 0.72, dropY: -1130 },
      { w: 260, depth: 1600, angle: 0.76, dropY: -1094 },  // steeper finale
    ],
    padLens: [360, 290, 280, 270, 280, 460], spawnY: 0,
    curvedSections: [
      { afterPad: 0, radius: 470, angle:  0.50, width: 290, height: 22 },
      { afterPad: 2, radius: 450, angle: -0.48, width: 265, height: 22 },
      { afterPad: 3, radius: 430, angle:  0.52, width: 248, height: 22 },
    ],
  },

  {
    id: 'map_08', name: 'Lagoon', difficulty: DIFFICULTY.BEGINNER,
    knifeId: 'knife_lagoon', paletteKey: 'lagoon',
    desc: 'Crystal blue ramps in a tropical lagoon — smooth as glass.',
    sections: [
      { w: 340, depth: 1650, angle: 0.68, dropY: -1066 },
      { w: 320, depth: 1850, angle: 0.70, dropY: -1189 },
      { w: 300, depth: 1700, angle: 0.71, dropY: -1132 },
      { w: 280, depth: 1550, angle: 0.73, dropY: -1047 },
    ],
    padLens: [380, 310, 295, 305, 480], spawnY: 0,
    curvedSections: [
      { afterPad: 0, radius: 490, angle: -0.52, width: 295, height: 22 },
      { afterPad: 1, radius: 470, angle:  0.50, width: 275, height: 22 },
      { afterPad: 2, radius: 450, angle: -0.48, width: 258, height: 22 },
    ],
  },


  // ═══════════════════════════════════════════════════════════════════════════
  // INTERMEDIATE (map09–16) — Inspired by surf_kitsune, surf_aircontrol, surf_mesa
  // Medium width (200-270), steeper angles (43-49°), 5-7 sections
  // Goal: Learn strafing, air control, maintain speed through S-curves
  // ═══════════════════════════════════════════════════════════════════════════

  {
    id: 'map_09', name: 'Gorge', difficulty: DIFFICULTY.INTERMEDIATE,
    knifeId: 'knife_gorge', paletteKey: 'gorge',
    desc: 'Orange gorge — kitsune-style alternating S-curves demand precise air control.',
    // Inspired by surf_kitsune: smooth alternating turns, flowing momentum
    sections: [
      { w: 270, depth: 1800, angle: 0.75, dropY: -1201 },
      { w: 255, depth: 2000, angle: 0.77, dropY: -1390 },
      { w: 245, depth: 2100, angle: 0.78, dropY: -1488 },
      { w: 235, depth: 2000, angle: 0.79, dropY: -1429 },
      { w: 220, depth: 1900, angle: 0.80, dropY: -1359 },
      { w: 205, depth: 1800, angle: 0.82, dropY: -1313 },
    ],
    padLens: [280, 240, 230, 230, 230, 235, 380], spawnY: 0,
    curvedSections: [
      { afterPad: 0, radius: 380, angle:  0.75, width: 240, height: 20 },
      { afterPad: 1, radius: 360, angle: -0.72, width: 225, height: 20 },
      { afterPad: 2, radius: 345, angle:  0.70, width: 212, height: 20 },
      { afterPad: 3, radius: 330, angle: -0.68, width: 200, height: 20 },
      { afterPad: 4, radius: 315, angle:  0.72, width: 188, height: 20 },
    ],
  },

  {
    id: 'map_10', name: 'Canyon', difficulty: DIFFICULTY.INTERMEDIATE,
    knifeId: 'knife_canyon', paletteKey: 'canyon',
    desc: 'Rocky canyon walls with long sweeping ramps — pure speed build.',
    // Inspired by surf_mesa: long sections, canyon aesthetics
    sections: [
      { w: 265, depth: 2000, angle: 0.75, dropY: -1334 },
      { w: 250, depth: 2200, angle: 0.77, dropY: -1529 },
      { w: 240, depth: 2300, angle: 0.78, dropY: -1630 },
      { w: 228, depth: 2100, angle: 0.79, dropY: -1500 },
      { w: 215, depth: 2000, angle: 0.81, dropY: -1443 },
      { w: 200, depth: 1900, angle: 0.83, dropY: -1393 },
    ],
    padLens: [270, 235, 225, 225, 225, 230, 370], spawnY: 0,
    curvedSections: [
      { afterPad: 0, radius: 370, angle: -0.72, width: 232, height: 20 },
      { afterPad: 2, radius: 350, angle:  0.70, width: 210, height: 20 },
      { afterPad: 4, radius: 330, angle: -0.68, width: 190, height: 20 },
    ],
  },

  {
    id: 'map_11', name: 'Ravine', difficulty: DIFFICULTY.INTERMEDIATE,
    knifeId: 'knife_ravine', paletteKey: 'ravine',
    desc: 'Lime-green ravine — aircontrol-inspired speed map with wide open ramps.',
    // Inspired by surf_aircontrol: speed-focused, moderate turns
    sections: [
      { w: 260, depth: 1900, angle: 0.76, dropY: -1279 },
      { w: 248, depth: 2100, angle: 0.77, dropY: -1460 },
      { w: 238, depth: 2200, angle: 0.78, dropY: -1559 },
      { w: 226, depth: 2100, angle: 0.79, dropY: -1500 },
      { w: 213, depth: 2000, angle: 0.81, dropY: -1443 },
      { w: 200, depth: 1900, angle: 0.82, dropY: -1386 },
    ],
    padLens: [265, 230, 220, 220, 220, 225, 365], spawnY: 0,
    curvedSections: [
      { afterPad: 0, radius: 365, angle:  0.70, width: 228, height: 20 },
      { afterPad: 1, radius: 348, angle: -0.68, width: 215, height: 20 },
      { afterPad: 3, radius: 332, angle:  0.65, width: 198, height: 20 },
      { afterPad: 4, radius: 316, angle: -0.65, width: 185, height: 20 },
    ],
  },

  {
    id: 'map_12', name: 'Chasm', difficulty: DIFFICULTY.INTERMEDIATE,
    knifeId: 'knife_chasm', paletteKey: 'chasm',
    desc: 'Deep blue chasm — seven sections with increasing steepness.',
    sections: [
      { w: 268, depth: 1850, angle: 0.75, dropY: -1232 },
      { w: 254, depth: 2000, angle: 0.76, dropY: -1345 },
      { w: 243, depth: 2150, angle: 0.77, dropY: -1492 },
      { w: 232, depth: 2100, angle: 0.79, dropY: -1500 },
      { w: 218, depth: 2000, angle: 0.80, dropY: -1430 },
      { w: 204, depth: 1900, angle: 0.82, dropY: -1386 },
      { w: 192, depth: 1800, angle: 0.84, dropY: -1335 },
    ],
    padLens: [260, 230, 220, 215, 215, 220, 220, 360], spawnY: 0,
    curvedSections: [
      { afterPad: 0, radius: 360, angle: -0.70, width: 235, height: 20 },
      { afterPad: 2, radius: 340, angle:  0.68, width: 212, height: 20 },
      { afterPad: 4, radius: 322, angle: -0.65, width: 192, height: 20 },
    ],
  },

  {
    id: 'map_13', name: 'Abyss', difficulty: DIFFICULTY.INTERMEDIATE,
    knifeId: 'knife_abyss', paletteKey: 'abyss',
    desc: 'Absolute darkness with neon-pink edges — disorienting and fast.',
    sections: [
      { w: 258, depth: 1900, angle: 0.76, dropY: -1279 },
      { w: 244, depth: 2050, angle: 0.77, dropY: -1424 },
      { w: 234, depth: 2200, angle: 0.79, dropY: -1571 },
      { w: 222, depth: 2100, angle: 0.80, dropY: -1500 },
      { w: 208, depth: 2000, angle: 0.82, dropY: -1459 },
      { w: 196, depth: 1900, angle: 0.84, dropY: -1410 },
    ],
    padLens: [255, 228, 218, 215, 215, 220, 355], spawnY: 0,
    curvedSections: [
      { afterPad: 0, radius: 355, angle:  0.78, width: 224, height: 20 },
      { afterPad: 1, radius: 338, angle: -0.75, width: 210, height: 20 },
      { afterPad: 2, radius: 322, angle:  0.72, width: 196, height: 20 },
      { afterPad: 4, radius: 308, angle: -0.70, width: 182, height: 20 },
    ],
  },

  {
    id: 'map_14', name: 'Ridge', difficulty: DIFFICULTY.INTERMEDIATE,
    knifeId: 'knife_ridge', paletteKey: 'ridge',
    desc: 'Lavender ridge — long diagonal runs with late-breaking tight turns.',
    sections: [
      { w: 262, depth: 2000, angle: 0.75, dropY: -1334 },
      { w: 248, depth: 2200, angle: 0.77, dropY: -1529 },
      { w: 238, depth: 2150, angle: 0.78, dropY: -1524 },
      { w: 226, depth: 2050, angle: 0.79, dropY: -1465 },
      { w: 214, depth: 1950, angle: 0.81, dropY: -1407 },
      { w: 202, depth: 1850, angle: 0.83, dropY: -1357 },
    ],
    padLens: [258, 228, 218, 215, 215, 218, 360], spawnY: 0,
    curvedSections: [
      { afterPad: 0, radius: 358, angle: -0.68, width: 228, height: 20 },
      { afterPad: 2, radius: 338, angle:  0.70, width: 206, height: 20 },
      { afterPad: 4, radius: 320, angle: -0.72, width: 188, height: 20 },
    ],
  },

  {
    id: 'map_15', name: 'Summit', difficulty: DIFFICULTY.INTERMEDIATE,
    knifeId: 'knife_summit', paletteKey: 'summit',
    desc: 'White blizzard — high-altitude surf where visibility and speed test focus.',
    sections: [
      { w: 255, depth: 1950, angle: 0.76, dropY: -1311 },
      { w: 242, depth: 2100, angle: 0.78, dropY: -1488 },
      { w: 232, depth: 2200, angle: 0.79, dropY: -1571 },
      { w: 220, depth: 2100, angle: 0.80, dropY: -1500 },
      { w: 207, depth: 2000, angle: 0.82, dropY: -1459 },
      { w: 195, depth: 1900, angle: 0.84, dropY: -1410 },
    ],
    padLens: [252, 225, 215, 212, 212, 218, 352], spawnY: 0,
    curvedSections: [
      { afterPad: 0, radius: 352, angle:  0.72, width: 222, height: 20 },
      { afterPad: 1, radius: 335, angle: -0.70, width: 208, height: 20 },
      { afterPad: 3, radius: 318, angle:  0.68, width: 192, height: 20 },
      { afterPad: 4, radius: 302, angle: -0.70, width: 178, height: 20 },
    ],
  },

  {
    id: 'map_16', name: 'Peak', difficulty: DIFFICULTY.INTERMEDIATE,
    knifeId: 'knife_peak', paletteKey: 'peak',
    desc: 'Cyan ice at the summit — seven sections, each demanding clean arc entries.',
    sections: [
      { w: 260, depth: 1900, angle: 0.75, dropY: -1267 },
      { w: 245, depth: 2100, angle: 0.77, dropY: -1460 },
      { w: 235, depth: 2200, angle: 0.78, dropY: -1559 },
      { w: 224, depth: 2100, angle: 0.80, dropY: -1500 },
      { w: 212, depth: 2000, angle: 0.81, dropY: -1430 },
      { w: 200, depth: 1900, angle: 0.83, dropY: -1393 },
      { w: 188, depth: 1800, angle: 0.85, dropY: -1349 },
    ],
    padLens: [255, 225, 215, 210, 210, 215, 215, 350], spawnY: 0,
    curvedSections: [
      { afterPad: 0, radius: 355, angle: -0.72, width: 225, height: 20 },
      { afterPad: 2, radius: 335, angle:  0.70, width: 205, height: 20 },
      { afterPad: 4, radius: 315, angle: -0.68, width: 185, height: 20 },
    ],
  },


  // ═══════════════════════════════════════════════════════════════════════════
  // ADVANCED (map17–24) — Inspired by surf_mesa, surf_kitsune adv, surf_rebel
  // Narrower (150-210), steep angles (47-53°), 7-9 sections
  // Goal: Mastery of strafes, tight curves, maintaining high speed
  // ═══════════════════════════════════════════════════════════════════════════

  {
    id: 'map_17', name: 'Storm', difficulty: DIFFICULTY.ADVANCED,
    knifeId: 'knife_storm', paletteKey: 'storm',
    desc: 'Yellow lightning — mesa-style long runs with violent mid-section S-curves.',
    // Inspired by surf_mesa: canyon walls, long ramp corridors, tight S-turns
    sections: [
      { w: 220, depth: 2400, angle: 0.82, dropY: -1753 },
      { w: 208, depth: 2600, angle: 0.84, dropY: -1931 },
      { w: 200, depth: 2800, angle: 0.85, dropY: -2098 },  // Longest section
      { w: 190, depth: 2600, angle: 0.86, dropY: -1960 },
      { w: 180, depth: 2400, angle: 0.87, dropY: -1817 },
      { w: 168, depth: 2200, angle: 0.88, dropY: -1672 },
      { w: 157, depth: 2000, angle: 0.90, dropY: -1558 },
      { w: 147, depth: 1800, angle: 0.92, dropY: -1427 },
    ],
    padLens: [230, 210, 200, 200, 200, 200, 200, 205, 320], spawnY: 0,
    curvedSections: [
      { afterPad: 0, radius: 300, angle:  0.85, width: 188, height: 18 },
      { afterPad: 1, radius: 285, angle: -0.82, width: 178, height: 18 },
      { afterPad: 2, radius: 272, angle:  0.80, width: 168, height: 18 },
      { afterPad: 4, radius: 258, angle: -0.78, width: 156, height: 18 },
      { afterPad: 6, radius: 245, angle:  0.82, width: 144, height: 18 },
    ],
  },

  {
    id: 'map_18', name: 'Tempest', difficulty: DIFFICULTY.ADVANCED,
    knifeId: 'knife_tempest', paletteKey: 'tempest',
    desc: 'Ocean tempest — alternating high-amplitude S-curves through crashing waves.',
    sections: [
      { w: 215, depth: 2300, angle: 0.82, dropY: -1682 },
      { w: 204, depth: 2500, angle: 0.84, dropY: -1858 },
      { w: 195, depth: 2700, angle: 0.85, dropY: -2022 },
      { w: 185, depth: 2500, angle: 0.86, dropY: -1885 },
      { w: 175, depth: 2300, angle: 0.87, dropY: -1740 },
      { w: 163, depth: 2100, angle: 0.88, dropY: -1596 },
      { w: 152, depth: 1900, angle: 0.90, dropY: -1481 },
    ],
    padLens: [225, 205, 196, 196, 196, 196, 196, 312], spawnY: 0,
    curvedSections: [
      { afterPad: 0, radius: 295, angle: -0.82, width: 184, height: 18 },
      { afterPad: 1, radius: 278, angle:  0.80, width: 172, height: 18 },
      { afterPad: 2, radius: 264, angle: -0.78, width: 162, height: 18 },
      { afterPad: 4, radius: 250, angle:  0.76, width: 150, height: 18 },
    ],
  },

  {
    id: 'map_19', name: 'Gale', difficulty: DIFFICULTY.ADVANCED,
    knifeId: 'knife_gale', paletteKey: 'gale',
    desc: 'Scorching desert gale — red-pink ramps with zero margin for error on edges.',
    sections: [
      { w: 212, depth: 2350, angle: 0.83, dropY: -1744 },
      { w: 200, depth: 2550, angle: 0.85, dropY: -1910 },
      { w: 192, depth: 2750, angle: 0.86, dropY: -2075 },
      { w: 182, depth: 2550, angle: 0.87, dropY: -1929 },
      { w: 172, depth: 2350, angle: 0.88, dropY: -1785 },
      { w: 160, depth: 2150, angle: 0.89, dropY: -1630 },
      { w: 150, depth: 1950, angle: 0.91, dropY: -1510 },
      { w: 140, depth: 1750, angle: 0.93, dropY: -1393 },
    ],
    padLens: [222, 202, 194, 192, 192, 192, 192, 196, 308], spawnY: 0,
    curvedSections: [
      { afterPad: 0, radius: 290, angle:  0.84, width: 180, height: 18 },
      { afterPad: 1, radius: 275, angle: -0.82, width: 170, height: 18 },
      { afterPad: 3, radius: 260, angle:  0.80, width: 158, height: 18 },
      { afterPad: 5, radius: 246, angle: -0.80, width: 146, height: 18 },
      { afterPad: 6, radius: 232, angle:  0.82, width: 134, height: 18 },
    ],
  },

  {
    id: 'map_20', name: 'Squall', difficulty: DIFFICULTY.ADVANCED,
    knifeId: 'knife_squall', paletteKey: 'squall',
    desc: 'Tropical squall — rapid green ramps with sudden tight 90° banked walls.',
    sections: [
      { w: 218, depth: 2250, angle: 0.82, dropY: -1645 },
      { w: 206, depth: 2450, angle: 0.83, dropY: -1799 },
      { w: 197, depth: 2650, angle: 0.85, dropY: -1985 },
      { w: 187, depth: 2450, angle: 0.86, dropY: -1848 },
      { w: 177, depth: 2250, angle: 0.87, dropY: -1703 },
      { w: 165, depth: 2050, angle: 0.88, dropY: -1556 },
      { w: 155, depth: 1850, angle: 0.90, dropY: -1441 },
    ],
    padLens: [228, 208, 198, 196, 196, 196, 196, 316], spawnY: 0,
    curvedSections: [
      { afterPad: 0, radius: 298, angle: -0.80, width: 186, height: 18 },
      { afterPad: 2, radius: 280, angle:  0.82, width: 164, height: 18 },
      { afterPad: 4, radius: 264, angle: -0.80, width: 150, height: 18 },
    ],
  },

  {
    id: 'map_21', name: 'Cyclone', difficulty: DIFFICULTY.ADVANCED,
    knifeId: 'knife_cyclone', paletteKey: 'cyclone',
    desc: 'Purple cyclone — eight-section tour de force with spiraling difficulty.',
    sections: [
      { w: 210, depth: 2300, angle: 0.82, dropY: -1682 },
      { w: 199, depth: 2500, angle: 0.84, dropY: -1858 },
      { w: 190, depth: 2700, angle: 0.85, dropY: -2022 },
      { w: 180, depth: 2500, angle: 0.86, dropY: -1885 },
      { w: 170, depth: 2300, angle: 0.87, dropY: -1740 },
      { w: 158, depth: 2100, angle: 0.88, dropY: -1596 },
      { w: 148, depth: 1900, angle: 0.90, dropY: -1481 },
      { w: 138, depth: 1700, angle: 0.92, dropY: -1348 },
    ],
    padLens: [220, 200, 192, 190, 190, 190, 190, 192, 304], spawnY: 0,
    curvedSections: [
      { afterPad: 0, radius: 288, angle:  0.80, width: 178, height: 18 },
      { afterPad: 1, radius: 272, angle: -0.78, width: 166, height: 18 },
      { afterPad: 2, radius: 258, angle:  0.80, width: 155, height: 18 },
      { afterPad: 4, radius: 244, angle: -0.78, width: 143, height: 18 },
      { afterPad: 6, radius: 230, angle:  0.80, width: 130, height: 18 },
    ],
  },

  {
    id: 'map_22', name: 'Vortex', difficulty: DIFFICULTY.ADVANCED,
    knifeId: 'knife_vortex', paletteKey: 'vortex',
    desc: 'Orange vortex — fast downward spiral, each ramp faster than the last.',
    sections: [
      { w: 208, depth: 2200, angle: 0.83, dropY: -1632 },
      { w: 196, depth: 2400, angle: 0.84, dropY: -1785 },
      { w: 188, depth: 2600, angle: 0.86, dropY: -1960 },
      { w: 178, depth: 2400, angle: 0.87, dropY: -1817 },
      { w: 167, depth: 2200, angle: 0.88, dropY: -1672 },
      { w: 156, depth: 2000, angle: 0.90, dropY: -1558 },
      { w: 146, depth: 1800, angle: 0.92, dropY: -1427 },
    ],
    padLens: [218, 198, 190, 188, 188, 188, 188, 298], spawnY: 0,
    curvedSections: [
      { afterPad: 0, radius: 292, angle: -0.82, width: 174, height: 18 },
      { afterPad: 2, radius: 275, angle:  0.80, width: 156, height: 18 },
      { afterPad: 3, radius: 260, angle: -0.82, width: 145, height: 18 },
      { afterPad: 5, radius: 246, angle:  0.84, width: 134, height: 18 },
    ],
  },

  {
    id: 'map_23', name: 'Maelstrom', difficulty: DIFFICULTY.ADVANCED,
    knifeId: 'knife_maelstrom', paletteKey: 'maelstrom',
    desc: 'Blue maelstrom — crushing downward pull; curves tighten near the end.',
    sections: [
      { w: 205, depth: 2350, angle: 0.83, dropY: -1744 },
      { w: 194, depth: 2550, angle: 0.85, dropY: -1910 },
      { w: 186, depth: 2750, angle: 0.86, dropY: -2075 },
      { w: 176, depth: 2550, angle: 0.87, dropY: -1929 },
      { w: 166, depth: 2350, angle: 0.88, dropY: -1785 },
      { w: 154, depth: 2150, angle: 0.89, dropY: -1630 },
      { w: 144, depth: 1950, angle: 0.91, dropY: -1510 },
      { w: 134, depth: 1750, angle: 0.93, dropY: -1393 },
    ],
    padLens: [215, 196, 188, 185, 185, 185, 185, 188, 300], spawnY: 0,
    curvedSections: [
      { afterPad: 0, radius: 285, angle:  0.82, width: 172, height: 18 },
      { afterPad: 1, radius: 268, angle: -0.80, width: 160, height: 18 },
      { afterPad: 3, radius: 254, angle:  0.82, width: 148, height: 18 },
      { afterPad: 5, radius: 240, angle: -0.84, width: 136, height: 18 },
      { afterPad: 6, radius: 226, angle:  0.86, width: 124, height: 18 },
    ],
  },

  {
    id: 'map_24', name: 'Typhoon', difficulty: DIFFICULTY.ADVANCED,
    knifeId: 'knife_typhoon', paletteKey: 'typhoon',
    desc: 'Magenta typhoon — eight brutal sections, the hardest advanced map.',
    sections: [
      { w: 202, depth: 2280, angle: 0.84, dropY: -1699 },
      { w: 191, depth: 2480, angle: 0.85, dropY: -1858 },
      { w: 183, depth: 2680, angle: 0.86, dropY: -2022 },
      { w: 173, depth: 2480, angle: 0.87, dropY: -1873 },
      { w: 163, depth: 2280, angle: 0.88, dropY: -1729 },
      { w: 151, depth: 2080, angle: 0.89, dropY: -1577 },
      { w: 141, depth: 1880, angle: 0.91, dropY: -1457 },
      { w: 131, depth: 1680, angle: 0.93, dropY: -1337 },
    ],
    padLens: [212, 194, 186, 183, 183, 183, 183, 186, 296], spawnY: 0,
    curvedSections: [
      { afterPad: 0, radius: 280, angle: -0.84, width: 169, height: 18 },
      { afterPad: 1, radius: 264, angle:  0.82, width: 158, height: 18 },
      { afterPad: 2, radius: 250, angle: -0.84, width: 147, height: 18 },
      { afterPad: 4, radius: 236, angle:  0.86, width: 135, height: 18 },
      { afterPad: 6, radius: 222, angle: -0.88, width: 123, height: 18 },
    ],
  },


  // ═══════════════════════════════════════════════════════════════════════════
  // EXPERT (map25–32) — Inspired by surf_rebel, surf_magnitude, surf_utopia_v3
  // Very narrow (100-160), extreme angles (50-60°), 9-11 sections
  // Goal: Perfect execution only; one mistake and you're out
  // ═══════════════════════════════════════════════════════════════════════════

  {
    id: 'map_25', name: 'Void', difficulty: DIFFICULTY.EXPERT,
    knifeId: 'knife_void', paletteKey: 'void',
    desc: 'Red void — nine sections of relentless dropping. No recovery pads wide enough to rest.',
    // Inspired by surf_rebel: punishing, minimal room, high speed
    sections: [
      { w: 178, depth: 2800, angle: 0.88, dropY: -2127 },
      { w: 166, depth: 3000, angle: 0.90, dropY: -2338 },
      { w: 158, depth: 3200, angle: 0.91, dropY: -2519 },
      { w: 148, depth: 3000, angle: 0.92, dropY: -2381 },
      { w: 138, depth: 2800, angle: 0.93, dropY: -2228 },
      { w: 128, depth: 2600, angle: 0.95, dropY: -2109 },
      { w: 118, depth: 2400, angle: 0.97, dropY: -1987 },
      { w: 110, depth: 2200, angle: 0.99, dropY: -1825 },
      { w: 102, depth: 2000, angle: 1.01, dropY: -1685 },
    ],
    padLens: [200, 190, 182, 178, 178, 175, 175, 175, 175, 260], spawnY: 0,
    curvedSections: [
      { afterPad: 0, radius: 240, angle:  0.92, width: 148, height: 16 },
      { afterPad: 1, radius: 226, angle: -0.90, width: 138, height: 16 },
      { afterPad: 2, radius: 214, angle:  0.92, width: 128, height: 16 },
      { afterPad: 4, radius: 202, angle: -0.90, width: 116, height: 16 },
      { afterPad: 6, radius: 190, angle:  0.92, width: 106, height: 16 },
    ],
  },

  {
    id: 'map_26', name: 'Null', difficulty: DIFFICULTY.EXPERT,
    knifeId: 'knife_null', paletteKey: 'null',
    desc: 'Teal edges in pitch darkness — trust the geometry, not your eyes.',
    sections: [
      { w: 172, depth: 2850, angle: 0.89, dropY: -2184 },
      { w: 160, depth: 3050, angle: 0.91, dropY: -2401 },
      { w: 152, depth: 3250, angle: 0.92, dropY: -2580 },
      { w: 142, depth: 3050, angle: 0.93, dropY: -2424 },
      { w: 132, depth: 2850, angle: 0.94, dropY: -2274 },
      { w: 122, depth: 2650, angle: 0.96, dropY: -2167 },
      { w: 113, depth: 2450, angle: 0.98, dropY: -2032 },
      { w: 105, depth: 2250, angle: 1.00, dropY: -1893 },
      { w:  97, depth: 2050, angle: 1.02, dropY: -1743 },
    ],
    padLens: [195, 188, 180, 175, 175, 172, 172, 172, 172, 255], spawnY: 0,
    curvedSections: [
      { afterPad: 0, radius: 235, angle: -0.92, width: 142, height: 16 },
      { afterPad: 2, radius: 220, angle:  0.90, width: 122, height: 16 },
      { afterPad: 4, radius: 206, angle: -0.92, width: 110, height: 16 },
      { afterPad: 6, radius: 192, angle:  0.94, width:  99, height: 16 },
    ],
  },

  {
    id: 'map_27', name: 'Zenith', difficulty: DIFFICULTY.EXPERT,
    knifeId: 'knife_zenith', paletteKey: 'zenith',
    desc: 'Lavender at existence\'s limit — curves that punish any angle deviation.',
    sections: [
      { w: 170, depth: 2900, angle: 0.89, dropY: -2222 },
      { w: 158, depth: 3100, angle: 0.91, dropY: -2439 },
      { w: 150, depth: 3300, angle: 0.92, dropY: -2620 },
      { w: 140, depth: 3100, angle: 0.93, dropY: -2466 },
      { w: 130, depth: 2900, angle: 0.94, dropY: -2313 },
      { w: 120, depth: 2700, angle: 0.96, dropY: -2207 },
      { w: 111, depth: 2500, angle: 0.98, dropY: -2073 },
      { w: 103, depth: 2300, angle: 1.00, dropY: -1933 },
      { w:  95, depth: 2100, angle: 1.02, dropY: -1784 },
    ],
    padLens: [192, 186, 178, 173, 173, 170, 170, 170, 170, 252], spawnY: 0,
    curvedSections: [
      { afterPad: 0, radius: 232, angle:  0.90, width: 138, height: 16 },
      { afterPad: 1, radius: 218, angle: -0.92, width: 126, height: 16 },
      { afterPad: 2, radius: 205, angle:  0.90, width: 116, height: 16 },
      { afterPad: 4, radius: 193, angle: -0.92, width: 106, height: 16 },
      { afterPad: 6, radius: 181, angle:  0.94, width:  97, height: 16 },
    ],
  },

  {
    id: 'map_28', name: 'Apex', difficulty: DIFFICULTY.EXPERT,
    knifeId: 'knife_apex', paletteKey: 'apex',
    desc: 'Orange-red pinnacle — ten sections that filter pros from legends.',
    sections: [
      { w: 165, depth: 2950, angle: 0.90, dropY: -2269 },
      { w: 154, depth: 3150, angle: 0.92, dropY: -2501 },
      { w: 146, depth: 3350, angle: 0.93, dropY: -2666 },
      { w: 136, depth: 3150, angle: 0.94, dropY: -2513 },
      { w: 126, depth: 2950, angle: 0.95, dropY: -2349 },
      { w: 116, depth: 2750, angle: 0.97, dropY: -2232 },
      { w: 107, depth: 2550, angle: 0.99, dropY: -2115 },
      { w:  99, depth: 2350, angle: 1.01, dropY: -1953 },
      { w:  91, depth: 2150, angle: 1.03, dropY: -1792 },
      { w:  83, depth: 1950, angle: 1.05, dropY: -1633 },
    ],
    padLens: [188, 183, 175, 170, 168, 168, 165, 165, 165, 168, 248], spawnY: 0,
    curvedSections: [
      { afterPad: 0, radius: 228, angle: -0.92, width: 132, height: 16 },
      { afterPad: 1, radius: 214, angle:  0.90, width: 120, height: 16 },
      { afterPad: 3, radius: 201, angle: -0.92, width: 108, height: 16 },
      { afterPad: 5, radius: 188, angle:  0.94, width:  98, height: 16 },
      { afterPad: 7, radius: 176, angle: -0.96, width:  88, height: 16 },
    ],
  },

  {
    id: 'map_29', name: 'Omega', difficulty: DIFFICULTY.EXPERT,
    knifeId: 'knife_omega', paletteKey: 'omega',
    desc: 'Green final descent — last omega-level map before absolute maps.',
    sections: [
      { w: 162, depth: 2950, angle: 0.90, dropY: -2269 },
      { w: 151, depth: 3150, angle: 0.92, dropY: -2501 },
      { w: 143, depth: 3350, angle: 0.93, dropY: -2666 },
      { w: 133, depth: 3150, angle: 0.94, dropY: -2513 },
      { w: 123, depth: 2950, angle: 0.95, dropY: -2349 },
      { w: 113, depth: 2750, angle: 0.97, dropY: -2232 },
      { w: 104, depth: 2550, angle: 0.99, dropY: -2115 },
      { w:  96, depth: 2350, angle: 1.01, dropY: -1953 },
      { w:  88, depth: 2150, angle: 1.03, dropY: -1792 },
    ],
    padLens: [185, 180, 172, 167, 167, 165, 165, 162, 162, 245], spawnY: 0,
    curvedSections: [
      { afterPad: 0, radius: 224, angle:  0.92, width: 128, height: 16 },
      { afterPad: 2, radius: 210, angle: -0.90, width: 114, height: 16 },
      { afterPad: 4, radius: 197, angle:  0.92, width: 102, height: 16 },
      { afterPad: 6, radius: 184, angle: -0.94, width:  92, height: 16 },
    ],
  },

  {
    id: 'map_30', name: 'Sigma', difficulty: DIFFICULTY.EXPERT,
    knifeId: 'knife_sigma', paletteKey: 'sigma',
    desc: 'Pink-magenta — sigma-level geometry requires inhuman consistency.',
    sections: [
      { w: 158, depth: 3000, angle: 0.91, dropY: -2333 },
      { w: 147, depth: 3200, angle: 0.93, dropY: -2560 },
      { w: 139, depth: 3400, angle: 0.94, dropY: -2720 },
      { w: 129, depth: 3200, angle: 0.95, dropY: -2557 },
      { w: 119, depth: 3000, angle: 0.96, dropY: -2386 },
      { w: 109, depth: 2800, angle: 0.98, dropY: -2275 },
      { w: 100, depth: 2600, angle: 1.00, dropY: -2187 },
      { w:  92, depth: 2400, angle: 1.02, dropY: -2038 },
      { w:  84, depth: 2200, angle: 1.04, dropY: -1879 },
      { w:  76, depth: 2000, angle: 1.06, dropY: -1720 },
    ],
    padLens: [182, 178, 170, 165, 163, 163, 160, 160, 160, 160, 242], spawnY: 0,
    curvedSections: [
      { afterPad: 0, radius: 220, angle: -0.94, width: 124, height: 16 },
      { afterPad: 1, radius: 206, angle:  0.92, width: 112, height: 16 },
      { afterPad: 3, radius: 193, angle: -0.94, width: 100, height: 16 },
      { afterPad: 5, radius: 180, angle:  0.96, width:  90, height: 16 },
      { afterPad: 7, radius: 168, angle: -0.98, width:  80, height: 16 },
    ],
  },

  {
    id: 'map_31', name: 'Prime', difficulty: DIFFICULTY.EXPERT,
    knifeId: 'knife_prime', paletteKey: 'prime',
    desc: 'Blue prime — ten sections of near-vertical surfing above the abyss.',
    sections: [
      { w: 155, depth: 3050, angle: 0.92, dropY: -2397 },
      { w: 144, depth: 3250, angle: 0.94, dropY: -2607 },
      { w: 136, depth: 3450, angle: 0.95, dropY: -2764 },
      { w: 126, depth: 3250, angle: 0.96, dropY: -2593 },
      { w: 116, depth: 3050, angle: 0.97, dropY: -2426 },
      { w: 106, depth: 2850, angle: 0.99, dropY: -2363 },
      { w:  97, depth: 2650, angle: 1.01, dropY: -2200 },
      { w:  89, depth: 2450, angle: 1.03, dropY: -2040 },
      { w:  81, depth: 2250, angle: 1.05, dropY: -1889 },
      { w:  73, depth: 2050, angle: 1.07, dropY: -1740 },
    ],
    padLens: [178, 175, 168, 162, 160, 158, 158, 155, 155, 155, 238], spawnY: 0,
    curvedSections: [
      { afterPad: 0, radius: 216, angle:  0.95, width: 120, height: 16 },
      { afterPad: 2, radius: 202, angle: -0.93, width: 107, height: 16 },
      { afterPad: 4, radius: 189, angle:  0.95, width:  95, height: 16 },
      { afterPad: 6, radius: 176, angle: -0.97, width:  85, height: 16 },
      { afterPad: 8, radius: 164, angle:  0.99, width:  74, height: 16 },
    ],
  },

  {
    id: 'map_32', name: 'Absolute', difficulty: DIFFICULTY.EXPERT,
    knifeId: 'knife_absolute', paletteKey: 'absolute',
    desc: 'Gold on black — the absolute final map. Eleven sections of perfection or nothing.',
    // Inspired by surf_utopia_v3 / surf_magnitude: the hardest possible map
    sections: [
      { w: 150, depth: 3100, angle: 0.93, dropY: -2470 },
      { w: 139, depth: 3300, angle: 0.95, dropY: -2653 },
      { w: 131, depth: 3500, angle: 0.96, dropY: -2808 },
      { w: 121, depth: 3300, angle: 0.97, dropY: -2628 },
      { w: 111, depth: 3100, angle: 0.98, dropY: -2464 },
      { w: 101, depth: 2900, angle: 1.00, dropY: -2441 },
      { w:  92, depth: 2700, angle: 1.02, dropY: -2295 },
      { w:  84, depth: 2500, angle: 1.04, dropY: -2133 },
      { w:  76, depth: 2300, angle: 1.06, dropY: -1965 },
      { w:  68, depth: 2100, angle: 1.08, dropY: -1798 },
      { w:  60, depth: 1900, angle: 1.10, dropY: -1627 },
    ],
    padLens: [175, 172, 165, 159, 157, 155, 152, 152, 152, 150, 152, 235], spawnY: 0,
    curvedSections: [
      { afterPad: 0, radius: 212, angle: -0.96, width: 116, height: 16 },
      { afterPad: 1, radius: 198, angle:  0.94, width: 104, height: 16 },
      { afterPad: 3, radius: 185, angle: -0.96, width:  92, height: 16 },
      { afterPad: 5, radius: 172, angle:  0.98, width:  82, height: 16 },
      { afterPad: 7, radius: 160, angle: -1.00, width:  72, height: 16 },
      { afterPad: 9, radius: 148, angle:  1.02, width:  60, height: 16 },
    ],
  },
];

// ── Lookups ────────────────────────────────────────────────────────────────────

export const MAP_BY_ID = Object.fromEntries(MAP_CATALOG.map(m => [m.id, m]));

export const MAPS_BY_DIFF = {
  beginner:     MAP_CATALOG.filter(m => m.difficulty === DIFFICULTY.BEGINNER),
  intermediate: MAP_CATALOG.filter(m => m.difficulty === DIFFICULTY.INTERMEDIATE),
  advanced:     MAP_CATALOG.filter(m => m.difficulty === DIFFICULTY.ADVANCED),
  expert:       MAP_CATALOG.filter(m => m.difficulty === DIFFICULTY.EXPERT),
};
