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
const PALETTE_KEYS = ['dark_blue', 'ocean_green', 'sunset_red', 'ember', 'twilight', 'teal'];
const DIFFICULTIES = ['beginner', 'intermediate', 'advanced', 'expert'];

/**
 * Returns a MapCatalog-format definition object generated deterministically
 * from the given numeric seed. Compatible with MapFactory._buildFromDef().
 */
export function generateProceduralEntry(seed) {
  const rng = mulberry32(seed);

  const sectionCount = rng.int(2, 4);
  const sections = [];
  for (let i = 0; i < sectionCount; i++) {
    sections.push({
      w:     Math.round(rng.range(180, 320)),
      depth: Math.round(rng.range(600, 1400)),
      angle: 0,
      dropY: -Math.round(rng.range(200, 600)),
    });
  }

  const palIdx  = rng.int(0, PALETTE_KEYS.length - 1);
  const diffIdx = rng.int(0, DIFFICULTIES.length - 1);

  return {
    id:         `proc_${seed}`,
    name:       `Proc #${seed % 10000}`,
    difficulty: DIFFICULTIES[diffIdx],
    knifeId:    'knife_daily',
    paletteKey: PALETTE_KEYS[palIdx],
    desc:       `Procedural map (seed ${seed})`,
    sections,
    padLens:    [300, 200, 200, 200, 200, 400],
    spawnY:     0,
  };
}
