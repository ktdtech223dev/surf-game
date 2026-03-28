/**
 * MapFactory.js — Builds Three.js geometry + physics CollisionWorld for any catalog map
 * Usage: const { mapDesc, collisionWorld } = MapFactory.build(mapId, scene, renderer);
 */
import * as THREE from 'three';
import * as Vec3 from '../shared/physics/vec3.js';
import { CollisionWorld } from '../shared/physics/CollisionWorld.js';
import { MAP_BY_ID } from './MapCatalog.js';
import { getPalette, getAmbiance, makeMat, makeEdgeMat, buildGate } from './ArtStyle.js';
import { generateProceduralEntry } from './ProceduralMapGen.js';

// Tag for cleanup
const TAG = 'mapObj';

export const MapFactory = {

  clear(scene) {
    const toRemove = [];
    scene.traverse(obj => { if (obj.userData[TAG]) toRemove.push(obj); });
    toRemove.forEach(obj => { if (obj.parent) obj.parent.remove(obj); });
  },

  /**
   * Build map visuals + physics. Returns { mapDesc, collisionWorld }.
   * Dispatches to _buildFromDef after resolving the definition.
   */
  build(mapId, scene) {
    this.clear(scene);

    const def = MAP_BY_ID[mapId];

    // Handle procedural maps
    if (!def && mapId.startsWith('proc_')) {
      const seed = parseInt(mapId.slice(5)) || 12345;
      const procDef = generateProceduralEntry(seed);
      return this._buildFromDef(mapId, procDef, scene);
    }
    if (!def) {
      console.warn('[MapFactory] Unknown map:', mapId, '— falling back to map_01');
      return this.build('map_01', scene);
    }
    return this._buildFromDef(mapId, def, scene);
  },

  /**
   * Build map from a definition object directly.
   */
  _buildFromDef(mapId, def, scene) {
    const pal   = getPalette(def.paletteKey);
    const amb   = getAmbiance(def.difficulty);
    const world = new CollisionWorld();

    // ── Scene ambiance ──────────────────────────────────────────────────────
    scene.background = new THREE.Color(pal.sky);
    scene.fog        = new THREE.Fog(pal.fog, amb.fogNear, amb.fogFar);

    const oldLights = [];
    scene.traverse(obj => { if (obj.isLight) oldLights.push(obj); });
    oldLights.forEach(l => scene.remove(l));
    const dir = new THREE.DirectionalLight(amb.lightColor ?? 0xffffff, amb.lightIntensity ?? 0.8);
    dir.position.set(200, 500, 200);
    scene.add(dir);
    scene.add(new THREE.AmbientLight(amb.ambientColor ?? 0x223344, amb.ambientIntensity ?? 0.4));

    // ── Build sections ──────────────────────────────────────────────────────
    const { sections, padLens, spawnY = 0 } = def;
    let curZ = 0;
    let curY = spawnY;

    // Spawn pad
    const spawnLen = padLens[0] ?? 300;
    _buildPad(scene, world, 0, curY - 10, curZ + spawnLen / 2, 700, 20, spawnLen, pal, TAG);
    curZ += spawnLen;

    // Direction arrow on spawn pad
    _addArrow(scene, 0, curY + 1, curZ - spawnLen / 2 + 80, TAG);

    const sectionBounds = [];

    for (let si = 0; si < sections.length; si++) {
      const sec    = sections[si];
      const outerX = sec.w / 2 + 60;  // distance from center to outer edge
      const startZ = curZ;
      const startY = curY;
      const endZ   = curZ + sec.depth;
      const dropAbs = Math.abs(sec.dropY);
      const endY   = curY + sec.dropY; // dropY is negative

      // ── Physics quads (exact geometry) ──────────────────────────────────
      // Left ramp: outer edge at -outerX, inner edge at 0
      const lv0 = Vec3.create(-outerX, startY, startZ);
      const lv1 = Vec3.create(      0, endY,   startZ);
      const lv2 = Vec3.create(      0, endY,   endZ);
      const lv3 = Vec3.create(-outerX, startY, endZ);
      const lNorm = Vec3.normalize(Vec3.create(dropAbs, outerX, 0));
      world.addQuadWithNormal(lv0, lv1, lv2, lv3, lNorm);

      // Right ramp
      const rv0 = Vec3.create(outerX, startY, startZ);
      const rv1 = Vec3.create(     0, endY,   startZ);
      const rv2 = Vec3.create(     0, endY,   endZ);
      const rv3 = Vec3.create(outerX, startY, endZ);
      const rNorm = Vec3.normalize(Vec3.create(-dropAbs, outerX, 0));
      world.addQuadWithNormal(rv0, rv1, rv2, rv3, rNorm);

      // ── Visual ramp meshes ────────────────────────────────────────────
      _addRampMesh(scene, [lv0, lv1, lv2, lv3], pal.ramp, pal.edge, TAG);
      _addRampMesh(scene, [rv0, rv1, rv2, rv3], pal.ramp, pal.edge, TAG);

      // ── Ceiling for narrower sections ─────────────────────────────────
      if (sec.w < 280) {
        const ceilW = outerX * 2 + 40;
        const ceilH = outerX * 0.9;
        const midY  = (startY + endY) / 2 + ceilH;
        _buildBox(scene, 0, midY, startZ + sec.depth / 2,
          ceilW, 14, sec.depth, pal.ramp, pal.edge, TAG);
      }

      // ── Side ledges (for players to recover) ─────────────────────────
      const ledgeW  = 60;
      const ledgeMidZ = startZ + sec.depth / 2;
      world.addFloor(-outerX - ledgeW / 2, ledgeMidZ, ledgeW, sec.depth, startY);
      world.addFloor( outerX + ledgeW / 2, ledgeMidZ, ledgeW, sec.depth, startY);

      // ── Checkpoint gate ───────────────────────────────────────────────
      const gateColor = si === 0 ? 0x00ff88 : si === 1 ? 0x00aaff : 0xaa44ff;
      const gate = buildGate({ x: 0, y: endY, z: endZ - 10, w: outerX * 2, h: 140, color: gateColor });
      gate.userData[TAG] = true;
      scene.add(gate);

      sectionBounds.push({ startZ, endZ, label: `S${si + 1}`, startY, endY, outerX });

      curZ = endZ;
      curY = endY;

      // ── Connector pad ─────────────────────────────────────────────────
      const padLen = padLens[si + 1] ?? 220;
      _buildPad(scene, world, 0, curY - 10, curZ + padLen / 2, 700, 20, padLen, pal, TAG);
      curZ += padLen;

      // ── Curved section overlaid on this connector pad (if defined) ────
      if (def.curvedSections) {
        for (const cs of def.curvedSections) {
          if (cs.afterPad === si) {
            // Place curve at the start of this connector pad
            const curveStartZ = curZ - padLen + 20;
            _buildCurvedSection(
              scene, world,
              0, curveStartZ,
              cs.radius, cs.angle,
              cs.width, cs.height ?? 18,
              curY, pal
            );
          }
        }
      }

      // ── Kill zone below this section ──────────────────────────────────
      world.addKillZone(
        Vec3.create(-4000, endY - 200, startZ),
        Vec3.create( 4000, endY - 40, curZ),
      );
    }

    // ── Finish gate ────────────────────────────────────────────────────────
    const finishGate = buildGate({ x: 0, y: curY, z: curZ, w: 600, h: 160, color: 0xffd700 });
    finishGate.userData[TAG] = true;
    scene.add(finishGate);

    // ── Finish pad ────────────────────────────────────────────────────────
    const finPad = padLens[sections.length] ?? 400;
    _buildPad(scene, world, 0, curY - 10, curZ + finPad / 2, 800, 20, finPad, pal, TAG);

    // ── Global kill band (below the lowest platform) ───────────────────
    world.addKillZone(
      Vec3.create(-4000, curY - 400, -500),
      Vec3.create( 4000, curY - 60,  curZ + finPad),
    );
    // OOB left/right
    world.addKillZone(Vec3.create(-4000, -5000, -500), Vec3.create(-600, 1000, curZ + 500));
    world.addKillZone(Vec3.create( 600,  -5000, -500), Vec3.create(4000, 1000, curZ + 500));

    // ── Background grid ────────────────────────────────────────────────
    const grid = new THREE.GridHelper(20000, 200, 0x111122, 0x0d0d18);
    grid.position.y = curY - 80;
    grid.userData[TAG] = true;
    scene.add(grid);

    // ── Build section HUD labels ───────────────────────────────────────
    const sectionZBounds = [];
    sectionZBounds.push({ label: 'SPAWN', maxZ: padLens[0] ?? 300, color: '#445' });
    let padZ = padLens[0] ?? 300;
    sectionBounds.forEach((s, i) => {
      sectionZBounds.push({ label: `S${i+1}`, maxZ: s.endZ, color: ['#3366cc','#00cc88','#aa44ff','#ff8800'][i] ?? '#888' });
      padZ = s.endZ + (padLens[i+1] ?? 220);
      sectionZBounds.push({ label: `PAD${i+1}`, maxZ: padZ, color: '#445' });
    });
    sectionZBounds.push({ label: 'FINISH', maxZ: Infinity, color: '#ffcc00' });

    const mapDesc = {
      id:         mapId,
      name:       def.name,
      difficulty: def.difficulty,
      knifeId:    def.knifeId,

      FINISH_Z:   curZ,
      FINISH_Y:   curY,
      SPAWN_Z:    0,
      SPAWN_Y:    spawnY,
      WORLD_MIN_Y: curY - 800,

      sectionBounds,
      sectionZBounds,
      palette: pal,
    };

    return { mapDesc, collisionWorld: world };
  },
};

// ── Curved section builder ────────────────────────────────────────────────────
/**
 * _buildCurvedSection — Adds 8 short angled ramp box segments arranged in an arc,
 * approximating a smooth S-turn or U-turn.
 *
 * @param {THREE.Scene}   scene
 * @param {CollisionWorld} collisionBoxes  — collision world to register floors into
 * @param {number} x       — center X of the arc
 * @param {number} z       — start Z of the arc
 * @param {number} radius  — arc radius (controls how wide the curve is)
 * @param {number} angle   — total arc sweep in radians (positive = right turn, negative = left)
 * @param {number} width   — width of each segment box
 * @param {number} height  — height (vertical thickness) of each segment box
 * @param {number} y       — base Y of the section
 * @param {object} pal     — palette object from getPalette()
 * @returns {{ endX, endZ }}  — XZ position after the curve
 */
function _buildCurvedSection(scene, collisionBoxes, x, z, radius, angle, width, height, y, pal) {
  const SEGMENTS  = 8;
  const arcStep   = angle / SEGMENTS;
  const segLen    = Math.abs(radius * arcStep);  // arc length per segment

  let curAngle = 0;  // accumulated angle along the arc (starts pointing in +Z direction)
  let cx = x;
  let cz = z;

  for (let i = 0; i < SEGMENTS; i++) {
    const midAngle = curAngle + arcStep * 0.5;
    const cosA = Math.cos(midAngle);
    const sinA = Math.sin(midAngle);

    // Segment center position
    const segCx = cx + sinA * segLen * 0.5;
    const segCz = cz + cosA * segLen * 0.5;

    // Build box for this segment (rotated by midAngle)
    const geo  = new THREE.BoxGeometry(width, height, segLen + 2);
    const mesh = new THREE.Mesh(geo, makeMat(pal.ramp ?? 0x112233));
    mesh.position.set(segCx, y - height / 2, segCz);
    mesh.rotation.y = -midAngle;  // negate so the box faces along the travel direction
    mesh.userData[TAG] = true;
    mesh.add(new THREE.LineSegments(
      new THREE.EdgesGeometry(geo),
      new THREE.LineBasicMaterial({ color: pal.edge ?? 0x00cfff, opacity: 0.6, transparent: true })
    ));
    scene.add(mesh);

    // Register as a physics floor (axis-aligned approximation per segment)
    collisionBoxes.addFloor(segCx, segCz, width, segLen + 2, y);

    // Advance to the end of this segment
    curAngle += arcStep;
    cx += Math.sin(curAngle) * segLen;
    cz += Math.cos(curAngle) * segLen;
  }

  return { endX: cx, endZ: cz };
}

// ── Visual helpers ────────────────────────────────────────────────────────────

function _addRampMesh(scene, verts, color, edgeColor, tag) {
  const [v0, v1, v2, v3] = verts;
  const positions = new Float32Array([
    v0.x, v0.y, v0.z,  v1.x, v1.y, v1.z,  v2.x, v2.y, v2.z,
    v0.x, v0.y, v0.z,  v2.x, v2.y, v2.z,  v3.x, v3.y, v3.z,
  ]);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, makeMat(color, { side: THREE.DoubleSide }));
  mesh.userData[tag] = true;
  scene.add(mesh);
  // Top edge glow line
  _addLine(scene, v0, v3, edgeColor, tag);
  _addLine(scene, v1, v2, color + 0x111111, tag);
}

function _addLine(scene, a, b, color, tag) {
  const geo = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(a.x, a.y, a.z),
    new THREE.Vector3(b.x, b.y, b.z),
  ]);
  const line = new THREE.Line(geo, new THREE.LineBasicMaterial({ color, opacity: 0.8, transparent: true }));
  line.userData[tag] = true;
  scene.add(line);
}

function _buildPad(scene, world, x, y, z, w, h, d, pal, tag) {
  const geo  = new THREE.BoxGeometry(w, h, d);
  const mesh = new THREE.Mesh(geo, makeMat(pal.pad ?? 0x080808));
  mesh.position.set(x, y, z);
  mesh.userData[tag] = true;
  mesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo), makeEdgeMat(0x1a1a2a)));
  scene.add(mesh);
  world.addFloor(x, z, w, d, y + h / 2);
}

function _buildBox(scene, x, y, z, w, h, d, color, edgeColor, tag) {
  const geo  = new THREE.BoxGeometry(w, h, d);
  const mesh = new THREE.Mesh(geo, makeMat(color));
  mesh.position.set(x, y, z);
  mesh.userData[tag] = true;
  mesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo), makeEdgeMat(edgeColor)));
  scene.add(mesh);
}

function _addArrow(scene, x, y, z, tag) {
  const pts = [
    new THREE.Vector3(x - 30, y, z - 50),
    new THREE.Vector3(x,      y, z + 50),
    new THREE.Vector3(x + 30, y, z - 50),
    new THREE.Vector3(x,      y, z - 15),
    new THREE.Vector3(x - 30, y, z - 50),
  ];
  const line = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints(pts),
    new THREE.LineBasicMaterial({ color: 0x00ff88, opacity: 0.6, transparent: true })
  );
  line.userData[tag] = true;
  scene.add(line);
}
