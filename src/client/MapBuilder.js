/**
 * SurfGame map builder — 3-section surf map
 *
 * Layout (Z axis = forward):
 *   Z 0–350    : Spawn platform   (Y =    0)
 *   Z 350–2150 : Section 1 ramps  (Y = 0 → -450)
 *   Z 2150–2550: Landing pad 1    (Y = -450)
 *   Z 2550–3750: Section 2 ramps  (Y = -450 → -750)
 *   Z 3750–4150: Landing pad 2    (Y = -750)
 *   Z 4150–5650: Section 3 ramps  (Y = -750 → -1000)
 *   Z 5650–6200: Final platform   (Y = -1000)  ← FINISH
 */

import * as THREE from 'three';
import * as Vec3 from '../shared/physics/vec3.js';
import { CollisionWorld } from '../shared/physics/CollisionWorld.js';

// ── Section 1 ──────────────────────────────────────────────────────────────────
const S1_START_Z = 350;
const S1_WIDTH   = 320;
const S1_DEPTH   = 450;
const S1_LEN     = 1800;
const S1_END_Z   = S1_START_Z + S1_LEN;   // 2150

// ── Section 2 ──────────────────────────────────────────────────────────────────
const S2_START_Z = 2550;
const S2_WIDTH   = 270;
const S2_DEPTH   = 300;
const S2_LEN     = 1200;
const S2_END_Z   = S2_START_Z + S2_LEN;   // 3750

// ── Section 3 ──────────────────────────────────────────────────────────────────
const S3_START_Z = 4150;
const S3_WIDTH   = 230;
const S3_DEPTH   = 250;
const S3_LEN     = 1500;
const S3_END_Z   = S3_START_Z + S3_LEN;   // 5650

// ── Platform Y levels ──────────────────────────────────────────────────────────
const PAD1_Y = -S1_DEPTH;              // -450
const PAD2_Y = PAD1_Y - S2_DEPTH;     // -750
const PAD3_Y = PAD2_Y - S3_DEPTH;     // -1000

// ── Ledge width ────────────────────────────────────────────────────────────────
const LEDGE_W = 200;

// ── Exported constants for main.js ────────────────────────────────────────────
export const MAP = {
  S1_END_Z, S2_END_Z, S3_END_Z,
  PAD1_Y, PAD2_Y, PAD3_Y,
  FINISH_Z: S3_END_Z,
  FINISH_Y: PAD3_Y - 50,
};

export function buildTestMap(renderer) {
  const world = new CollisionWorld();

  // ── Ramp normals ─────────────────────────────────────────────────────────────
  const s1LeftN  = Vec3.normalize(Vec3.create( S1_DEPTH, S1_WIDTH, 0));
  const s1RightN = Vec3.normalize(Vec3.create(-S1_DEPTH, S1_WIDTH, 0));
  const s2LeftN  = Vec3.normalize(Vec3.create( S2_DEPTH, S2_WIDTH, 0));
  const s2RightN = Vec3.normalize(Vec3.create(-S2_DEPTH, S2_WIDTH, 0));
  const s3LeftN  = Vec3.normalize(Vec3.create( S3_DEPTH, S3_WIDTH, 0));
  const s3RightN = Vec3.normalize(Vec3.create(-S3_DEPTH, S3_WIDTH, 0));

  // ╔══════════════════════════════════════════════════════╗
  // ║  SPAWN PLATFORM                                      ║
  // ╚══════════════════════════════════════════════════════╝
  world.addFloor(0, 0, 740, S1_START_Z * 2, 0);
  addBoxMesh(renderer, 0, -2.5, 0, 740, 5, S1_START_Z * 2, 0x1c1c2c);
  addGridOverlay(renderer, 0, 0.5, 0, 740, S1_START_Z * 2);
  addDirectionArrow(renderer, 0, 1, 240, 0x00ff88);
  addLabel(renderer, -S1_WIDTH, 8, S1_START_Z - 10, 'LEFT RAMP',  0x4488ff);
  addLabel(renderer,  S1_WIDTH, 8, S1_START_Z - 10, 'RIGHT RAMP', 0xff4488);

  // ╔══════════════════════════════════════════════════════╗
  // ║  SIDE LEDGES  (run the full map length)              ║
  // ╚══════════════════════════════════════════════════════╝
  const ledgeLen    = S3_END_Z - S1_START_Z;
  const ledgeCenterZ = S1_START_Z + ledgeLen / 2;

  world.addFloor(-S1_WIDTH, 0, LEDGE_W, ledgeLen, 0);
  addBoxMesh(renderer, -S1_WIDTH, -2.5, ledgeCenterZ, LEDGE_W, 5, ledgeLen, 0x13131f);
  world.addFloor( S1_WIDTH, 0, LEDGE_W, ledgeLen, 0);
  addBoxMesh(renderer,  S1_WIDTH, -2.5, ledgeCenterZ, LEDGE_W, 5, ledgeLen, 0x13131f);

  // ╔══════════════════════════════════════════════════════╗
  // ║  SECTION 1  —  RAMPS (blue / pink)                  ║
  // ╚══════════════════════════════════════════════════════╝
  const l1v0 = Vec3.create(-S1_WIDTH,    0,      S1_START_Z);
  const l1v1 = Vec3.create(        0, -S1_DEPTH, S1_START_Z);
  const l1v2 = Vec3.create(        0, -S1_DEPTH, S1_END_Z);
  const l1v3 = Vec3.create(-S1_WIDTH,    0,      S1_END_Z);
  world.addQuadWithNormal(l1v0, l1v1, l1v2, l1v3, s1LeftN);
  addRampMesh(renderer, [l1v0, l1v1, l1v2, l1v3], 0x0c2244);
  addRampEdge(renderer, l1v0, l1v3, 0x3366cc);
  addRampEdge(renderer, l1v1, l1v2, 0x112255);

  const r1v0 = Vec3.create( S1_WIDTH,    0,      S1_START_Z);
  const r1v1 = Vec3.create(        0, -S1_DEPTH, S1_START_Z);
  const r1v2 = Vec3.create(        0, -S1_DEPTH, S1_END_Z);
  const r1v3 = Vec3.create( S1_WIDTH,    0,      S1_END_Z);
  world.addQuadWithNormal(r1v0, r1v1, r1v2, r1v3, s1RightN);
  addRampMesh(renderer, [r1v0, r1v1, r1v2, r1v3], 0x330d20);
  addRampEdge(renderer, r1v0, r1v3, 0xcc3366);
  addRampEdge(renderer, r1v1, r1v2, 0x551122);

  addGlowDot(renderer, -S1_WIDTH, 4,  S1_START_Z, 0x3366cc);
  addGlowDot(renderer,  S1_WIDTH, 4,  S1_START_Z, 0xcc3366);
  addSpeedMarker(renderer, -S1_WIDTH + 40, -S1_DEPTH * 0.30, S1_START_Z + 500,  '320', 0xffcc00);
  addSpeedMarker(renderer, -S1_WIDTH + 40, -S1_DEPTH * 0.55, S1_START_Z + 1000, '500', 0x00ff88);
  addSpeedMarker(renderer, -S1_WIDTH + 40, -S1_DEPTH * 0.78, S1_START_Z + 1500, '700+', 0x00cfff);

  // Checkpoint 1 gate
  addCheckpointGate(renderer, 0, -S1_DEPTH, S1_END_Z - 20, S1_WIDTH * 2, 'CP 1', 0x3366cc);

  // ╔══════════════════════════════════════════════════════╗
  // ║  LANDING PAD 1                                       ║
  // ╚══════════════════════════════════════════════════════╝
  const pad1CenterZ = (S1_END_Z + S2_START_Z) / 2;
  world.addFloor(0, pad1CenterZ, 660, S2_START_Z - S1_END_Z, PAD1_Y);
  addBoxMesh(renderer, 0, PAD1_Y - 2.5, pad1CenterZ, 660, 5, S2_START_Z - S1_END_Z, 0x1c1c2c);
  addGridOverlay(renderer, 0, PAD1_Y + 0.5, pad1CenterZ, 660, S2_START_Z - S1_END_Z);
  addLabel(renderer, 0, PAD1_Y + 28, pad1CenterZ, 'SECTION 2 →', 0x00cfff);

  // ╔══════════════════════════════════════════════════════╗
  // ║  SECTION 2  —  RAMPS (teal / gold)                  ║
  // ╚══════════════════════════════════════════════════════╝
  const l2v0 = Vec3.create(-S2_WIDTH, PAD1_Y,  S2_START_Z);
  const l2v1 = Vec3.create(        0, PAD2_Y,  S2_START_Z);
  const l2v2 = Vec3.create(        0, PAD2_Y,  S2_END_Z);
  const l2v3 = Vec3.create(-S2_WIDTH, PAD1_Y,  S2_END_Z);
  world.addQuadWithNormal(l2v0, l2v1, l2v2, l2v3, s2LeftN);
  addRampMesh(renderer, [l2v0, l2v1, l2v2, l2v3], 0x083828);
  addRampEdge(renderer, l2v0, l2v3, 0x00cc88);
  addRampEdge(renderer, l2v1, l2v2, 0x004422);

  const r2v0 = Vec3.create( S2_WIDTH, PAD1_Y,  S2_START_Z);
  const r2v1 = Vec3.create(        0, PAD2_Y,  S2_START_Z);
  const r2v2 = Vec3.create(        0, PAD2_Y,  S2_END_Z);
  const r2v3 = Vec3.create( S2_WIDTH, PAD1_Y,  S2_END_Z);
  world.addQuadWithNormal(r2v0, r2v1, r2v2, r2v3, s2RightN);
  addRampMesh(renderer, [r2v0, r2v1, r2v2, r2v3], 0x302000);
  addRampEdge(renderer, r2v0, r2v3, 0xddaa00);
  addRampEdge(renderer, r2v1, r2v2, 0x553300);

  addGlowDot(renderer, -S2_WIDTH, PAD1_Y + 5, S2_START_Z, 0x00cc88);
  addGlowDot(renderer,  S2_WIDTH, PAD1_Y + 5, S2_START_Z, 0xddaa00);

  addCheckpointGate(renderer, 0, PAD2_Y, S2_END_Z - 20, S2_WIDTH * 2, 'CP 2', 0x00cc88);

  // ╔══════════════════════════════════════════════════════╗
  // ║  LANDING PAD 2                                       ║
  // ╚══════════════════════════════════════════════════════╝
  const pad2CenterZ = (S2_END_Z + S3_START_Z) / 2;
  world.addFloor(0, pad2CenterZ, 620, S3_START_Z - S2_END_Z, PAD2_Y);
  addBoxMesh(renderer, 0, PAD2_Y - 2.5, pad2CenterZ, 620, 5, S3_START_Z - S2_END_Z, 0x1c1c2c);
  addGridOverlay(renderer, 0, PAD2_Y + 0.5, pad2CenterZ, 620, S3_START_Z - S2_END_Z);
  addLabel(renderer, 0, PAD2_Y + 28, pad2CenterZ, 'SECTION 3 →', 0xaa44ff);

  // ╔══════════════════════════════════════════════════════╗
  // ║  SECTION 3  —  RAMPS (purple / orange)  [FASTEST]   ║
  // ╚══════════════════════════════════════════════════════╝
  const l3v0 = Vec3.create(-S3_WIDTH, PAD2_Y,  S3_START_Z);
  const l3v1 = Vec3.create(        0, PAD3_Y,  S3_START_Z);
  const l3v2 = Vec3.create(        0, PAD3_Y,  S3_END_Z);
  const l3v3 = Vec3.create(-S3_WIDTH, PAD2_Y,  S3_END_Z);
  world.addQuadWithNormal(l3v0, l3v1, l3v2, l3v3, s3LeftN);
  addRampMesh(renderer, [l3v0, l3v1, l3v2, l3v3], 0x1a0830);
  addRampEdge(renderer, l3v0, l3v3, 0xaa44ff);
  addRampEdge(renderer, l3v1, l3v2, 0x440088);

  const r3v0 = Vec3.create( S3_WIDTH, PAD2_Y,  S3_START_Z);
  const r3v1 = Vec3.create(        0, PAD3_Y,  S3_START_Z);
  const r3v2 = Vec3.create(        0, PAD3_Y,  S3_END_Z);
  const r3v3 = Vec3.create( S3_WIDTH, PAD2_Y,  S3_END_Z);
  world.addQuadWithNormal(r3v0, r3v1, r3v2, r3v3, s3RightN);
  addRampMesh(renderer, [r3v0, r3v1, r3v2, r3v3], 0x301400);
  addRampEdge(renderer, r3v0, r3v3, 0xff8800);
  addRampEdge(renderer, r3v1, r3v2, 0x882200);

  addGlowDot(renderer, -S3_WIDTH, PAD2_Y + 5, S3_START_Z, 0xaa44ff);
  addGlowDot(renderer,  S3_WIDTH, PAD2_Y + 5, S3_START_Z, 0xff8800);
  addSpeedMarker(renderer, -S3_WIDTH + 30, PAD2_Y - S3_DEPTH * 0.4, S3_START_Z + 600,  '900', 0xaa44ff);
  addSpeedMarker(renderer, -S3_WIDTH + 30, PAD2_Y - S3_DEPTH * 0.8, S3_START_Z + 1200, '1100+', 0xff8800);

  // ╔══════════════════════════════════════════════════════╗
  // ║  FINAL PLATFORM + FINISH ZONE                        ║
  // ╚══════════════════════════════════════════════════════╝
  const finalCenterZ = S3_END_Z + 275;
  world.addFloor(0, finalCenterZ, 720, 550, PAD3_Y);
  addBoxMesh(renderer, 0, PAD3_Y - 2.5, finalCenterZ, 720, 5, 550, 0x1c1c2c);
  addGridOverlay(renderer, 0, PAD3_Y + 0.5, finalCenterZ, 720, 550);

  // Finish gate — glowing gold arch
  addFinishGate(renderer, 0, PAD3_Y, S3_END_Z + 30);
  addLabel(renderer, 0, PAD3_Y + 70, S3_END_Z + 120, 'FINISH', 0xffcc00);

  // ╔══════════════════════════════════════════════════════╗
  // ║  KILL ZONES                                          ║
  // ╚══════════════════════════════════════════════════════╝
  // Below all ramps (catches S1, S2, S3 falls)
  world.addKillZone(
    Vec3.create(-3500, PAD3_Y - 150, -500),
    Vec3.create( 3500, PAD3_Y -  60, 12000),
  );
  // S1 mid-fall kill (between S1 bottom and S2 top)
  world.addKillZone(
    Vec3.create(-3500, -S1_DEPTH - 120, S1_START_Z),
    Vec3.create( 3500, -S1_DEPTH -  50, S2_START_Z),
  );
  // S2 mid-fall kill (between S2 bottom and S3 top)
  world.addKillZone(
    Vec3.create(-3500, PAD2_Y - 120, S2_START_Z),
    Vec3.create( 3500, PAD2_Y -  50, S3_START_Z),
  );
  // Left/right out-of-bounds
  const outerEdge = S1_WIDTH + LEDGE_W / 2 + 20;
  world.addKillZone(Vec3.create(-3500, -1800, -500), Vec3.create(-outerEdge, 300, 12000));
  world.addKillZone(Vec3.create( outerEdge, -1800, -500), Vec3.create(3500, 300, 12000));

  // ╔══════════════════════════════════════════════════════╗
  // ║  WORLD GRID                                          ║
  // ╚══════════════════════════════════════════════════════╝
  const grid = new THREE.GridHelper(18000, 180, 0x111122, 0x0d0d18);
  grid.position.y = PAD3_Y - 30;
  renderer.scene.add(grid);

  return world;
}

// ── Spawn ──────────────────────────────────────────────────────────────────────

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
  const geo  = new THREE.PlaneGeometry(w, d,
    Math.max(1, Math.floor(w / 100)), Math.max(1, Math.floor(d / 100)));
  const mat  = new THREE.MeshBasicMaterial({ color: 0x333355, wireframe: true, opacity: 0.1, transparent: true });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(x, y, z);
  renderer.scene.add(mesh);
}

function addDirectionArrow(renderer, x, y, z, color) {
  const pts = [
    new THREE.Vector3(-30, 0, -50), new THREE.Vector3(0, 0, 50),
    new THREE.Vector3( 30, 0, -50), new THREE.Vector3(0, 0, -15),
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
  const pts = [new THREE.Vector3(x - 30, y, z), new THREE.Vector3(x + 30, y, z)];
  renderer.scene.add(new THREE.Line(
    new THREE.BufferGeometry().setFromPoints(pts),
    new THREE.LineBasicMaterial({ color, opacity: 0.35, transparent: true })));
  addLabel(renderer, x, y + 20, z, text, color);
}

/** Thin glowing gate spanning the ramp at a checkpoint */
function addCheckpointGate(renderer, cx, y, z, width, label, color) {
  const hw = width / 2;
  const h  = 80;
  const pts = [
    new THREE.Vector3(-hw, 0,   z),
    new THREE.Vector3(-hw, h,   z),
    new THREE.Vector3( hw, h,   z),
    new THREE.Vector3( hw, 0,   z),
  ];
  renderer.scene.add(new THREE.Line(
    new THREE.BufferGeometry().setFromPoints(pts),
    new THREE.LineBasicMaterial({ color, opacity: 0.5, transparent: true })));
  addLabel(renderer, cx, y + h + 20, z, label, color);
}

/** Gold finish arch */
function addFinishGate(renderer, cx, y, z) {
  const color = 0xffcc00;
  const hw    = 200;
  const h     = 120;
  const pts   = [
    new THREE.Vector3(-hw, 0, z), new THREE.Vector3(-hw, h, z),
    new THREE.Vector3(  0, h + 30, z),
    new THREE.Vector3( hw, h, z), new THREE.Vector3( hw, 0, z),
  ];
  renderer.scene.add(new THREE.Line(
    new THREE.BufferGeometry().setFromPoints(pts),
    new THREE.LineBasicMaterial({ color, opacity: 0.9, transparent: true })));

  // Glow dots on arch pillars
  addGlowDot(renderer, -hw, y + 5, z, color);
  addGlowDot(renderer,  hw, y + 5, z, color);
  addGlowDot(renderer,   0, y + h + 30, z, color);
}

function addLabel(renderer, x, y, z, text, color) {
  const canvas  = document.createElement('canvas');
  canvas.width  = 512; canvas.height = 64;
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
