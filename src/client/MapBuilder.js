/**
 * SurfGame map builder
 * Creates both visual (Three.js) and physical (CollisionWorld) representations.
 *
 * Layout (Z axis = forward):
 *   Z 0–350    : Spawn platform  (Y = 0)
 *   Z 350–2150 : Section 1 ramps (top Y=0, bottom Y=-450)
 *   Z 2150–2550: Landing pad 1   (Y = -450)
 *   Z 2550–3750: Section 2 ramps (top Y=-450, bottom Y=-750)
 *   Z 3750–4150: Final platform  (Y = -750)
 */

import * as THREE from 'three';
import * as Vec3 from '../shared/physics/vec3.js';
import { CollisionWorld } from '../shared/physics/CollisionWorld.js';

// ── Section 1 ──────────────────────────────────────────────────────────────────
const S1_START_Z = 350;
const S1_WIDTH   = 320;   // horizontal half-width (center to top edge)
const S1_DEPTH   = 450;   // vertical drop from top to bottom
const S1_LEN     = 1800;
const S1_END_Z   = S1_START_Z + S1_LEN;  // 2150

// ── Section 2 ──────────────────────────────────────────────────────────────────
const S2_START_Z = 2550;
const S2_WIDTH   = 270;
const S2_DEPTH   = 300;
const S2_LEN     = 1200;
const S2_END_Z   = S2_START_Z + S2_LEN;  // 3750

// ── Landing pads ───────────────────────────────────────────────────────────────
const PAD1_Y  = -S1_DEPTH;      // -450 (bottom of section 1)
const PAD2_Y  = PAD1_Y - S2_DEPTH; // -750 (bottom of section 2)

// ── Ledge width (same for both sections) ──────────────────────────────────────
const LEDGE_W = 200;

export function buildTestMap(renderer) {
  const world = new CollisionWorld();

  // ── Ramp normals ─────────────────────────────────────────────────────────────
  // S1: top edge at ±S1_WIDTH, bottom at ±0, depth S1_DEPTH
  const s1LeftN  = Vec3.normalize(Vec3.create( S1_DEPTH, S1_WIDTH, 0));
  const s1RightN = Vec3.normalize(Vec3.create(-S1_DEPTH, S1_WIDTH, 0));
  // S2: same shape, just shallower
  const s2LeftN  = Vec3.normalize(Vec3.create( S2_DEPTH, S2_WIDTH, 0));
  const s2RightN = Vec3.normalize(Vec3.create(-S2_DEPTH, S2_WIDTH, 0));

  console.log(`[Map] S1 ramp normal.y = ${s1LeftN.y.toFixed(3)} (surf: ${s1LeftN.y < 0.7})`);
  console.log(`[Map] S2 ramp normal.y = ${s2LeftN.y.toFixed(3)} (surf: ${s2LeftN.y < 0.7})`);

  // ╔══════════════════════════════════════════════════════╗
  // ║  SPAWN PLATFORM  (Y = 0, Z = 0 … S1_START_Z)        ║
  // ╚══════════════════════════════════════════════════════╝
  world.addFloor(0, 0, 740, S1_START_Z * 2, 0);
  addBoxMesh(renderer, 0, -2.5, 0, 740, 5, S1_START_Z * 2, 0x1c1c2c);
  addGridOverlay(renderer, 0, 0.5, 0, 740, S1_START_Z * 2);

  // "WALK FORWARD" direction arrow
  addDirectionArrow(renderer, 0, 1, 240, 0x00ff88);

  // Entry sign above the ramp entrance
  addLabel(renderer, -S1_WIDTH, 8, S1_START_Z - 10, 'LEFT RAMP', 0x4488ff);
  addLabel(renderer,  S1_WIDTH, 8, S1_START_Z - 10, 'RIGHT RAMP', 0xff4488);

  // ╔══════════════════════════════════════════════════════╗
  // ║  SIDE LEDGES  (both sections)                        ║
  // ╚══════════════════════════════════════════════════════╝
  const ledgeLen = S2_END_Z - S1_START_Z;
  const ledgeCenterZ = S1_START_Z + ledgeLen / 2;

  world.addFloor(-S1_WIDTH, 0, LEDGE_W, ledgeLen, 0);
  addBoxMesh(renderer, -S1_WIDTH, -2.5, ledgeCenterZ, LEDGE_W, 5, ledgeLen, 0x13131f);

  world.addFloor( S1_WIDTH, 0, LEDGE_W, ledgeLen, 0);
  addBoxMesh(renderer,  S1_WIDTH, -2.5, ledgeCenterZ, LEDGE_W, 5, ledgeLen, 0x13131f);

  // ╔══════════════════════════════════════════════════════╗
  // ║  SECTION 1  —  RAMPS                                 ║
  // ╚══════════════════════════════════════════════════════╝

  // Left ramp (top-left → bottom-center)
  const l1v0 = Vec3.create(-S1_WIDTH,    0,     S1_START_Z);
  const l1v1 = Vec3.create(        0, -S1_DEPTH, S1_START_Z);
  const l1v2 = Vec3.create(        0, -S1_DEPTH, S1_END_Z);
  const l1v3 = Vec3.create(-S1_WIDTH,    0,     S1_END_Z);
  world.addQuadWithNormal(l1v0, l1v1, l1v2, l1v3, s1LeftN);
  addRampMesh(renderer, [l1v0, l1v1, l1v2, l1v3], 0x0c2244);
  addRampEdge(renderer, l1v0, l1v3, 0x3366cc);   // top (entry) edge — blue
  addRampEdge(renderer, l1v1, l1v2, 0x112255);   // bottom edge

  // Right ramp (mirror)
  const r1v0 = Vec3.create( S1_WIDTH,    0,     S1_START_Z);
  const r1v1 = Vec3.create(        0, -S1_DEPTH, S1_START_Z);
  const r1v2 = Vec3.create(        0, -S1_DEPTH, S1_END_Z);
  const r1v3 = Vec3.create( S1_WIDTH,    0,     S1_END_Z);
  world.addQuadWithNormal(r1v0, r1v1, r1v2, r1v3, s1RightN);
  addRampMesh(renderer, [r1v0, r1v1, r1v2, r1v3], 0x330d20);
  addRampEdge(renderer, r1v0, r1v3, 0xcc3366);   // top (entry) edge — pink
  addRampEdge(renderer, r1v1, r1v2, 0x551122);   // bottom edge

  // Entry glow dots at the top corners of each ramp
  addGlowDot(renderer, -S1_WIDTH, 4, S1_START_Z, 0x3366cc);
  addGlowDot(renderer,  S1_WIDTH, 4, S1_START_Z, 0xcc3366);

  // Speed milestone markers along section 1
  addSpeedMarker(renderer, -S1_WIDTH + 40, -S1_DEPTH * 0.3, S1_START_Z + 500,  '320', 0xffcc00);
  addSpeedMarker(renderer, -S1_WIDTH + 40, -S1_DEPTH * 0.55, S1_START_Z + 1000, '500', 0x00ff88);
  addSpeedMarker(renderer, -S1_WIDTH + 40, -S1_DEPTH * 0.78, S1_START_Z + 1500, '700+', 0x00cfff);

  // ╔══════════════════════════════════════════════════════╗
  // ║  LANDING PAD 1  (between sections)                   ║
  // ╚══════════════════════════════════════════════════════╝
  const pad1CenterZ = (S1_END_Z + S2_START_Z) / 2;
  world.addFloor(0, pad1CenterZ, 660, S2_START_Z - S1_END_Z, PAD1_Y);
  addBoxMesh(renderer, 0, PAD1_Y - 2.5, pad1CenterZ, 660, 5, S2_START_Z - S1_END_Z, 0x1c1c2c);
  addGridOverlay(renderer, 0, PAD1_Y + 0.5, pad1CenterZ, 660, S2_START_Z - S1_END_Z);
  addLabel(renderer, 0, PAD1_Y + 28, pad1CenterZ, 'SECTION 2 →', 0x00cfff);

  // ╔══════════════════════════════════════════════════════╗
  // ║  SECTION 2  —  RAMPS  (tighter / faster)            ║
  // ╚══════════════════════════════════════════════════════╝

  // Left ramp — starts at PAD1_Y (top), drops to PAD2_Y (bottom)
  const l2v0 = Vec3.create(-S2_WIDTH, PAD1_Y,  S2_START_Z);
  const l2v1 = Vec3.create(        0, PAD2_Y,  S2_START_Z);
  const l2v2 = Vec3.create(        0, PAD2_Y,  S2_END_Z);
  const l2v3 = Vec3.create(-S2_WIDTH, PAD1_Y,  S2_END_Z);
  world.addQuadWithNormal(l2v0, l2v1, l2v2, l2v3, s2LeftN);
  addRampMesh(renderer, [l2v0, l2v1, l2v2, l2v3], 0x083828);
  addRampEdge(renderer, l2v0, l2v3, 0x00cc88);   // teal top edge
  addRampEdge(renderer, l2v1, l2v2, 0x004422);

  // Right ramp
  const r2v0 = Vec3.create( S2_WIDTH, PAD1_Y,  S2_START_Z);
  const r2v1 = Vec3.create(        0, PAD2_Y,  S2_START_Z);
  const r2v2 = Vec3.create(        0, PAD2_Y,  S2_END_Z);
  const r2v3 = Vec3.create( S2_WIDTH, PAD1_Y,  S2_END_Z);
  world.addQuadWithNormal(r2v0, r2v1, r2v2, r2v3, s2RightN);
  addRampMesh(renderer, [r2v0, r2v1, r2v2, r2v3], 0x302000);
  addRampEdge(renderer, r2v0, r2v3, 0xddaa00);   // gold top edge
  addRampEdge(renderer, r2v1, r2v2, 0x553300);

  // Entry glow dots at section 2 top corners
  addGlowDot(renderer, -S2_WIDTH, PAD1_Y + 5, S2_START_Z, 0x00cc88);
  addGlowDot(renderer,  S2_WIDTH, PAD1_Y + 5, S2_START_Z, 0xddaa00);

  // ╔══════════════════════════════════════════════════════╗
  // ║  FINAL PLATFORM                                      ║
  // ╚══════════════════════════════════════════════════════╝
  const finalCenterZ = S2_END_Z + 250;
  world.addFloor(0, finalCenterZ, 720, 500, PAD2_Y);
  addBoxMesh(renderer, 0, PAD2_Y - 2.5, finalCenterZ, 720, 5, 500, 0x1c1c2c);
  addGridOverlay(renderer, 0, PAD2_Y + 0.5, finalCenterZ, 720, 500);
  addLabel(renderer, 0, PAD2_Y + 40, finalCenterZ, 'FINISH', 0xffcc00);

  // ╔══════════════════════════════════════════════════════╗
  // ║  KILL ZONES                                          ║
  // ╚══════════════════════════════════════════════════════╝
  // Below deepest ramp (section 2 bottom = PAD2_Y = -750)
  // Band from -900 to -820 catches players who fall off either ramp section
  world.addKillZone(
    Vec3.create(-3500, PAD2_Y - 150, -500),
    Vec3.create( 3500, PAD2_Y -  60, 12000),
  );
  // Section 1 fall-through kill (below s1 ramp bottom but above s2 range)
  // catches mid-section falls between Z 350..2150
  world.addKillZone(
    Vec3.create(-3500, -S1_DEPTH - 120, S1_START_Z),
    Vec3.create( 3500, -S1_DEPTH -  50, S2_START_Z),
  );
  // Left/right out-of-bounds (outside outer ledge edge)
  const outerEdge = S1_WIDTH + LEDGE_W / 2 + 20;
  world.addKillZone(
    Vec3.create(-3500, -1400, -500),
    Vec3.create(-outerEdge, 300, 12000),
  );
  world.addKillZone(
    Vec3.create(outerEdge, -1400, -500),
    Vec3.create(3500, 300, 12000),
  );

  // ╔══════════════════════════════════════════════════════╗
  // ║  WORLD GRID                                          ║
  // ╚══════════════════════════════════════════════════════╝
  const grid = new THREE.GridHelper(18000, 180, 0x111122, 0x0d0d18);
  grid.position.y = PAD2_Y - 30;
  renderer.scene.add(grid);

  return world;
}

// ── Spawn helpers ──────────────────────────────────────────────────────────────

/**
 * Returns the recommended spawn position (on the left ledge, facing the ramp).
 */
export function getSpawnPosition() {
  return { x: -S1_WIDTH, y: 50, z: 80 };
}

// ── Visual helpers ─────────────────────────────────────────────────────────────

function addRampMesh(renderer, verts, color) {
  const [v0, v1, v2, v3] = verts;
  const positions = new Float32Array([
    v0.x, v0.y, v0.z,  v1.x, v1.y, v1.z,  v2.x, v2.y, v2.z,
    v0.x, v0.y, v0.z,  v2.x, v2.y, v2.z,  v3.x, v3.y, v3.z,
  ]);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.computeVertexNormals();
  renderer.scene.add(new THREE.Mesh(geo,
    new THREE.MeshLambertMaterial({ color, side: THREE.DoubleSide })));
  // Subtle wireframe
  renderer.scene.add(new THREE.LineSegments(
    new THREE.WireframeGeometry(geo),
    new THREE.LineBasicMaterial({ color: 0x000000, opacity: 0.1, transparent: true })));
}

function addRampEdge(renderer, a, b, color) {
  const geo = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(a.x, a.y, a.z),
    new THREE.Vector3(b.x, b.y, b.z),
  ]);
  renderer.scene.add(new THREE.Line(geo,
    new THREE.LineBasicMaterial({ color, opacity: 0.8, transparent: true })));
}

function addBoxMesh(renderer, x, y, z, w, h, d, color) {
  renderer.addBox(x, y, z, w, h, d, color);
}

function addGridOverlay(renderer, x, y, z, w, d) {
  const geo = new THREE.PlaneGeometry(w, d,
    Math.max(1, Math.floor(w / 100)),
    Math.max(1, Math.floor(d / 100)));
  const mat  = new THREE.MeshBasicMaterial({ color: 0x333355, wireframe: true, opacity: 0.1, transparent: true });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(x, y, z);
  renderer.scene.add(mesh);
}

function addDirectionArrow(renderer, x, y, z, color) {
  const pts = [
    new THREE.Vector3(-30, 0, -50),
    new THREE.Vector3(  0, 0,  50),
    new THREE.Vector3( 30, 0, -50),
    new THREE.Vector3(  0, 0, -15),
    new THREE.Vector3(-30, 0, -50),
  ];
  renderer.scene.add(new THREE.Line(
    new THREE.BufferGeometry().setFromPoints(pts),
    new THREE.LineBasicMaterial({ color, opacity: 0.6, transparent: true })));
  addLabel(renderer, x, y + 35, z + 70, 'WALK FORWARD', color);
}

function addGlowDot(renderer, x, y, z, color) {
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(7, 8, 6),
    new THREE.MeshBasicMaterial({ color }),
  );
  mesh.position.set(x, y, z);
  renderer.scene.add(mesh);
}

function addSpeedMarker(renderer, x, y, z, text, color) {
  // Thin line crossing the ramp
  const pts = [
    new THREE.Vector3(x - 30, y, z),
    new THREE.Vector3(x + 30, y, z),
  ];
  renderer.scene.add(new THREE.Line(
    new THREE.BufferGeometry().setFromPoints(pts),
    new THREE.LineBasicMaterial({ color, opacity: 0.35, transparent: true })));
  addLabel(renderer, x, y + 20, z, text, color);
}

function addLabel(renderer, x, y, z, text, color) {
  const canvas  = document.createElement('canvas');
  canvas.width  = 512;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = `#${color.toString(16).padStart(6, '0')}`;
  ctx.font = 'bold 30px Consolas, monospace';
  ctx.textAlign = 'center';
  ctx.fillText(text, 256, 44);

  const mat    = new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(canvas), transparent: true });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(320, 40, 1);
  sprite.position.set(x, y, z);
  renderer.scene.add(sprite);
}
