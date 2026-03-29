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

    // Remove old lights
    const oldLights = [];
    scene.traverse(obj => { if (obj.isLight) oldLights.push(obj); });
    oldLights.forEach(l => scene.remove(l));

    // Main directional light
    const dir = new THREE.DirectionalLight(amb.lightColor ?? 0xffffff, amb.lightIntensity ?? 0.8);
    dir.position.set(200, 500, 200);
    scene.add(dir);
    scene.add(new THREE.AmbientLight(amb.ambientColor ?? 0x223344, amb.ambientIntensity ?? 0.4));

    // ── Dynamic skybox ──────────────────────────────────────────────────────
    _buildSkybox(scene, pal, amb, def.difficulty, TAG);

    // ── Build sections ──────────────────────────────────────────────────────
    const { sections, padLens, spawnY = 0 } = def;
    let curZ = 0;
    let curY = spawnY;

    // Spawn pad
    const spawnLen = padLens[0] ?? 400;
    _buildPad(scene, world, 0, curY - 10, curZ + spawnLen / 2, 700, 20, spawnLen, pal, TAG);
    curZ += spawnLen;

    // Direction arrow on spawn pad
    _addArrow(scene, 0, curY + 1, curZ - spawnLen / 2 + 80, TAG);

    const sectionBounds = [];

    for (let si = 0; si < sections.length; si++) {
      const sec     = sections[si];
      const outerX  = sec.w / 2 + 60;
      const startZ  = curZ;
      const startY  = curY;
      const endZ    = curZ + sec.depth;
      const dropAbs = Math.abs(sec.dropY);
      const endY    = curY + sec.dropY; // negative

      // ── Physics quads (exact ramp geometry) ────────────────────────────
      // Left ramp: outer edge at -outerX (high), inner edge at 0 (low)
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

      // ── Side ledges ────────────────────────────────────────────────────
      const ledgeW   = 60;
      const ledgeMidZ = startZ + sec.depth / 2;
      world.addFloor(-outerX - ledgeW / 2, ledgeMidZ, ledgeW, sec.depth, startY);
      world.addFloor( outerX + ledgeW / 2, ledgeMidZ, ledgeW, sec.depth, startY);

      // ── Checkpoint gate ───────────────────────────────────────────────
      const gateColor = [0x00ff88, 0x00aaff, 0xaa44ff, 0xff6600, 0xff00aa, 0xffff00,
                         0x00ffcc, 0xff4400, 0x44ffaa][si % 9];
      const gate = buildGate({ x: 0, y: endY, z: endZ - 10, w: outerX * 2, h: 140, color: gateColor });
      gate.userData[TAG] = true;
      scene.add(gate);

      sectionBounds.push({ startZ, endZ, label: `S${si + 1}`, startY, endY, outerX });

      curZ = endZ;
      curY = endY;

      // ── Connector pad ─────────────────────────────────────────────────
      const padLen = padLens[si + 1] ?? 240;
      _buildPad(scene, world, 0, curY - 10, curZ + padLen / 2, 700, 20, padLen, pal, TAG);
      curZ += padLen;

      // ── Curved section on connector pad ──────────────────────────────
      if (def.curvedSections) {
        for (const cs of def.curvedSections) {
          if (cs.afterPad === si) {
            const curveStartZ = curZ - padLen + 30;
            _buildCurvedSection(
              scene, world,
              0, curveStartZ,
              cs.radius, cs.angle,
              cs.width, cs.height ?? 20,
              curY, pal,
              def.bankRatio ?? 4.0
            );
          }
        }
      }

      // ── Kill zone below this section ──────────────────────────────────
      world.addKillZone(
        Vec3.create(-4000, endY - 250, startZ),
        Vec3.create( 4000, endY - 40, curZ),
      );
    }

    // ── Finish gate ────────────────────────────────────────────────────────
    const finishGate = buildGate({ x: 0, y: curY, z: curZ, w: 600, h: 160, color: 0xffd700 });
    finishGate.userData[TAG] = true;
    scene.add(finishGate);

    // ── Finish pad ────────────────────────────────────────────────────────
    const finPad = padLens[sections.length] ?? 500;
    _buildPad(scene, world, 0, curY - 10, curZ + finPad / 2, 800, 20, finPad, pal, TAG);

    // ── Global kill bands ──────────────────────────────────────────────
    world.addKillZone(
      Vec3.create(-4000, curY - 450, -500),
      Vec3.create( 4000, curY - 60,  curZ + finPad),
    );
    world.addKillZone(Vec3.create(-4000, -5000, -500), Vec3.create(-650, 1000, curZ + 500));
    world.addKillZone(Vec3.create( 650,  -5000, -500), Vec3.create(4000, 1000, curZ + 500));

    // ── Background grid ────────────────────────────────────────────────
    const grid = new THREE.GridHelper(40000, 300, 0x223344, 0x1a2a3a);
    grid.position.y = curY - 100;
    grid.userData[TAG] = true;
    scene.add(grid);

    // ── Section HUD labels ─────────────────────────────────────────────
    const sectionZBounds = [];
    sectionZBounds.push({ label: 'SPAWN', maxZ: padLens[0] ?? 400, color: '#445' });
    let padZ = padLens[0] ?? 400;
    sectionBounds.forEach((s, i) => {
      sectionZBounds.push({ label: `S${i+1}`, maxZ: s.endZ, color: ['#3366cc','#00cc88','#aa44ff','#ff8800','#ff0088','#ffcc00','#00ffcc','#ff4400','#44ffaa'][i] ?? '#888' });
      padZ = s.endZ + (padLens[i+1] ?? 240);
      sectionZBounds.push({ label: `PAD${i+1}`, maxZ: padZ, color: '#445' });
    });
    sectionZBounds.push({ label: 'FINISH', maxZ: Infinity, color: '#ffcc00' });

    const mapDesc = {
      id:         mapId,
      name:       def.name,
      difficulty: def.difficulty,
      knifeId:    def.knifeId,

      FINISH_Z:    curZ,
      FINISH_Y:    curY,
      SPAWN_Z:     0,
      SPAWN_Y:     spawnY,
      WORLD_MIN_Y: curY - 1000,

      sectionBounds,
      sectionZBounds,
      palette: pal,
    };

    return { mapDesc, collisionWorld: world };
  },
};

// ── Dynamic Skybox ────────────────────────────────────────────────────────────
/**
 * Build an animated skybox using a large sphere with vertex-colored gradient,
 * plus particle stars for dark maps and atmospheric effects.
 */
function _buildSkybox(scene, pal, amb, difficulty, tag) {
  // Remove any existing skybox
  const existing = [];
  scene.traverse(o => { if (o.userData.skybox) existing.push(o); });
  existing.forEach(o => scene.remove(o));

  const skyColor   = new THREE.Color(pal.sky);
  const horizColor = new THREE.Color(pal.fog);

  // Sky dome — large sphere with gradient shading
  const domeGeo = new THREE.SphereGeometry(15000, 32, 16);
  const posAttr = domeGeo.attributes.position;
  const colors  = new Float32Array(posAttr.count * 3);

  for (let i = 0; i < posAttr.count; i++) {
    const y = posAttr.getY(i);
    // Normalize height: -1 (bottom) to +1 (top) relative to sphere
    const t = Math.max(0, Math.min(1, (y / 15000 + 1) * 0.5));
    const c = new THREE.Color().lerpColors(horizColor, skyColor, t * t);
    colors[i * 3]     = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
  }

  domeGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const domeMat = new THREE.MeshBasicMaterial({
    vertexColors: true,
    side: THREE.BackSide,
    depthWrite: false,
  });
  const dome = new THREE.Mesh(domeGeo, domeMat);
  dome.userData[tag] = true;
  dome.userData.skybox = true;
  dome.renderOrder = -1;
  scene.add(dome);

  // ── Star field (for dark maps only) ────────────────────────────────────
  const skyBrightness = skyColor.r + skyColor.g + skyColor.b;
  if (skyBrightness < 0.25) {
    const starCount = difficulty === 'expert' ? 3000 : difficulty === 'advanced' ? 2000 : 1200;
    _buildStars(scene, starCount, pal.edge, tag);
  }

  // ── Glowing horizon line ────────────────────────────────────────────────
  const ringGeo = new THREE.TorusGeometry(12000, 40, 4, 80);
  const ringMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color(pal.edge),
    transparent: true,
    opacity: 0.08,
  });
  const ring = new THREE.Mesh(ringGeo, ringMat);
  ring.rotation.x = Math.PI / 2;
  ring.userData[tag] = true;
  ring.userData.skybox = true;
  ring.renderOrder = -1;
  scene.add(ring);
}

function _buildStars(scene, count, edgeColor, tag) {
  const starVerts = new Float32Array(count * 3);
  const r = 12000;

  for (let i = 0; i < count; i++) {
    // Random point on sphere surface
    const theta = Math.random() * Math.PI * 2;
    const phi   = Math.acos(2 * Math.random() - 1);
    const x = r * Math.sin(phi) * Math.cos(theta);
    const y = r * Math.sin(phi) * Math.sin(theta);
    const z = r * Math.cos(phi);
    starVerts[i * 3]     = x;
    starVerts[i * 3 + 1] = Math.abs(y) * 0.8 + 500; // mostly upper hemisphere
    starVerts[i * 3 + 2] = z;
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(starVerts, 3));
  const mat = new THREE.PointsMaterial({
    color: new THREE.Color(edgeColor).lerp(new THREE.Color(0xffffff), 0.7),
    size: 12,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.85,
  });
  const stars = new THREE.Points(geo, mat);
  stars.userData[tag] = true;
  stars.userData.skybox = true;
  stars.renderOrder = -1;
  scene.add(stars);
}

// ── Curved section builder ────────────────────────────────────────────────────
/**
 * Builds a curved banked connector between ramp sections.
 * Creates proper surfable V-ramp segments arranged in an arc, with correct
 * physics normals so players can surf each segment.
 *
 * Each segment is a mini-ramp section rotated to follow the arc direction.
 * The ramp V-shape is computed in a local coordinate system and then rotated
 * into world space.
 */
function _buildCurvedSection(scene, world, x, z, radius, totalAngle, rampWidth, _height, y, pal, bankRatio = 4.0) {
  // More segments = smoother curve
  const SEGS     = 14;
  const arcStep  = totalAngle / SEGS;
  const outerHalfW = rampWidth / 2 + 50;

  // Bank height: outer edges are bankH units ABOVE inner (center) edge.
  // bankRatio is passed from the map definition so curves match the
  // straight section bank angle of the same map.
  const BANK_RATIO = bankRatio;
  const bankH = outerHalfW * BANK_RATIO;

  // Travel drop: very gentle — curves sit on flat connector pads so they
  // should barely descend along the direction of travel.
  // ~1.5 % of outerHalfW per segment keeps the curve nearly flat while
  // still giving physics a slight downward slope to work with.
  const dropPerSeg = outerHalfW * 0.015;

  let facingAngle = 0;
  let cx = x, cz = z, cy = y;

  for (let i = 0; i < SEGS; i++) {
    const midAngle = facingAngle + arcStep * 0.5;

    // Forward and right axes in the XZ plane for this segment
    const fwdX  =  Math.sin(midAngle);
    const fwdZ  =  Math.cos(midAngle);
    const rightX =  Math.cos(midAngle);
    const rightZ = -Math.sin(midAngle);

    // Arc-length for this segment (no padding — adds to staircase look)
    const segLen = Math.abs(radius * arcStep);

    // End position of this segment
    const nx = cx + fwdX * segLen;
    const nz = cz + fwdZ * segLen;

    // Inner (center, low) and outer (edges, high) heights.
    // bankH separates them to produce the steep ~75° surf-ramp cross-section.
    // dropPerSeg is the tiny travel-direction descent along the arc.
    const innerSy = cy;
    const innerEy = cy - dropPerSeg;
    const outerSy = cy + bankH;
    const outerEy = cy - dropPerSeg + bankH;

    // ── Left ramp: outer-left (high) → inner-center (low) ────────────────
    const lv0 = Vec3.create(cx - rightX * outerHalfW, outerSy, cz - rightZ * outerHalfW);
    const lv1 = Vec3.create(cx,                        innerSy, cz                       );
    const lv2 = Vec3.create(nx,                        innerEy, nz                       );
    const lv3 = Vec3.create(nx - rightX * outerHalfW,  outerEy, nz - rightZ * outerHalfW);

    // Normal points from inner surface toward where the player rides
    // (rightward + upward, mirroring straight-section convention)
    const lNorm = Vec3.normalize(Vec3.create( bankH * rightX, outerHalfW,  bankH * rightZ));
    world.addQuadWithNormal(lv0, lv1, lv2, lv3, lNorm);
    _addRampMesh(scene, [lv0, lv1, lv2, lv3], pal.ramp, pal.edge, TAG);

    // ── Right ramp: outer-right (high) → inner-center (low) ──────────────
    const rv0 = Vec3.create(cx + rightX * outerHalfW, outerSy, cz + rightZ * outerHalfW);
    const rv1 = Vec3.create(cx,                        innerSy, cz                       );
    const rv2 = Vec3.create(nx,                        innerEy, nz                       );
    const rv3 = Vec3.create(nx + rightX * outerHalfW,  outerEy, nz + rightZ * outerHalfW);

    const rNorm = Vec3.normalize(Vec3.create(-bankH * rightX, outerHalfW, -bankH * rightZ));
    world.addQuadWithNormal(rv0, rv1, rv2, rv3, rNorm);
    _addRampMesh(scene, [rv0, rv1, rv2, rv3], pal.ramp, pal.edge, TAG);

    // ── Floor at inner level ──────────────────────────────────────────────
    world.addFloor(
      (cx + nx) * 0.5, (cz + nz) * 0.5,
      rampWidth, segLen, innerEy,
    );

    // Advance along the arc
    facingAngle += arcStep;
    cx = nx; cz = nz; cy = innerEy;
  }
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
