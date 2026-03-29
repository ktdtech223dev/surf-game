/**
 * ProceduralMapGen.js — Seeded deterministic map generator
 * Seeds: daily = YYYYMMDD, weekly = YYYY_WW
 * Generates surf maps with 2–4 ramp sections + platforms
 */
import * as THREE from 'three';
import { makeMat, makeEdgeMat, buildGate } from './ArtStyle.js';

// ── Seeded RNG (mulberry32) ───────────────────────────────────────────────────
function mulberry32(seed) {
  let s = seed >>> 0;
  return {
    next() {
      s |= 0; s = s + 0x6D2B79F5 | 0;
      let t = Math.imul(s ^ s >>> 15, 1 | s);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    },
    range(lo, hi) { return lo + this.next() * (hi - lo); },
    int(lo, hi)   { return Math.floor(this.range(lo, hi + 1)); },
    pick(arr)     { return arr[this.int(0, arr.length - 1)]; },
  };
}

function dailySeed() {
  const d = new Date();
  return parseInt(`${d.getUTCFullYear()}${String(d.getUTCMonth()+1).padStart(2,'0')}${String(d.getUTCDate()).padStart(2,'0')}`, 10);
}

function weeklySeed() {
  const now = Date.now();
  // ISO week number
  const d   = new Date(now);
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  return parseInt(`${d.getUTCFullYear()}${String(week).padStart(2,'0')}`, 10);
}

// ── Ramp section generator ────────────────────────────────────────────────────
const RAMP_COLORS = [
  [0x0a2a4a, 0x1e90ff],
  [0x0a3a1a, 0x22c55e],
  [0x3a0a0a, 0xff4444],
  [0x2a1a00, 0xffaa00],
  [0x1a0a3a, 0xaa44ff],
  [0x003a3a, 0x00ffcc],
];

/**
 * Generate a procedural map and add its geometry to `scene`.
 * Returns MAP descriptor identical in shape to MapBuilder's MAP export.
 */
export function generateProceduralMap(scene, seed) {
  const rng = mulberry32(seed);

  // Clear previous procedural objects
  const toRemove = [];
  scene.traverse(obj => { if (obj.userData.procedural) toRemove.push(obj); });
  toRemove.forEach(obj => scene.remove(obj));

  const sectionCount = rng.int(2, 4);
  const sections     = [];
  let curZ = 200; // start after spawn pad
  let curY = 0;

  // Spawn pad
  _addPad(scene, 0, curY, curZ - 200, 600, 20, 300, rng);

  for (let s = 0; s < sectionCount; s++) {
    const [rampColor, edgeColor] = rng.pick(RAMP_COLORS);
    const width      = rng.range(200, 350);
    const depth      = rng.range(600, 1400);
    const angle      = rng.range(0.28, 0.52); // radians
    const dropPerSection = Math.sin(angle) * depth;
    const startZ    = curZ;
    const endZ      = curZ + depth;
    const endY      = curY - dropPerSection;

    // Left ramp
    const leftMesh = _makeRamp(rng, width, depth, angle, rampColor, edgeColor, 'left');
    leftMesh.position.set(-width / 2 - rng.range(0, 40), curY - dropPerSection / 2, curZ + depth / 2);
    scene.add(leftMesh);

    // Right ramp
    const rightMesh = _makeRamp(rng, width, depth, angle, rampColor, edgeColor, 'right');
    rightMesh.position.set(width / 2 + rng.range(0, 40), curY - dropPerSection / 2, curZ + depth / 2);
    scene.add(rightMesh);

    // Ceiling (optional, 60% chance)
    if (rng.next() < 0.6) {
      const ceilMesh = _makeCeiling(rng, width * 2 + 200, depth, rampColor);
      ceilMesh.position.set(0, curY + rng.range(150, 250), curZ + depth / 2);
      scene.add(ceilMesh);
    }

    sections.push({ startZ, endZ, startY: curY, endY });

    curZ = endZ;
    curY = endY;

    // Connector pad
    const padZ = curZ;
    const padLen = rng.range(150, 400);
    _addPad(scene, 0, curY - 10, padZ + padLen / 2, 600, 20, padLen, rng);
    curZ += padLen;
  }

  // Finish gate
  const finishGate = buildGate({ x: 0, y: curY, z: curZ, w: 500, h: 140, color: 0xffd700 });
  finishGate.userData.procedural = true;
  scene.add(finishGate);

  // Skybox / ambient color based on seed
  const palIdx = rng.int(0, RAMP_COLORS.length - 1);
  const skyHex = RAMP_COLORS[palIdx][0];
  scene.background = new THREE.Color(skyHex);
  scene.fog        = new THREE.Fog(skyHex, 600, 2500);

  return {
    FINISH_Z: curZ,
    FINISH_Y: curY,
    SPAWN_Z:  150,
    SPAWN_Y:  0,
    sections,
    seed,
    sectionCount,
  };
}

function _makeRamp(rng, width, depth, angle, color, edgeColor, side) {
  const geo  = new THREE.BoxGeometry(width, 14, depth);
  const mat  = new THREE.MeshLambertMaterial({ color, flatShading: true });
  const mesh = new THREE.Mesh(geo, mat);
  const signX = side === 'left' ? -1 : 1;
  mesh.rotation.set(angle * signX, 0, 0);
  mesh.userData.procedural = true;
  mesh.userData.isRamp     = true;
  const edges = new THREE.LineSegments(new THREE.EdgesGeometry(geo), makeEdgeMat(edgeColor));
  mesh.add(edges);
  return mesh;
}

function _makeCeiling(rng, width, depth, color) {
  const geo  = new THREE.BoxGeometry(width, 12, depth);
  const mat  = new THREE.MeshLambertMaterial({ color: color + 0x101010, flatShading: true });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.userData.procedural = true;
  return mesh;
}

function _addPad(scene, x, y, z, w, h, d, rng) {
  const geo  = new THREE.BoxGeometry(w, h, d);
  const mat  = new THREE.MeshLambertMaterial({ color: 0x080808, flatShading: true });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(x, y, z);
  mesh.userData.procedural = true;
  const edges = new THREE.LineSegments(new THREE.EdgesGeometry(geo), makeEdgeMat(0x222222));
  mesh.add(edges);
  scene.add(mesh);
}

// ── Public seed helpers ───────────────────────────────────────────────────────
export { dailySeed, weeklySeed };

export function getDailyMapId()  { return `daily_${dailySeed()}`; }
export function getWeeklyMapId() { return `weekly_${weeklySeed()}`; }

// ── MapCatalog-format procedural entry ────────────────────────────────────────

// Palette keys must match those defined in ArtStyle.js PALETTE object
const PALETTE_KEYS = [
  'shoreline', 'coastal', 'basin', 'inlet', 'cove', 'bay',
  'gorge', 'canyon', 'ravine', 'chasm', 'abyss', 'ridge',
  'storm', 'tempest', 'gale', 'squall', 'cyclone', 'vortex',
  'void', 'null', 'zenith', 'apex', 'omega', 'sigma',
];

const DIFFICULTIES = ['beginner', 'intermediate', 'advanced', 'expert'];

// Bank ratio ranges per difficulty — matches the physics-correct ranges in MapCatalog
const BANK_RATIO_RANGES = {
  beginner:     { lo: 2.0, hi: 2.5 },
  intermediate: { lo: 2.6, hi: 3.4 },
  advanced:     { lo: 3.5, hi: 4.5 },
  expert:       { lo: 4.6, hi: 6.0 },
};

// Width ranges per difficulty
const WIDTH_RANGES = {
  beginner:     { lo: 280, hi: 380 },
  intermediate: { lo: 200, hi: 280 },
  advanced:     { lo: 140, hi: 220 },
  expert:       { lo: 90,  hi: 180 },
};

/**
 * Returns a MapCatalog-format definition object generated deterministically
 * from the given numeric seed. Compatible with MapFactory._buildFromDef().
 *
 * dropY uses the correct bank-ratio formula:
 *   outerX = w/2 + 60
 *   dropY  = -round(outerX * bankRatio)
 * This guarantees normalY < 0.7 (surfable) for all sections.
 */
export function generateProceduralEntry(seed) {
  const rng = mulberry32(seed);

  const diffIdx   = rng.int(0, DIFFICULTIES.length - 1);
  const diff      = DIFFICULTIES[diffIdx];
  const brrRange  = BANK_RATIO_RANGES[diff];
  const wRange    = WIDTH_RANGES[diff];
  const bankRatio = Math.round(rng.range(brrRange.lo, brrRange.hi) * 100) / 100;

  const sectionCount = rng.int(3, 6);
  const sections = [];

  // Start with a wide section and taper down
  const baseW = Math.round(rng.range(wRange.lo, wRange.hi));
  for (let i = 0; i < sectionCount; i++) {
    // Gradually narrow each section; taper by 0–15 units per section
    const w     = Math.max(wRange.lo, baseW - i * Math.round(rng.range(5, 15)));
    const outerX = w / 2 + 60;
    const dropY  = -Math.round(outerX * bankRatio);
    const depth  = Math.round(rng.range(1200, 2600));
    sections.push({ w, depth, dropY });
  }

  const palIdx  = rng.int(0, PALETTE_KEYS.length - 1);

  return {
    id:         `proc_${seed}`,
    name:       `Proc #${seed % 10000}`,
    difficulty: diff,
    knifeId:    'knife_daily',
    paletteKey: PALETTE_KEYS[palIdx],
    desc:       `Procedural map (seed ${seed})`,
    bankRatio,
    sections,
    padLens:    [300, 220, 220, 220, 220, 220, 400],
    spawnY:     0,
  };
}
