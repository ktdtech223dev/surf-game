/**
 * ArtStyle.js — Material presets, color palettes, ambiance themes
 * Low-poly Krunker/Source aesthetic with MeshLambertMaterial
 */
import * as THREE from 'three';

// ── Color palettes ────────────────────────────────────────────────────────────
// All ramp/sky/pad/fog values are 4–5× brighter than the original dark palette
// so maps are clearly visible with the boosted lighting.
export const PALETTE = {
  // Beginner — vivid, saturated blues/greens
  shoreline:   { ramp: 0x1a5a9a, edge: 0x60c8ff, sky: 0x0e3060, fog: 0x0a2040, pad: 0x102848 },
  coastal:     { ramp: 0x1a6a2a, edge: 0x44ee80, sky: 0x0e3818, fog: 0x0a2a10, pad: 0x102818 },
  basin:       { ramp: 0x7a1a1a, edge: 0xff6666, sky: 0x501010, fog: 0x3a0c0c, pad: 0x380c0c },
  inlet:       { ramp: 0x5a3800, edge: 0xffcc44, sky: 0x3c2800, fog: 0x2c1e00, pad: 0x2c1e00 },
  cove:        { ramp: 0x38146e, edge: 0xcc77ff, sky: 0x220a44, fog: 0x180630, pad: 0x1a0830 },
  bay:         { ramp: 0x007070, edge: 0x44ffee, sky: 0x004848, fog: 0x003838, pad: 0x003030 },
  delta:       { ramp: 0x585810, edge: 0xffff44, sky: 0x3c3c08, fog: 0x2c2c06, pad: 0x282806 },
  lagoon:      { ramp: 0x143860, edge: 0x44ccff, sky: 0x0c2440, fog: 0x081c30, pad: 0x081c30 },
  // Intermediate — deeper, richer tones
  gorge:       { ramp: 0x3c1800, edge: 0xff8822, sky: 0x281000, fog: 0x1c0c00, pad: 0x180a00 },
  canyon:      { ramp: 0x582800, edge: 0xffaa66, sky: 0x3c1c00, fog: 0x2c1400, pad: 0x281200 },
  ravine:      { ramp: 0x183800, edge: 0xaaff55, sky: 0x102400, fog: 0x0c1c00, pad: 0x0a1600 },
  chasm:       { ramp: 0x001838, edge: 0x66aaff, sky: 0x000e22, fog: 0x00091a, pad: 0x000c1c },
  abyss:       { ramp: 0x202020, edge: 0xff44aa, sky: 0x141414, fog: 0x0c0c0c, pad: 0x0c0c0c },
  ridge:       { ramp: 0x383858, edge: 0xccccff, sky: 0x24243c, fog: 0x1c1c30, pad: 0x181828 },
  summit:      { ramp: 0x585858, edge: 0xffffff, sky: 0x3c3c3c, fog: 0x303030, pad: 0x282828 },
  peak:        { ramp: 0x003838, edge: 0x44ffff, sky: 0x002424, fog: 0x001c1c, pad: 0x001818 },
  // Advanced — dramatic, high-contrast
  storm:       { ramp: 0x383800, edge: 0xffff44, sky: 0x242400, fog: 0x1c1c00, pad: 0x181800 },
  tempest:     { ramp: 0x003878, edge: 0x44aaff, sky: 0x002450, fog: 0x001a3a, pad: 0x001830 },
  gale:        { ramp: 0x780038, edge: 0xff4488, sky: 0x500024, fog: 0x38001a, pad: 0x300018 },
  squall:      { ramp: 0x003800, edge: 0x44ff99, sky: 0x002400, fog: 0x001a00, pad: 0x001800 },
  cyclone:     { ramp: 0x380078, edge: 0xaa44ff, sky: 0x240050, fog: 0x1a003a, pad: 0x180030 },
  vortex:      { ramp: 0x783800, edge: 0xffcc44, sky: 0x502400, fog: 0x3a1a00, pad: 0x301600 },
  maelstrom:   { ramp: 0x140078, edge: 0x6644ff, sky: 0x0c0050, fog: 0x08003a, pad: 0x080030 },
  typhoon:     { ramp: 0x780078, edge: 0xff44ff, sky: 0x500050, fog: 0x3a003a, pad: 0x300030 },
  // Expert — intense, maximum contrast
  void:        { ramp: 0x1e0808, edge: 0xff4422, sky: 0x0c0404, fog: 0x080404, pad: 0x080404 },
  null:        { ramp: 0x282828, edge: 0x44ffcc, sky: 0x161616, fog: 0x101010, pad: 0x101010 },
  zenith:      { ramp: 0x140058, edge: 0xddccff, sky: 0x08003c, fog: 0x060030, pad: 0x060030 },
  apex:        { ramp: 0x581000, edge: 0xff7722, sky: 0x380800, fog: 0x280600, pad: 0x240600 },
  omega:       { ramp: 0x005838, edge: 0x44ff88, sky: 0x003824, fog: 0x002818, pad: 0x002018 },
  sigma:       { ramp: 0x580058, edge: 0xff77ff, sky: 0x380038, fog: 0x280028, pad: 0x200020 },
  prime:       { ramp: 0x003060, edge: 0x44ccff, sky: 0x001e40, fog: 0x001630, pad: 0x001428 },
  absolute:    { ramp: 0x303030, edge: 0xffd700, sky: 0x1c1c1c, fog: 0x141414, pad: 0x141414 },
};

// Fallback palette
const DEFAULT_PAL = { ramp: 0x1a4a7a, edge: 0x60c8ff, sky: 0x0e3060, fog: 0x0a2040, pad: 0x102848 };

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
    fogNear: 4000, fogFar: 14000,
    lightColor: 0xffffff, lightIntensity: 3.0,
    ambientColor: 0x8899bb, ambientIntensity: 2.5,
  },
  intermediate: {
    windBase: 0.5, windVariance: 0.2,
    fogNear: 3000, fogFar: 10000,
    lightColor: 0xffeecc, lightIntensity: 3.2,
    ambientColor: 0x997755, ambientIntensity: 2.4,
  },
  advanced: {
    windBase: 0.7, windVariance: 0.3,
    fogNear: 2000, fogFar: 8000,
    lightColor: 0xccddff, lightIntensity: 3.5,
    ambientColor: 0x445577, ambientIntensity: 2.6,
  },
  expert: {
    windBase: 1.0, windVariance: 0.4,
    fogNear: 1200, fogFar: 5000,
    lightColor: 0xff8844, lightIntensity: 3.8,
    ambientColor: 0x442244, ambientIntensity: 2.8,
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
