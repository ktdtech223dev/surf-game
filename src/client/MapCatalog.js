/**
 * MapCatalog.js — All 32 fixed surf maps + procedural daily/weekly
 *
 * Physics constraints:
 *   normalY = outerX / sqrt(dropAbs² + outerX²)  must be < 0.7
 *   outerX  = w/2 + 60
 *   dropY   = -Math.round(outerX * bankRatio)
 *   For normalY < 0.7: dropAbs must be > 1.02 × outerX
 *
 * Bank ratio ranges by difficulty:
 *   Beginner:     bankRatio 2.0–2.5  → bank angle 63–68°
 *   Intermediate: bankRatio 2.6–3.4  → bank angle 69–74°
 *   Advanced:     bankRatio 3.5–4.5  → bank angle 74–77°
 *   Expert:       bankRatio 4.6–6.0  → bank angle 78–80°
 */

export const DIFFICULTY = {
  BEGINNER:     'beginner',
  INTERMEDIATE: 'intermediate',
  ADVANCED:     'advanced',
  EXPERT:       'expert',
};

/** All 32 fixed maps */
export const MAP_CATALOG = [

  // ═══════════════════════════════════════════════════════════════════════════
  // BEGINNER (map01–08) — bankRatio 2.0–2.5, wide ramps (w 280–380), 4-5 sections
  // ═══════════════════════════════════════════════════════════════════════════

  {
    // outerX per section: 230, 220, 210, 200
    // dropY = -round(outerX * bankRatio)
    // bankRatio 2.0: normalY = 230/sqrt(460²+230²) = 230/514 = 0.447 ✓
    id: 'map_01', name: 'Shoreline', difficulty: DIFFICULTY.BEGINNER,
    knifeId: 'knife_shoreline', paletteKey: 'shoreline',
    bankRatio: 2.0,
    desc: 'A gentle coastal surf — wide ramps and forgiving S-turns above the ocean.',
    sections: [
      { w: 340, depth: 1600, dropY:  -460 },  // outerX=230, bankRatio=2.0, normalY≈0.447
      { w: 320, depth: 1800, dropY:  -440 },  // outerX=220, bankRatio=2.0, normalY≈0.447
      { w: 300, depth: 1700, dropY:  -420 },  // outerX=210, bankRatio=2.0, normalY≈0.447
      { w: 280, depth: 1600, dropY:  -400 },  // outerX=200, bankRatio=2.0, normalY≈0.447
    ],
    padLens: [400, 320, 300, 320, 500], spawnY: 0,
    curvedSections: [
      { afterPad: 0, radius: 500, angle:  0.55, width: 300, height: 22 },
      { afterPad: 1, radius: 480, angle: -0.52, width: 280, height: 22 },
      { afterPad: 2, radius: 460, angle:  0.48, width: 260, height: 22 },
    ],
  },

  {
    // outerX: 225, 217, 210, 202  bankRatio 2.1
    id: 'map_02', name: 'Coastal', difficulty: DIFFICULTY.BEGINNER,
    knifeId: 'knife_coastal', paletteKey: 'coastal',
    bankRatio: 2.1,
    desc: 'Rolling green ramps descending toward a calm shoreline.',
    sections: [
      { w: 330, depth: 1550, dropY:  -473 },  // outerX=225, bankRatio=2.1, normalY≈0.432
      { w: 314, depth: 1750, dropY:  -455 },  // outerX=217, bankRatio=2.1, normalY≈0.432
      { w: 300, depth: 1650, dropY:  -441 },  // outerX=210, bankRatio=2.1, normalY≈0.432
      { w: 284, depth: 1500, dropY:  -424 },  // outerX=202, bankRatio=2.1, normalY≈0.432
    ],
    padLens: [380, 310, 290, 300, 480], spawnY: 0,
    curvedSections: [
      { afterPad: 0, radius: 480, angle: -0.50, width: 290, height: 22 },
      { afterPad: 2, radius: 460, angle:  0.48, width: 270, height: 22 },
    ],
  },

  {
    // outerX: 240, 230, 217, 207  bankRatio 2.0 (wide, very gentle)
    id: 'map_03', name: 'Basin', difficulty: DIFFICULTY.BEGINNER,
    knifeId: 'knife_basin', paletteKey: 'basin',
    bankRatio: 2.0,
    desc: 'Volcanic basin — red-hot ramps with a long straight drop into the caldera.',
    sections: [
      { w: 360, depth: 1700, dropY:  -480 },  // outerX=240, bankRatio=2.0, normalY≈0.447
      { w: 340, depth: 2000, dropY:  -460 },  // outerX=230, bankRatio=2.0, normalY≈0.447
      { w: 314, depth: 1800, dropY:  -434 },  // outerX=217, bankRatio=2.0, normalY≈0.447
      { w: 294, depth: 1600, dropY:  -417 },  // outerX=207, bankRatio=2.0, normalY≈0.447
    ],
    padLens: [420, 330, 310, 320, 500], spawnY: 0,
    curvedSections: [
      { afterPad: 0, radius: 520, angle:  0.60, width: 320, height: 22 },
      { afterPad: 2, radius: 490, angle: -0.55, width: 280, height: 22 },
    ],
  },

  {
    // outerX: 220, 212, 205, 195  bankRatio 2.2
    id: 'map_04', name: 'Inlet', difficulty: DIFFICULTY.BEGINNER,
    knifeId: 'knife_inlet', paletteKey: 'inlet',
    bankRatio: 2.2,
    desc: 'Amber canyon walls funnel through a narrow inlet — relaxed pace.',
    sections: [
      { w: 320, depth: 1500, dropY:  -484 },  // outerX=220, bankRatio=2.2, normalY≈0.416
      { w: 304, depth: 1700, dropY:  -466 },  // outerX=212, bankRatio=2.2, normalY≈0.416
      { w: 290, depth: 1650, dropY:  -451 },  // outerX=205, bankRatio=2.2, normalY≈0.416
      { w: 270, depth: 1550, dropY:  -429 },  // outerX=195, bankRatio=2.2, normalY≈0.416
    ],
    padLens: [360, 300, 280, 300, 460], spawnY: 0,
    curvedSections: [
      { afterPad: 1, radius: 460, angle:  0.52, width: 270, height: 22 },
      { afterPad: 2, radius: 440, angle: -0.50, width: 255, height: 22 },
    ],
  },

  {
    // outerX: 220, 212, 202, 192  bankRatio 2.0 — speed-focused, long sections
    id: 'map_05', name: 'Cove', difficulty: DIFFICULTY.BEGINNER,
    knifeId: 'knife_cove', paletteKey: 'cove',
    bankRatio: 2.0,
    desc: 'Purple twilight in a hidden cove — pure speed runs with minimal turns.',
    sections: [
      { w: 320, depth: 2000, dropY:  -440 },  // outerX=220, bankRatio=2.0, normalY≈0.447
      { w: 304, depth: 2200, dropY:  -424 },  // outerX=212, bankRatio=2.0, normalY≈0.447
      { w: 284, depth: 2000, dropY:  -404 },  // outerX=202, bankRatio=2.0, normalY≈0.447
      { w: 264, depth: 1800, dropY:  -384 },  // outerX=192, bankRatio=2.0, normalY≈0.447
    ],
    padLens: [400, 280, 260, 280, 480], spawnY: 0,
    curvedSections: [
      { afterPad: 0, radius: 550, angle:  0.45, width: 285, height: 22 },
      { afterPad: 1, radius: 530, angle: -0.42, width: 265, height: 22 },
    ],
  },

  {
    // outerX: 235, 225, 215, 205  bankRatio 2.1
    id: 'map_06', name: 'Bay', difficulty: DIFFICULTY.BEGINNER,
    knifeId: 'knife_bay', paletteKey: 'bay',
    bankRatio: 2.1,
    desc: 'Teal waves in an open bay — beginner-friendly with multiple recovery pads.',
    sections: [
      { w: 350, depth: 1600, dropY:  -494 },  // outerX=235, bankRatio=2.1, normalY≈0.432
      { w: 330, depth: 1900, dropY:  -473 },  // outerX=225, bankRatio=2.1, normalY≈0.432
      { w: 310, depth: 1750, dropY:  -452 },  // outerX=215, bankRatio=2.1, normalY≈0.432
      { w: 290, depth: 1550, dropY:  -431 },  // outerX=205, bankRatio=2.1, normalY≈0.432
    ],
    padLens: [400, 340, 320, 330, 500], spawnY: 0,
    curvedSections: [
      { afterPad: 0, radius: 500, angle: -0.55, width: 300, height: 22 },
      { afterPad: 2, radius: 470, angle:  0.52, width: 270, height: 22 },
    ],
  },

  {
    // outerX: 225, 217, 210, 200, 190  bankRatio 2.2 — 5 sections
    id: 'map_07', name: 'Delta', difficulty: DIFFICULTY.BEGINNER,
    knifeId: 'knife_delta', paletteKey: 'delta',
    bankRatio: 2.2,
    desc: 'Yellow-green river delta — five sections with a surprise steeper final ramp.',
    sections: [
      { w: 330, depth: 1500, dropY:  -495 },  // outerX=225, bankRatio=2.2, normalY≈0.416
      { w: 314, depth: 1700, dropY:  -477 },  // outerX=217, bankRatio=2.2, normalY≈0.416
      { w: 300, depth: 1800, dropY:  -462 },  // outerX=210, bankRatio=2.2, normalY≈0.416
      { w: 280, depth: 1700, dropY:  -440 },  // outerX=200, bankRatio=2.2, normalY≈0.416
      { w: 260, depth: 1600, dropY:  -418 },  // outerX=190, bankRatio=2.2, normalY≈0.416
    ],
    padLens: [360, 290, 280, 270, 280, 460], spawnY: 0,
    curvedSections: [
      { afterPad: 0, radius: 470, angle:  0.50, width: 290, height: 22 },
      { afterPad: 2, radius: 450, angle: -0.48, width: 265, height: 22 },
      { afterPad: 3, radius: 430, angle:  0.52, width: 248, height: 22 },
    ],
  },

  {
    // outerX: 230, 220, 210, 200  bankRatio 2.3 — triple S-curve
    id: 'map_08', name: 'Lagoon', difficulty: DIFFICULTY.BEGINNER,
    knifeId: 'knife_lagoon', paletteKey: 'lagoon',
    bankRatio: 2.3,
    desc: 'Crystal blue ramps in a tropical lagoon — smooth as glass.',
    sections: [
      { w: 340, depth: 1650, dropY:  -529 },  // outerX=230, bankRatio=2.3, normalY≈0.402
      { w: 320, depth: 1850, dropY:  -506 },  // outerX=220, bankRatio=2.3, normalY≈0.402
      { w: 300, depth: 1700, dropY:  -483 },  // outerX=210, bankRatio=2.3, normalY≈0.402
      { w: 280, depth: 1550, dropY:  -460 },  // outerX=200, bankRatio=2.3, normalY≈0.402
    ],
    padLens: [380, 310, 295, 305, 480], spawnY: 0,
    curvedSections: [
      { afterPad: 0, radius: 490, angle: -0.52, width: 295, height: 22 },
      { afterPad: 1, radius: 470, angle:  0.50, width: 275, height: 22 },
      { afterPad: 2, radius: 450, angle: -0.48, width: 258, height: 22 },
    ],
  },


  // ═══════════════════════════════════════════════════════════════════════════
  // INTERMEDIATE (map09–16) — bankRatio 2.6–3.4, width 200–280, 5-7 sections
  // ═══════════════════════════════════════════════════════════════════════════

  {
    // outerX: 195, 187, 182, 177, 170, 162  bankRatio 2.6–2.8, 6 sections S-curve
    id: 'map_09', name: 'Gorge', difficulty: DIFFICULTY.INTERMEDIATE,
    knifeId: 'knife_gorge', paletteKey: 'gorge',
    bankRatio: 2.7,
    desc: 'Orange gorge — kitsune-style alternating S-curves demand precise air control.',
    sections: [
      { w: 270, depth: 1800, dropY:  -527 },  // outerX=195, bankRatio=2.7, normalY≈0.347
      { w: 254, depth: 2000, dropY:  -505 },  // outerX=187, bankRatio=2.7, normalY≈0.347
      { w: 244, depth: 2100, dropY:  -491 },  // outerX=182, bankRatio=2.7, normalY≈0.347
      { w: 234, depth: 2000, dropY:  -478 },  // outerX=177, bankRatio=2.7, normalY≈0.347
      { w: 220, depth: 1900, dropY:  -459 },  // outerX=170, bankRatio=2.7, normalY≈0.347
      { w: 204, depth: 1800, dropY:  -437 },  // outerX=162, bankRatio=2.7, normalY≈0.347
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
    // outerX: 192, 185, 180, 174, 167, 160  bankRatio 2.8 — long canyon sections
    id: 'map_10', name: 'Canyon', difficulty: DIFFICULTY.INTERMEDIATE,
    knifeId: 'knife_canyon', paletteKey: 'canyon',
    bankRatio: 2.8,
    desc: 'Rocky canyon walls with long sweeping ramps — pure speed build.',
    sections: [
      { w: 264, depth: 2000, dropY:  -538 },  // outerX=192, bankRatio=2.8, normalY≈0.337
      { w: 250, depth: 2200, dropY:  -518 },  // outerX=185, bankRatio=2.8, normalY≈0.337
      { w: 240, depth: 2300, dropY:  -504 },  // outerX=180, bankRatio=2.8, normalY≈0.337
      { w: 228, depth: 2100, dropY:  -487 },  // outerX=174, bankRatio=2.8, normalY≈0.337
      { w: 214, depth: 2000, dropY:  -468 },  // outerX=167, bankRatio=2.8, normalY≈0.337
      { w: 200, depth: 1900, dropY:  -448 },  // outerX=160, bankRatio=2.8, normalY≈0.337
    ],
    padLens: [270, 235, 225, 225, 225, 230, 370], spawnY: 0,
    curvedSections: [
      { afterPad: 0, radius: 370, angle: -0.72, width: 232, height: 20 },
      { afterPad: 2, radius: 350, angle:  0.70, width: 210, height: 20 },
      { afterPad: 4, radius: 330, angle: -0.68, width: 190, height: 20 },
    ],
  },

  {
    // outerX: 190, 184, 179, 173, 166, 160  bankRatio 2.9
    id: 'map_11', name: 'Ravine', difficulty: DIFFICULTY.INTERMEDIATE,
    knifeId: 'knife_ravine', paletteKey: 'ravine',
    bankRatio: 2.9,
    desc: 'Lime-green ravine — aircontrol-inspired speed map with wide open ramps.',
    sections: [
      { w: 260, depth: 1900, dropY:  -551 },  // outerX=190, bankRatio=2.9, normalY≈0.327
      { w: 248, depth: 2100, dropY:  -534 },  // outerX=184, bankRatio=2.9, normalY≈0.327
      { w: 238, depth: 2200, dropY:  -519 },  // outerX=179, bankRatio=2.9, normalY≈0.327
      { w: 226, depth: 2100, dropY:  -502 },  // outerX=173, bankRatio=2.9, normalY≈0.327
      { w: 212, depth: 2000, dropY:  -481 },  // outerX=166, bankRatio=2.9, normalY≈0.327
      { w: 200, depth: 1900, dropY:  -464 },  // outerX=160, bankRatio=2.9, normalY≈0.327
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
    // outerX: 194, 187, 181, 176, 169, 162, 156  bankRatio 3.0 — 7 sections
    id: 'map_12', name: 'Chasm', difficulty: DIFFICULTY.INTERMEDIATE,
    knifeId: 'knife_chasm', paletteKey: 'chasm',
    bankRatio: 3.0,
    desc: 'Deep blue chasm — seven sections with increasing steepness.',
    sections: [
      { w: 268, depth: 1850, dropY:  -582 },  // outerX=194, bankRatio=3.0, normalY≈0.316
      { w: 254, depth: 2000, dropY:  -561 },  // outerX=187, bankRatio=3.0, normalY≈0.316
      { w: 242, depth: 2150, dropY:  -543 },  // outerX=181, bankRatio=3.0, normalY≈0.316
      { w: 232, depth: 2100, dropY:  -528 },  // outerX=176, bankRatio=3.0, normalY≈0.316
      { w: 218, depth: 2000, dropY:  -507 },  // outerX=169, bankRatio=3.0, normalY≈0.316
      { w: 204, depth: 1900, dropY:  -486 },  // outerX=162, bankRatio=3.0, normalY≈0.316
      { w: 192, depth: 1800, dropY:  -468 },  // outerX=156, bankRatio=3.0, normalY≈0.316
    ],
    padLens: [260, 230, 220, 215, 215, 220, 220, 360], spawnY: 0,
    curvedSections: [
      { afterPad: 0, radius: 360, angle: -0.70, width: 235, height: 20 },
      { afterPad: 2, radius: 340, angle:  0.68, width: 212, height: 20 },
      { afterPad: 4, radius: 322, angle: -0.65, width: 192, height: 20 },
    ],
  },

  {
    // outerX: 189, 182, 177, 171, 164, 158  bankRatio 3.1
    id: 'map_13', name: 'Abyss', difficulty: DIFFICULTY.INTERMEDIATE,
    knifeId: 'knife_abyss', paletteKey: 'abyss',
    bankRatio: 3.1,
    desc: 'Absolute darkness with neon-pink edges — disorienting and fast.',
    sections: [
      { w: 258, depth: 1900, dropY:  -586 },  // outerX=189, bankRatio=3.1, normalY≈0.307
      { w: 244, depth: 2050, dropY:  -564 },  // outerX=182, bankRatio=3.1, normalY≈0.307
      { w: 234, depth: 2200, dropY:  -549 },  // outerX=177, bankRatio=3.1, normalY≈0.307
      { w: 222, depth: 2100, dropY:  -530 },  // outerX=171, bankRatio=3.1, normalY≈0.307
      { w: 208, depth: 2000, dropY:  -508 },  // outerX=164, bankRatio=3.1, normalY≈0.307
      { w: 196, depth: 1900, dropY:  -490 },  // outerX=158, bankRatio=3.1, normalY≈0.307
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
    // outerX: 191, 184, 179, 173, 167, 161  bankRatio 3.2
    id: 'map_14', name: 'Ridge', difficulty: DIFFICULTY.INTERMEDIATE,
    knifeId: 'knife_ridge', paletteKey: 'ridge',
    bankRatio: 3.2,
    desc: 'Lavender ridge — long diagonal runs with late-breaking tight turns.',
    sections: [
      { w: 262, depth: 2000, dropY:  -611 },  // outerX=191, bankRatio=3.2, normalY≈0.298
      { w: 248, depth: 2200, dropY:  -589 },  // outerX=184, bankRatio=3.2, normalY≈0.298
      { w: 238, depth: 2150, dropY:  -573 },  // outerX=179, bankRatio=3.2, normalY≈0.298
      { w: 226, depth: 2050, dropY:  -554 },  // outerX=173, bankRatio=3.2, normalY≈0.298
      { w: 214, depth: 1950, dropY:  -534 },  // outerX=167, bankRatio=3.2, normalY≈0.298
      { w: 202, depth: 1850, dropY:  -515 },  // outerX=161, bankRatio=3.2, normalY≈0.298
    ],
    padLens: [258, 228, 218, 215, 215, 218, 360], spawnY: 0,
    curvedSections: [
      { afterPad: 0, radius: 358, angle: -0.68, width: 228, height: 20 },
      { afterPad: 2, radius: 338, angle:  0.70, width: 206, height: 20 },
      { afterPad: 4, radius: 320, angle: -0.72, width: 188, height: 20 },
    ],
  },

  {
    // outerX: 187, 181, 176, 170, 163, 157  bankRatio 3.3
    id: 'map_15', name: 'Summit', difficulty: DIFFICULTY.INTERMEDIATE,
    knifeId: 'knife_summit', paletteKey: 'summit',
    bankRatio: 3.3,
    desc: 'White blizzard — high-altitude surf where visibility and speed test focus.',
    sections: [
      { w: 254, depth: 1950, dropY:  -617 },  // outerX=187, bankRatio=3.3, normalY≈0.290
      { w: 242, depth: 2100, dropY:  -597 },  // outerX=181, bankRatio=3.3, normalY≈0.290
      { w: 232, depth: 2200, dropY:  -581 },  // outerX=176, bankRatio=3.3, normalY≈0.290
      { w: 220, depth: 2100, dropY:  -561 },  // outerX=170, bankRatio=3.3, normalY≈0.290
      { w: 206, depth: 2000, dropY:  -538 },  // outerX=163, bankRatio=3.3, normalY≈0.290
      { w: 194, depth: 1900, dropY:  -518 },  // outerX=157, bankRatio=3.3, normalY≈0.290
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
    // outerX: 190, 182, 177, 172, 166, 160, 154  bankRatio 3.4 — 7 sections
    id: 'map_16', name: 'Peak', difficulty: DIFFICULTY.INTERMEDIATE,
    knifeId: 'knife_peak', paletteKey: 'peak',
    bankRatio: 3.4,
    desc: 'Cyan ice at the summit — seven sections, each demanding clean arc entries.',
    sections: [
      { w: 260, depth: 1900, dropY:  -646 },  // outerX=190, bankRatio=3.4, normalY≈0.283
      { w: 244, depth: 2100, dropY:  -619 },  // outerX=182, bankRatio=3.4, normalY≈0.283
      { w: 234, depth: 2200, dropY:  -602 },  // outerX=177, bankRatio=3.4, normalY≈0.283
      { w: 224, depth: 2100, dropY:  -585 },  // outerX=172, bankRatio=3.4, normalY≈0.283
      { w: 212, depth: 2000, dropY:  -564 },  // outerX=166, bankRatio=3.4, normalY≈0.283
      { w: 200, depth: 1900, dropY:  -544 },  // outerX=160, bankRatio=3.4, normalY≈0.283
      { w: 188, depth: 1800, dropY:  -524 },  // outerX=154, bankRatio=3.4, normalY≈0.283
    ],
    padLens: [255, 225, 215, 210, 210, 215, 215, 350], spawnY: 0,
    curvedSections: [
      { afterPad: 0, radius: 355, angle: -0.72, width: 225, height: 20 },
      { afterPad: 2, radius: 335, angle:  0.70, width: 205, height: 20 },
      { afterPad: 4, radius: 315, angle: -0.68, width: 185, height: 20 },
    ],
  },


  // ═══════════════════════════════════════════════════════════════════════════
  // ADVANCED (map17–24) — bankRatio 3.5–4.5, width 140–240, 6-9 sections
  // ═══════════════════════════════════════════════════════════════════════════

  {
    // outerX: 170, 164, 160, 155, 150, 144, 138, 133  bankRatio 3.5 — 8 sections
    id: 'map_17', name: 'Storm', difficulty: DIFFICULTY.ADVANCED,
    knifeId: 'knife_storm', paletteKey: 'storm',
    bankRatio: 3.5,
    desc: 'Yellow lightning — mesa-style long runs with violent mid-section S-curves.',
    sections: [
      { w: 220, depth: 2400, dropY:  -595 },  // outerX=170, bankRatio=3.5, normalY≈0.274
      { w: 208, depth: 2600, dropY:  -574 },  // outerX=164, bankRatio=3.5, normalY≈0.274
      { w: 200, depth: 2800, dropY:  -560 },  // outerX=160, bankRatio=3.5, normalY≈0.274
      { w: 190, depth: 2600, dropY:  -543 },  // outerX=155, bankRatio=3.5, normalY≈0.274
      { w: 180, depth: 2400, dropY:  -525 },  // outerX=150, bankRatio=3.5, normalY≈0.274
      { w: 168, depth: 2200, dropY:  -504 },  // outerX=144, bankRatio=3.5, normalY≈0.274
      { w: 156, depth: 2000, dropY:  -483 },  // outerX=138, bankRatio=3.5, normalY≈0.274
      { w: 146, depth: 1800, dropY:  -466 },  // outerX=133, bankRatio=3.5, normalY≈0.274
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
    // outerX: 167, 162, 157, 152, 147, 141, 136  bankRatio 3.7 — 7 sections
    id: 'map_18', name: 'Tempest', difficulty: DIFFICULTY.ADVANCED,
    knifeId: 'knife_tempest', paletteKey: 'tempest',
    bankRatio: 3.7,
    desc: 'Ocean tempest — alternating high-amplitude S-curves through crashing waves.',
    sections: [
      { w: 214, depth: 2300, dropY:  -618 },  // outerX=167, bankRatio=3.7, normalY≈0.261
      { w: 204, depth: 2500, dropY:  -599 },  // outerX=162, bankRatio=3.7, normalY≈0.261
      { w: 194, depth: 2700, dropY:  -581 },  // outerX=157, bankRatio=3.7, normalY≈0.261
      { w: 184, depth: 2500, dropY:  -562 },  // outerX=152, bankRatio=3.7, normalY≈0.261
      { w: 174, depth: 2300, dropY:  -544 },  // outerX=147, bankRatio=3.7, normalY≈0.261
      { w: 162, depth: 2100, dropY:  -522 },  // outerX=141, bankRatio=3.7, normalY≈0.261
      { w: 152, depth: 1900, dropY:  -503 },  // outerX=136, bankRatio=3.7, normalY≈0.261
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
    // outerX: 166, 160, 156, 151, 146, 140, 135, 130  bankRatio 3.8 — 8 sections
    id: 'map_19', name: 'Gale', difficulty: DIFFICULTY.ADVANCED,
    knifeId: 'knife_gale', paletteKey: 'gale',
    bankRatio: 3.8,
    desc: 'Scorching desert gale — red-pink ramps with zero margin for error on edges.',
    sections: [
      { w: 212, depth: 2350, dropY:  -631 },  // outerX=166, bankRatio=3.8, normalY≈0.254
      { w: 200, depth: 2550, dropY:  -608 },  // outerX=160, bankRatio=3.8, normalY≈0.254
      { w: 192, depth: 2750, dropY:  -593 },  // outerX=156, bankRatio=3.8, normalY≈0.254
      { w: 182, depth: 2550, dropY:  -574 },  // outerX=151, bankRatio=3.8, normalY≈0.254
      { w: 172, depth: 2350, dropY:  -555 },  // outerX=146, bankRatio=3.8, normalY≈0.254
      { w: 160, depth: 2150, dropY:  -532 },  // outerX=140, bankRatio=3.8, normalY≈0.254
      { w: 150, depth: 1950, dropY:  -513 },  // outerX=135, bankRatio=3.8, normalY≈0.254
      { w: 140, depth: 1750, dropY:  -494 },  // outerX=130, bankRatio=3.8, normalY≈0.254
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
    // outerX: 169, 163, 158, 153, 148, 142, 137  bankRatio 3.9 — 7 sections
    id: 'map_20', name: 'Squall', difficulty: DIFFICULTY.ADVANCED,
    knifeId: 'knife_squall', paletteKey: 'squall',
    bankRatio: 3.9,
    desc: 'Tropical squall — rapid green ramps with sudden tight 90° banked walls.',
    sections: [
      { w: 218, depth: 2250, dropY:  -659 },  // outerX=169, bankRatio=3.9, normalY≈0.248
      { w: 206, depth: 2450, dropY:  -636 },  // outerX=163, bankRatio=3.9, normalY≈0.248
      { w: 196, depth: 2650, dropY:  -616 },  // outerX=158, bankRatio=3.9, normalY≈0.248
      { w: 186, depth: 2450, dropY:  -597 },  // outerX=153, bankRatio=3.9, normalY≈0.248
      { w: 176, depth: 2250, dropY:  -577 },  // outerX=148, bankRatio=3.9, normalY≈0.248
      { w: 164, depth: 2050, dropY:  -554 },  // outerX=142, bankRatio=3.9, normalY≈0.248
      { w: 154, depth: 1850, dropY:  -534 },  // outerX=137, bankRatio=3.9, normalY≈0.248
    ],
    padLens: [228, 208, 198, 196, 196, 196, 196, 316], spawnY: 0,
    curvedSections: [
      { afterPad: 0, radius: 298, angle: -0.80, width: 186, height: 18 },
      { afterPad: 2, radius: 280, angle:  0.82, width: 164, height: 18 },
      { afterPad: 4, radius: 264, angle: -0.80, width: 150, height: 18 },
    ],
  },

  {
    // outerX: 165, 159, 155, 150, 145, 139, 134, 129  bankRatio 4.0 — 8 sections
    id: 'map_21', name: 'Cyclone', difficulty: DIFFICULTY.ADVANCED,
    knifeId: 'knife_cyclone', paletteKey: 'cyclone',
    bankRatio: 4.0,
    desc: 'Purple cyclone — eight-section tour de force with spiraling difficulty.',
    sections: [
      { w: 210, depth: 2300, dropY:  -660 },  // outerX=165, bankRatio=4.0, normalY≈0.243
      { w: 198, depth: 2500, dropY:  -636 },  // outerX=159, bankRatio=4.0, normalY≈0.243
      { w: 190, depth: 2700, dropY:  -620 },  // outerX=155, bankRatio=4.0, normalY≈0.243
      { w: 180, depth: 2500, dropY:  -600 },  // outerX=150, bankRatio=4.0, normalY≈0.243
      { w: 170, depth: 2300, dropY:  -580 },  // outerX=145, bankRatio=4.0, normalY≈0.243
      { w: 158, depth: 2100, dropY:  -556 },  // outerX=139, bankRatio=4.0, normalY≈0.243
      { w: 148, depth: 1900, dropY:  -536 },  // outerX=134, bankRatio=4.0, normalY≈0.243
      { w: 138, depth: 1700, dropY:  -516 },  // outerX=129, bankRatio=4.0, normalY≈0.243
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
    // outerX: 164, 158, 154, 149, 143, 138, 133  bankRatio 4.1
    id: 'map_22', name: 'Vortex', difficulty: DIFFICULTY.ADVANCED,
    knifeId: 'knife_vortex', paletteKey: 'vortex',
    bankRatio: 4.1,
    desc: 'Orange vortex — fast downward spiral, each ramp faster than the last.',
    sections: [
      { w: 208, depth: 2200, dropY:  -672 },  // outerX=164, bankRatio=4.1, normalY≈0.237
      { w: 196, depth: 2400, dropY:  -648 },  // outerX=158, bankRatio=4.1, normalY≈0.237
      { w: 188, depth: 2600, dropY:  -631 },  // outerX=154, bankRatio=4.1, normalY≈0.237
      { w: 178, depth: 2400, dropY:  -611 },  // outerX=149, bankRatio=4.1, normalY≈0.237
      { w: 166, depth: 2200, dropY:  -587 },  // outerX=143, bankRatio=4.1, normalY≈0.237
      { w: 156, depth: 2000, dropY:  -566 },  // outerX=138, bankRatio=4.1, normalY≈0.237
      { w: 146, depth: 1800, dropY:  -545 },  // outerX=133, bankRatio=4.1, normalY≈0.237
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
    // outerX: 162, 157, 153, 148, 143, 137, 132, 127  bankRatio 4.3 — 8 sections
    id: 'map_23', name: 'Maelstrom', difficulty: DIFFICULTY.ADVANCED,
    knifeId: 'knife_maelstrom', paletteKey: 'maelstrom',
    bankRatio: 4.3,
    desc: 'Blue maelstrom — crushing downward pull; curves tighten near the end.',
    sections: [
      { w: 204, depth: 2350, dropY:  -697 },  // outerX=162, bankRatio=4.3, normalY≈0.227
      { w: 194, depth: 2550, dropY:  -675 },  // outerX=157, bankRatio=4.3, normalY≈0.227
      { w: 186, depth: 2750, dropY:  -658 },  // outerX=153, bankRatio=4.3, normalY≈0.227
      { w: 176, depth: 2550, dropY:  -636 },  // outerX=148, bankRatio=4.3, normalY≈0.227
      { w: 166, depth: 2350, dropY:  -615 },  // outerX=143, bankRatio=4.3, normalY≈0.227
      { w: 154, depth: 2150, dropY:  -589 },  // outerX=137, bankRatio=4.3, normalY≈0.227
      { w: 144, depth: 1950, dropY:  -568 },  // outerX=132, bankRatio=4.3, normalY≈0.227
      { w: 134, depth: 1750, dropY:  -547 },  // outerX=127, bankRatio=4.3, normalY≈0.227
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
    // outerX: 161, 155, 151, 146, 141, 135, 130, 125  bankRatio 4.5 — 8 sections
    id: 'map_24', name: 'Typhoon', difficulty: DIFFICULTY.ADVANCED,
    knifeId: 'knife_typhoon', paletteKey: 'typhoon',
    bankRatio: 4.5,
    desc: 'Magenta typhoon — eight brutal sections, the hardest advanced map.',
    sections: [
      { w: 202, depth: 2280, dropY:  -725 },  // outerX=161, bankRatio=4.5, normalY≈0.217
      { w: 190, depth: 2480, dropY:  -698 },  // outerX=155, bankRatio=4.5, normalY≈0.217
      { w: 182, depth: 2680, dropY:  -680 },  // outerX=151, bankRatio=4.5, normalY≈0.217
      { w: 172, depth: 2480, dropY:  -657 },  // outerX=146, bankRatio=4.5, normalY≈0.217
      { w: 162, depth: 2280, dropY:  -635 },  // outerX=141, bankRatio=4.5, normalY≈0.217
      { w: 150, depth: 2080, dropY:  -608 },  // outerX=135, bankRatio=4.5, normalY≈0.217
      { w: 140, depth: 1880, dropY:  -585 },  // outerX=130, bankRatio=4.5, normalY≈0.217
      { w: 130, depth: 1680, dropY:  -563 },  // outerX=125, bankRatio=4.5, normalY≈0.217
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
  // EXPERT (map25–32) — bankRatio 4.6–6.0, width 140–210, 7-11 sections
  // ═══════════════════════════════════════════════════════════════════════════

  {
    // outerX: 149, 143, 139, 134, 129, 124, 119, 114, 109  bankRatio 4.6 — 9 sections
    id: 'map_25', name: 'Void', difficulty: DIFFICULTY.EXPERT,
    knifeId: 'knife_void', paletteKey: 'void',
    bankRatio: 4.6,
    desc: 'Red void — nine sections of relentless dropping. No recovery pads wide enough to rest.',
    sections: [
      { w: 178, depth: 2800, dropY:  -685 },  // outerX=149, bankRatio=4.6, normalY≈0.210
      { w: 166, depth: 3000, dropY:  -658 },  // outerX=143, bankRatio=4.6, normalY≈0.210
      { w: 158, depth: 3200, dropY:  -640 },  // outerX=139, bankRatio=4.6, normalY≈0.210
      { w: 148, depth: 3000, dropY:  -616 },  // outerX=134, bankRatio=4.6, normalY≈0.210
      { w: 138, depth: 2800, dropY:  -593 },  // outerX=129, bankRatio=4.6, normalY≈0.210
      { w: 128, depth: 2600, dropY:  -570 },  // outerX=124, bankRatio=4.6, normalY≈0.210
      { w: 118, depth: 2400, dropY:  -547 },  // outerX=119, bankRatio=4.6, normalY≈0.210
      { w: 108, depth: 2200, dropY:  -524 },  // outerX=114, bankRatio=4.6, normalY≈0.210
      { w: 98,  depth: 2000, dropY:  -501 },  // outerX=109, bankRatio=4.6, normalY≈0.210
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
    // outerX: 146, 140, 136, 131, 126, 121, 116, 112, 107  bankRatio 4.8 — 9 sections
    id: 'map_26', name: 'Null', difficulty: DIFFICULTY.EXPERT,
    knifeId: 'knife_null', paletteKey: 'null',
    bankRatio: 4.8,
    desc: 'Teal edges in pitch darkness — trust the geometry, not your eyes.',
    sections: [
      { w: 172, depth: 2850, dropY:  -701 },  // outerX=146, bankRatio=4.8, normalY≈0.204
      { w: 160, depth: 3050, dropY:  -672 },  // outerX=140, bankRatio=4.8, normalY≈0.204
      { w: 152, depth: 3250, dropY:  -653 },  // outerX=136, bankRatio=4.8, normalY≈0.204
      { w: 142, depth: 3050, dropY:  -629 },  // outerX=131, bankRatio=4.8, normalY≈0.204
      { w: 132, depth: 2850, dropY:  -605 },  // outerX=126, bankRatio=4.8, normalY≈0.204
      { w: 122, depth: 2650, dropY:  -581 },  // outerX=121, bankRatio=4.8, normalY≈0.204
      { w: 112, depth: 2450, dropY:  -557 },  // outerX=116, bankRatio=4.8, normalY≈0.204
      { w: 104, depth: 2250, dropY:  -538 },  // outerX=112, bankRatio=4.8, normalY≈0.204
      { w:  94, depth: 2050, dropY:  -514 },  // outerX=107, bankRatio=4.8, normalY≈0.204
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
    // outerX: 145, 139, 135, 130, 125, 120, 115, 110, 105  bankRatio 5.0 — 9 sections
    id: 'map_27', name: 'Zenith', difficulty: DIFFICULTY.EXPERT,
    knifeId: 'knife_zenith', paletteKey: 'zenith',
    bankRatio: 5.0,
    desc: 'Lavender at existence\'s limit — curves that punish any angle deviation.',
    sections: [
      { w: 170, depth: 2900, dropY:  -725 },  // outerX=145, bankRatio=5.0, normalY≈0.196
      { w: 158, depth: 3100, dropY:  -695 },  // outerX=139, bankRatio=5.0, normalY≈0.196
      { w: 150, depth: 3300, dropY:  -675 },  // outerX=135, bankRatio=5.0, normalY≈0.196
      { w: 140, depth: 3100, dropY:  -650 },  // outerX=130, bankRatio=5.0, normalY≈0.196
      { w: 130, depth: 2900, dropY:  -625 },  // outerX=125, bankRatio=5.0, normalY≈0.196
      { w: 120, depth: 2700, dropY:  -600 },  // outerX=120, bankRatio=5.0, normalY≈0.196
      { w: 110, depth: 2500, dropY:  -575 },  // outerX=115, bankRatio=5.0, normalY≈0.196
      { w: 100, depth: 2300, dropY:  -550 },  // outerX=110, bankRatio=5.0, normalY≈0.196
      { w:  90, depth: 2100, dropY:  -525 },  // outerX=105, bankRatio=5.0, normalY≈0.196
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
    // outerX: 142, 137, 133, 128, 123, 118, 113, 108, 103, 98  bankRatio 5.1 — 10 sections
    id: 'map_28', name: 'Apex', difficulty: DIFFICULTY.EXPERT,
    knifeId: 'knife_apex', paletteKey: 'apex',
    bankRatio: 5.1,
    desc: 'Orange-red pinnacle — ten sections that filter pros from legends.',
    sections: [
      { w: 164, depth: 2950, dropY:  -724 },  // outerX=142, bankRatio=5.1, normalY≈0.192
      { w: 154, depth: 3150, dropY:  -699 },  // outerX=137, bankRatio=5.1, normalY≈0.192
      { w: 146, depth: 3350, dropY:  -679 },  // outerX=133, bankRatio=5.1, normalY≈0.192
      { w: 136, depth: 3150, dropY:  -653 },  // outerX=128, bankRatio=5.1, normalY≈0.192
      { w: 126, depth: 2950, dropY:  -628 },  // outerX=123, bankRatio=5.1, normalY≈0.192
      { w: 116, depth: 2750, dropY:  -602 },  // outerX=118, bankRatio=5.1, normalY≈0.192
      { w: 106, depth: 2550, dropY:  -577 },  // outerX=113, bankRatio=5.1, normalY≈0.192
      { w:  96, depth: 2350, dropY:  -551 },  // outerX=108, bankRatio=5.1, normalY≈0.192
      { w:  86, depth: 2150, dropY:  -526 },  // outerX=103, bankRatio=5.1, normalY≈0.192
      { w:  76, depth: 1950, dropY:  -500 },  // outerX=98,  bankRatio=5.1, normalY≈0.192
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
    // outerX: 141, 135, 131, 126, 121, 116, 112, 107, 102  bankRatio 5.2 — 9 sections
    id: 'map_29', name: 'Omega', difficulty: DIFFICULTY.EXPERT,
    knifeId: 'knife_omega', paletteKey: 'omega',
    bankRatio: 5.2,
    desc: 'Green final descent — last omega-level map before absolute maps.',
    sections: [
      { w: 162, depth: 2950, dropY:  -733 },  // outerX=141, bankRatio=5.2, normalY≈0.189
      { w: 150, depth: 3150, dropY:  -702 },  // outerX=135, bankRatio=5.2, normalY≈0.189
      { w: 142, depth: 3350, dropY:  -681 },  // outerX=131, bankRatio=5.2, normalY≈0.189
      { w: 132, depth: 3150, dropY:  -655 },  // outerX=126, bankRatio=5.2, normalY≈0.189
      { w: 122, depth: 2950, dropY:  -629 },  // outerX=121, bankRatio=5.2, normalY≈0.189
      { w: 112, depth: 2750, dropY:  -603 },  // outerX=116, bankRatio=5.2, normalY≈0.189
      { w: 104, depth: 2550, dropY:  -582 },  // outerX=112, bankRatio=5.2, normalY≈0.189
      { w:  94, depth: 2350, dropY:  -556 },  // outerX=107, bankRatio=5.2, normalY≈0.189
      { w:  84, depth: 2150, dropY:  -530 },  // outerX=102, bankRatio=5.2, normalY≈0.189
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
    // outerX: 139, 133, 129, 124, 119, 114, 110, 105, 100, 95  bankRatio 5.4 — 10 sections
    id: 'map_30', name: 'Sigma', difficulty: DIFFICULTY.EXPERT,
    knifeId: 'knife_sigma', paletteKey: 'sigma',
    bankRatio: 5.4,
    desc: 'Pink-magenta — sigma-level geometry requires inhuman consistency.',
    sections: [
      { w: 158, depth: 3000, dropY:  -751 },  // outerX=139, bankRatio=5.4, normalY≈0.182
      { w: 146, depth: 3200, dropY:  -718 },  // outerX=133, bankRatio=5.4, normalY≈0.182
      { w: 138, depth: 3400, dropY:  -697 },  // outerX=129, bankRatio=5.4, normalY≈0.182
      { w: 128, depth: 3200, dropY:  -670 },  // outerX=124, bankRatio=5.4, normalY≈0.182
      { w: 118, depth: 3000, dropY:  -643 },  // outerX=119, bankRatio=5.4, normalY≈0.182
      { w: 108, depth: 2800, dropY:  -616 },  // outerX=114, bankRatio=5.4, normalY≈0.182
      { w: 100, depth: 2600, dropY:  -594 },  // outerX=110, bankRatio=5.4, normalY≈0.182
      { w:  90, depth: 2400, dropY:  -567 },  // outerX=105, bankRatio=5.4, normalY≈0.182
      { w:  80, depth: 2200, dropY:  -540 },  // outerX=100, bankRatio=5.4, normalY≈0.182
      { w:  70, depth: 2000, dropY:  -513 },  // outerX=95,  bankRatio=5.4, normalY≈0.182
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
    // outerX: 137, 132, 128, 123, 118, 113, 108, 103, 98, 93  bankRatio 5.6 — 10 sections
    id: 'map_31', name: 'Prime', difficulty: DIFFICULTY.EXPERT,
    knifeId: 'knife_prime', paletteKey: 'prime',
    bankRatio: 5.6,
    desc: 'Blue prime — ten sections of near-vertical surfing above the abyss.',
    sections: [
      { w: 154, depth: 3050, dropY:  -767 },  // outerX=137, bankRatio=5.6, normalY≈0.176
      { w: 144, depth: 3250, dropY:  -739 },  // outerX=132, bankRatio=5.6, normalY≈0.176
      { w: 136, depth: 3450, dropY:  -717 },  // outerX=128, bankRatio=5.6, normalY≈0.176
      { w: 126, depth: 3250, dropY:  -689 },  // outerX=123, bankRatio=5.6, normalY≈0.176
      { w: 116, depth: 3050, dropY:  -661 },  // outerX=118, bankRatio=5.6, normalY≈0.176
      { w: 106, depth: 2850, dropY:  -633 },  // outerX=113, bankRatio=5.6, normalY≈0.176
      { w:  96, depth: 2650, dropY:  -605 },  // outerX=108, bankRatio=5.6, normalY≈0.176
      { w:  86, depth: 2450, dropY:  -577 },  // outerX=103, bankRatio=5.6, normalY≈0.176
      { w:  76, depth: 2250, dropY:  -549 },  // outerX=98,  bankRatio=5.6, normalY≈0.176
      { w:  66, depth: 2050, dropY:  -521 },  // outerX=93,  bankRatio=5.6, normalY≈0.176
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
    // outerX: 135, 129, 125, 120, 115, 110, 106, 102, 98, 94, 90  bankRatio 5.8 — 11 sections
    id: 'map_32', name: 'Absolute', difficulty: DIFFICULTY.EXPERT,
    knifeId: 'knife_absolute', paletteKey: 'absolute',
    bankRatio: 5.8,
    desc: 'Gold on black — the absolute final map. Eleven sections of perfection or nothing.',
    sections: [
      { w: 150, depth: 3100, dropY:  -783 },  // outerX=135, bankRatio=5.8, normalY≈0.170
      { w: 138, depth: 3300, dropY:  -748 },  // outerX=129, bankRatio=5.8, normalY≈0.170
      { w: 130, depth: 3500, dropY:  -725 },  // outerX=125, bankRatio=5.8, normalY≈0.170
      { w: 120, depth: 3300, dropY:  -696 },  // outerX=120, bankRatio=5.8, normalY≈0.170
      { w: 110, depth: 3100, dropY:  -667 },  // outerX=115, bankRatio=5.8, normalY≈0.170
      { w: 100, depth: 2900, dropY:  -638 },  // outerX=110, bankRatio=5.8, normalY≈0.170
      { w:  92, depth: 2700, dropY:  -615 },  // outerX=106, bankRatio=5.8, normalY≈0.170
      { w:  84, depth: 2500, dropY:  -592 },  // outerX=102, bankRatio=5.8, normalY≈0.170
      { w:  76, depth: 2300, dropY:  -568 },  // outerX=98,  bankRatio=5.8, normalY≈0.170
      { w:  68, depth: 2100, dropY:  -545 },  // outerX=94,  bankRatio=5.8, normalY≈0.170
      { w:  60, depth: 1900, dropY:  -522 },  // outerX=90,  bankRatio=5.8, normalY≈0.170
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
