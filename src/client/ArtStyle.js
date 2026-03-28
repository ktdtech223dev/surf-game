/**
 * ArtStyle.js — Material presets, color palettes, ambiance themes
 * Low-poly Krunker/Source aesthetic with MeshLambertMaterial
 */
import * as THREE from 'three';

// ── Color palettes ────────────────────────────────────────────────────────────
export const PALETTE = {
  // Map themes
  shoreline:   { ramp: 0x0a2a4a, edge: 0x1e90ff, sky: 0x0d2340, fog: 0x0d1f36, pad: 0x0a1825 },
  coastal:     { ramp: 0x0a3a1a, edge: 0x22c55e, sky: 0x0d2810, fog: 0x0d1f15, pad: 0x0a1a0f },
  basin:       { ramp: 0x3a0a0a, edge: 0xff4444, sky: 0x280d0d, fog: 0x1f0d0d, pad: 0x1a0a0a },
  inlet:       { ramp: 0x2a1a00, edge: 0xffaa00, sky: 0x1e1400, fog: 0x1a1000, pad: 0x1a1000 },
  cove:        { ramp: 0x1a0a3a, edge: 0xaa44ff, sky: 0x130820, fog: 0x100615, pad: 0x100515 },
  bay:         { ramp: 0x003a3a, edge: 0x00ffcc, sky: 0x002828, fog: 0x001f1f, pad: 0x001515 },
  delta:       { ramp: 0x2a2a0a, edge: 0xdddd00, sky: 0x1e1e08, fog: 0x1a1a06, pad: 0x141406 },
  lagoon:      { ramp: 0x0a1a2a, edge: 0x00aaff, sky: 0x08121e, fog: 0x060e18, pad: 0x060c14 },
  // Intermediate
  gorge:       { ramp: 0x1a0a00, edge: 0xff6600, sky: 0x120800, fog: 0x0e0600, pad: 0x0c0500 },
  canyon:      { ramp: 0x2a1400, edge: 0xff8844, sky: 0x1e0e00, fog: 0x180b00, pad: 0x140900 },
  ravine:      { ramp: 0x0a1a00, edge: 0x88ff44, sky: 0x081200, fog: 0x060e00, pad: 0x050b00 },
  chasm:       { ramp: 0x000a1a, edge: 0x4488ff, sky: 0x000812, fog: 0x00060e, pad: 0x00050c },
  abyss:       { ramp: 0x080808, edge: 0xff0088, sky: 0x050505, fog: 0x030303, pad: 0x030303 },
  ridge:       { ramp: 0x1a1a2a, edge: 0xaaaaff, sky: 0x12121e, fog: 0x0e0e18, pad: 0x0c0c14 },
  summit:      { ramp: 0x2a2a2a, edge: 0xffffff, sky: 0x1e1e1e, fog: 0x181818, pad: 0x141414 },
  peak:        { ramp: 0x001a1a, edge: 0x00ffff, sky: 0x001212, fog: 0x000e0e, pad: 0x000c0c },
  // Advanced
  storm:       { ramp: 0x1a1a00, edge: 0xffff00, sky: 0x121200, fog: 0x0e0e00, pad: 0x0c0c00 },
  tempest:     { ramp: 0x001a3a, edge: 0x0088ff, sky: 0x001228, fog: 0x000e1e, pad: 0x000c18 },
  gale:        { ramp: 0x3a001a, edge: 0xff0055, sky: 0x280012, fog: 0x1e000e, pad: 0x18000c },
  squall:      { ramp: 0x001a00, edge: 0x00ff88, sky: 0x001200, fog: 0x000e00, pad: 0x000c00 },
  cyclone:     { ramp: 0x1a003a, edge: 0x8800ff, sky: 0x120028, fog: 0x0e001e, pad: 0x0c0018 },
  vortex:      { ramp: 0x3a1a00, edge: 0xffaa22, sky: 0x281200, fog: 0x1e0e00, pad: 0x180c00 },
  maelstrom:   { ramp: 0x0a003a, edge: 0x4400ff, sky: 0x080028, fog: 0x06001e, pad: 0x050018 },
  typhoon:     { ramp: 0x3a003a, edge: 0xff00ff, sky: 0x280028, fog: 0x1e001e, pad: 0x180018 },
  // Expert
  void:        { ramp: 0x050505, edge: 0xff2200, sky: 0x020202, fog: 0x020202, pad: 0x020202 },
  null:        { ramp: 0x0a0a0a, edge: 0x00ffaa, sky: 0x060606, fog: 0x040404, pad: 0x040404 },
  zenith:      { ramp: 0x050028, edge: 0xbbaaff, sky: 0x03001a, fog: 0x020014, pad: 0x020012 },
  apex:        { ramp: 0x280500, edge: 0xff5500, sky: 0x1a0300, fog: 0x140200, pad: 0x120200 },
  omega:       { ramp: 0x002818, edge: 0x00ff66, sky: 0x001a10, fog: 0x00140c, pad: 0x001008 },
  sigma:       { ramp: 0x280028, edge: 0xff44ff, sky: 0x1a001a, fog: 0x140014, pad: 0x100010 },
  prime:       { ramp: 0x001428, edge: 0x00aaff, sky: 0x000e1a, fog: 0x000b14, pad: 0x000a12 },
  absolute:    { ramp: 0x101010, edge: 0xffd700, sky: 0x080808, fog: 0x060606, pad: 0x060606 },
};

// Fallback palette
const DEFAULT_PAL = { ramp: 0x0a1a3a, edge: 0x1e90ff, sky: 0x0d2340, fog: 0x0d1f36, pad: 0x0a1825 };

export function getPalette(mapKey) {
  return PALETTE[mapKey] ?? DEFAULT_PAL;
}

// ── Material factory ──────────────────────────────────────────────────────────
export function makeMat(hexColor, opts = {}) {
  return new THREE.MeshLambertMaterial({
    color: hexColor,
    flatShading: true,
    ...opts,
  });
}

export function makeEdgeMat(hexColor) {
  return new THREE.LineBasicMaterial({ color: hexColor, linewidth: 1 });
}

// ── Ambiance themes ───────────────────────────────────────────────────────────
const AMBIANCE = {
  beginner: {
    windBase: 0.3, windVariance: 0.1,
    fogNear: 800, fogFar: 2500,
    lightColor: 0xffffff, lightIntensity: 0.8,
    ambientColor: 0x223344, ambientIntensity: 0.4,
  },
  intermediate: {
    windBase: 0.5, windVariance: 0.2,
    fogNear: 600, fogFar: 2000,
    lightColor: 0xffddaa, lightIntensity: 0.9,
    ambientColor: 0x332211, ambientIntensity: 0.3,
  },
  advanced: {
    windBase: 0.7, windVariance: 0.3,
    fogNear: 400, fogFar: 1500,
    lightColor: 0xaaccff, lightIntensity: 1.0,
    ambientColor: 0x112233, ambientIntensity: 0.5,
  },
  expert: {
    windBase: 1.0, windVariance: 0.4,
    fogNear: 200, fogFar: 1000,
    lightColor: 0xff4400, lightIntensity: 1.2,
    ambientColor: 0x110011, ambientIntensity: 0.6,
  },
};

export function getAmbiance(difficulty) {
  return AMBIANCE[difficulty] ?? AMBIANCE.beginner;
}

/**
 * Apply ambiance to a Three.js scene.
 * @param {THREE.Scene} scene
 * @param {THREE.WebGLRenderer} renderer
 * @param {object} pal - palette from getPalette()
 * @param {string} difficulty
 */
export function applyAmbiance(scene, renderer, pal, difficulty) {
  const amb = getAmbiance(difficulty);

  scene.background = new THREE.Color(pal.sky);
  scene.fog        = new THREE.Fog(pal.fog, amb.fogNear, amb.fogFar);

  // Remove existing lights
  scene.children.filter(c => c.isLight).forEach(l => scene.remove(l));

  const dirLight = new THREE.DirectionalLight(amb.lightColor, amb.lightIntensity);
  dirLight.position.set(200, 400, 100);
  scene.add(dirLight);

  const ambLight = new THREE.AmbientLight(amb.ambientColor, amb.ambientIntensity);
  scene.add(ambLight);
}

// ── Ramp geometry helper ──────────────────────────────────────────────────────
/**
 * Build a ramp (inclined plane) mesh + edge wireframe.
 * @param {object} opts - { w, h, d, rx, ry, rz, color, edgeColor }
 * @returns {{ mesh: THREE.Mesh, edges: THREE.LineSegments }}
 */
export function buildRamp(opts) {
  const { w = 300, h = 10, d = 800, rx = 0, ry = 0, rz = 0, color = 0x0a2a4a, edgeColor = 0x1e90ff } = opts;
  const geo  = new THREE.BoxGeometry(w, h, d);
  const mesh = new THREE.Mesh(geo, makeMat(color));
  mesh.rotation.set(rx, ry, rz);

  const edges = new THREE.LineSegments(
    new THREE.EdgesGeometry(geo),
    makeEdgeMat(edgeColor)
  );
  mesh.add(edges);

  return { mesh };
}

// ── Platform geometry helper ──────────────────────────────────────────────────
export function buildPad(opts) {
  const { w = 600, h = 20, d = 400, color = 0x080808, edgeColor = 0x333333 } = opts;
  const geo  = new THREE.BoxGeometry(w, h, d);
  const mesh = new THREE.Mesh(geo, makeMat(color));
  const edges = new THREE.LineSegments(new THREE.EdgesGeometry(geo), makeEdgeMat(edgeColor));
  mesh.add(edges);
  return { mesh };
}

// ── Checkpoint gate ───────────────────────────────────────────────────────────
export function buildGate(opts) {
  const { x = 0, y = 0, z = 0, w = 600, h = 150, color = 0x00ff88 } = opts;
  const group = new THREE.Group();

  const postGeo  = new THREE.BoxGeometry(12, h, 12);
  const postMat  = makeMat(color);
  const leftPost  = new THREE.Mesh(postGeo, postMat);
  const rightPost = new THREE.Mesh(postGeo, postMat);
  leftPost.position.set(-w / 2, h / 2, 0);
  rightPost.position.set(w / 2, h / 2, 0);

  const barGeo = new THREE.BoxGeometry(w + 12, 12, 12);
  const bar    = new THREE.Mesh(barGeo, postMat);
  bar.position.set(0, h, 0);

  group.add(leftPost, rightPost, bar);
  group.position.set(x, y, z);
  return group;
}
