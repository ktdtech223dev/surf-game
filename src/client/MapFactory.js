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

// Direction helpers — heading `a` (radians, 0 = along +Z)
const _fwd = a => ({ x: Math.sin(a), z: Math.cos(a) });
const _rgt = a => ({ x: Math.cos(a), z: -Math.sin(a) });

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
    let curX = 0, curZ = 0;   // world-space position of section inner-center start
    let curY     = spawnY;
    let curAngle = 0;          // heading in radians; 0 = +Z forward

    // Spawn pad
    const spawnLen = padLens[0] ?? 400;
    {
      const f = _fwd(curAngle);
      const cx = curX + f.x * spawnLen / 2;
      const cz = curZ + f.z * spawnLen / 2;
      _buildPad(scene, world, cx, curY - 10, cz, 700, 20, spawnLen, curAngle, pal, TAG);
      _addArrow(scene, cx, curY + 1, cz, curAngle, TAG);
      curX += f.x * spawnLen;
      curZ += f.z * spawnLen;
    }

    const sectionBounds = [];

    for (let si = 0; si < sections.length; si++) {
      const sec     = sections[si];
      const outerX  = sec.w / 2 + 60;
      const dropAbs = Math.abs(sec.dropY);
      const depth   = sec.depth;
      const startY  = curY;
      const endY    = curY + sec.dropY;

      const f = _fwd(curAngle);
      const r = _rgt(curAngle);

      // Inner (center, low) start/end
      const iSx = curX,              iSz = curZ;
      const iEx = curX + f.x * depth, iEz = curZ + f.z * depth;

      // Left outer (high) start/end
      const lSx = iSx - r.x * outerX, lSz = iSz - r.z * outerX;
      const lEx = iEx - r.x * outerX, lEz = iEz - r.z * outerX;

      // Right outer (high) start/end
      const rSx = iSx + r.x * outerX, rSz = iSz + r.z * outerX;
      const rEx = iEx + r.x * outerX, rEz = iEz + r.z * outerX;

      // ── Physics quads ──────────────────────────────────────────────────
      const lv0 = Vec3.create(lSx, startY, lSz);
      const lv1 = Vec3.create(iSx, endY,   iSz);
      const lv2 = Vec3.create(iEx, endY,   iEz);
      const lv3 = Vec3.create(lEx, startY, lEz);
      const lNorm = Vec3.normalize(Vec3.create(dropAbs * r.x, outerX, dropAbs * r.z));
      world.addQuadWithNormal(lv0, lv1, lv2, lv3, lNorm);

      const rv0 = Vec3.create(rSx, startY, rSz);
      const rv1 = Vec3.create(iSx, endY,   iSz);
      const rv2 = Vec3.create(iEx, endY,   iEz);
      const rv3 = Vec3.create(rEx, startY, rEz);
      const rNorm = Vec3.normalize(Vec3.create(-dropAbs * r.x, outerX, -dropAbs * r.z));
      world.addQuadWithNormal(rv0, rv1, rv2, rv3, rNorm);

      // ── Visual ramp meshes ─────────────────────────────────────────────
      _addRampMesh(scene, [lv0, lv1, lv2, lv3], pal.ramp, pal.edge, TAG);
      _addRampMesh(scene, [rv0, rv1, rv2, rv3], pal.ramp, pal.edge, TAG);

      // ── Side ledges (physics) ──────────────────────────────────────────
      const ledgeW = 60;
      const midX = (iSx + iEx) / 2, midZ = (iSz + iEz) / 2;
      world.addFloor(midX - r.x * (outerX + ledgeW / 2), midZ - r.z * (outerX + ledgeW / 2), ledgeW, depth, startY);
      world.addFloor(midX + r.x * (outerX + ledgeW / 2), midZ + r.z * (outerX + ledgeW / 2), ledgeW, depth, startY);

      // ── Checkpoint gate ────────────────────────────────────────────────
      const gateColor = [0x00ff88, 0x00aaff, 0xaa44ff, 0xff6600, 0xff00aa, 0xffff00,
                         0x00ffcc, 0xff4400, 0x44ffaa][si % 9];
      const gate = buildGate({ x: iEx, y: endY, z: iEz, w: outerX * 2, h: 140, color: gateColor, angle: curAngle });
      gate.userData[TAG] = true;
      scene.add(gate);

      sectionBounds.push({ startZ: iSz, endZ: iEz, startX: iSx, endX: iEx, label: `S${si + 1}`, startY, endY, outerX });

      curX = iEx; curZ = iEz; curY = endY;

      // ── Connector pad ─────────────────────────────────────────────────
      const padLen = padLens[si + 1] ?? 240;
      {
        const pf = _fwd(curAngle);
        const pcx = curX + pf.x * padLen / 2;
        const pcz = curZ + pf.z * padLen / 2;
        _buildPad(scene, world, pcx, curY - 10, pcz, 700, 20, padLen, curAngle, pal, TAG);

        // ── Curved sections on this pad ──────────────────────────────────
        if (def.curvedSections) {
          for (const cs of def.curvedSections) {
            if (cs.afterPad === si) {
              // Start 30 units into the pad, in the current heading
              const csX = curX + pf.x * 30;
              const csZ = curZ + pf.z * 30;
              _buildCurvedSection(scene, world, csX, csZ, cs.radius, cs.angle,
                cs.width, cs.height ?? 20, curY, pal, def.bankRatio ?? 4.0, curAngle);
              curAngle += cs.angle; // advance heading after the curve
            }
          }
        }

        // Advance position to end of pad (the pad was built in direction pf)
        curX += pf.x * padLen;
        curZ += pf.z * padLen;
      }
    }

    // ── Finish gate ────────────────────────────────────────────────────────
    const finishGate = buildGate({ x: curX, y: curY, z: curZ, w: 600, h: 160, color: 0xffd700, angle: curAngle });
    finishGate.userData[TAG] = true;
    scene.add(finishGate);

    // ── Finish pad ────────────────────────────────────────────────────────
    const finPad = padLens[sections.length] ?? 500;
    {
      const ff = _fwd(curAngle);
      const fcx = curX + ff.x * finPad / 2;
      const fcz = curZ + ff.z * finPad / 2;
      _buildPad(scene, world, fcx, curY - 10, fcz, 800, 20, finPad, curAngle, pal, TAG);
    }

    // ── Global bottom kill zone ─────────────────────────────────────────
    const lowestY = sectionBounds.reduce((m, s) => Math.min(m, s.endY), curY);
    // Wide enough to cover expert maps that spread 12 000+ units in X
    world.addKillZone(Vec3.create(-20000, lowestY - 400, -20000), Vec3.create(20000, lowestY - 60, 20000));

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

      FINISH_X:    curX,
      FINISH_Z:    curZ,
      FINISH_Y:    curY,
      SPAWN_X:     0,
      SPAWN_Z:     0,
      SPAWN_Y:     spawnY,
      WORLD_MIN_Y: lowestY - 500,

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
function _buildCurvedSection(scene, world, x, z, radius, totalAngle, rampWidth, _height, y, pal, bankRatio = 4.0, initialAngle = 0) {
  // More segments = smoother curve
  const SEGS     = 14;
  const arcStep  = totalAngle / SEGS;
  const outerHalfW = rampWidth / 2 + 50;

  const bankH      = outerHalfW * bankRatio;
  const dropPerSeg = outerHalfW * 0.015;

  let facingAngle = initialAngle;   // start in the current map heading
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

// angle = heading in radians; the pad box is rotated around Y so depth aligns with heading
function _buildPad(scene, world, cx, y, cz, w, h, d, angle, pal, tag) {
  const geo  = new THREE.BoxGeometry(w, h, d);
  const mesh = new THREE.Mesh(geo, makeMat(pal.pad ?? 0x080808));
  mesh.position.set(cx, y, cz);
  mesh.rotation.y = angle;
  mesh.userData[tag] = true;
  mesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo), makeEdgeMat(0x1a1a2a)));
  scene.add(mesh);
  // Physics footprint: use a square from the larger of w/d so it covers any rotation
  const fp = Math.max(w, d);
  world.addFloor(cx, cz, fp, fp, y + h / 2);
}

function _buildBox(scene, x, y, z, w, h, d, color, edgeColor, tag) {
  const geo  = new THREE.BoxGeometry(w, h, d);
  const mesh = new THREE.Mesh(geo, makeMat(color));
  mesh.position.set(x, y, z);
  mesh.userData[tag] = true;
  mesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo), makeEdgeMat(edgeColor)));
  scene.add(mesh);
}

// Arrow pointing in the direction of `angle` (0 = +Z forward)
function _addArrow(scene, x, y, z, angle, tag) {
  const s = Math.sin(angle), c = Math.cos(angle);
  // Local coords: tip at (0, 0, 50), base at (±30, 0, -50), notch at (0, 0, -15)
  const local = [
    { lx: -30, lz: -50 },
    { lx:   0, lz:  50 },
    { lx:  30, lz: -50 },
    { lx:   0, lz: -15 },
    { lx: -30, lz: -50 },
  ];
  const pts = local.map(p => new THREE.Vector3(
    x + p.lx * c + p.lz * s,
    y,
    z - p.lx * s + p.lz * c,
  ));
  const line = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints(pts),
    new THREE.LineBasicMaterial({ color: 0x00ff88, opacity: 0.6, transparent: true })
  );
  line.userData[tag] = true;
  scene.add(line);
}
