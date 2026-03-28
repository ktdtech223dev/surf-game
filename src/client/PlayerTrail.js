/**
 * PlayerTrail — Speed-reactive particle trail behind the player while surfing
 * Color encodes speed: dark-blue → cyan → yellow → orange → red
 * Uses a pool of Three.js Points for performance.
 */
import * as THREE from 'three';

const TRAIL_SIZE   = 300;  // max simultaneous trail particles
const TRAIL_LIFE   = 0.55; // seconds each particle lives
const EMIT_RATE    = 0.022; // seconds between emissions (at full speed)
const MIN_SPEED    = 180;  // u/s — no trail below this
const PEAK_SPEED   = 1600; // u/s — max color/opacity

// Speed → color stops (speed in u/s, color hex)
const COLOR_STOPS = [
  { spd:  180, r: 0.10, g: 0.20, b: 0.60 }, // dark blue
  { spd:  400, r: 0.00, g: 0.75, b: 1.00 }, // cyan
  { spd:  700, r: 0.20, g: 1.00, b: 0.60 }, // green-cyan
  { spd: 1000, r: 1.00, g: 0.90, b: 0.00 }, // yellow
  { spd: 1300, r: 1.00, g: 0.45, b: 0.00 }, // orange
  { spd: 1600, r: 1.00, g: 0.10, b: 0.10 }, // red
];

function _speedColor(speed) {
  const s = Math.max(0, speed);
  for (let i = 1; i < COLOR_STOPS.length; i++) {
    const a = COLOR_STOPS[i - 1];
    const b = COLOR_STOPS[i];
    if (s <= b.spd) {
      const t = (s - a.spd) / (b.spd - a.spd);
      return new THREE.Color(
        a.r + (b.r - a.r) * t,
        a.g + (b.g - a.g) * t,
        a.b + (b.b - a.b) * t
      );
    }
  }
  const last = COLOR_STOPS[COLOR_STOPS.length - 1];
  return new THREE.Color(last.r, last.g, last.b);
}

// ── Particle data arrays (typed for performance) ──────────────────────────────
export class PlayerTrail {
  constructor(scene) {
    this._scene = scene;

    // Typed arrays for particle state
    this._px   = new Float32Array(TRAIL_SIZE);
    this._py   = new Float32Array(TRAIL_SIZE);
    this._pz   = new Float32Array(TRAIL_SIZE);
    this._life = new Float32Array(TRAIL_SIZE);  // remaining life
    this._maxL = new Float32Array(TRAIL_SIZE);  // max life
    this._sr   = new Float32Array(TRAIL_SIZE);  // spawn color r
    this._sg   = new Float32Array(TRAIL_SIZE);  // spawn color g
    this._sb   = new Float32Array(TRAIL_SIZE);  // spawn color b
    this._head = 0;
    this._count = 0;

    // Geometry with mutable attributes
    this._geo    = new THREE.BufferGeometry();
    const positions = new Float32Array(TRAIL_SIZE * 3);
    const colors    = new Float32Array(TRAIL_SIZE * 3);
    const sizes     = new Float32Array(TRAIL_SIZE);
    this._posAttr   = new THREE.BufferAttribute(positions, 3);
    this._colAttr   = new THREE.BufferAttribute(colors, 3);
    this._sizeAttr  = new THREE.BufferAttribute(sizes, 1);
    this._geo.setAttribute('position', this._posAttr);
    this._geo.setAttribute('color',    this._colAttr);
    this._geo.setAttribute('size',     this._sizeAttr);
    this._geo.setDrawRange(0, 0);

    this._mat = new THREE.PointsMaterial({
      size:            14,
      sizeAttenuation: true,
      vertexColors:    true,
      transparent:     true,
      opacity:         0.85,
      depthWrite:      false,
      blending:        THREE.AdditiveBlending,
    });

    this._points = new THREE.Points(this._geo, this._mat);
    this._points.userData.permanent = false;
    this._points.frustumCulled = false;
    scene.add(this._points);

    this._emitTimer   = 0;
    this._enabled     = true;
  }

  get enabled() { return this._enabled; }
  set enabled(v) { this._enabled = v; }

  // ── Tick: called every frame ───────────────────────────────────────────────

  tick(dt, playerPos, hSpeed, onRamp) {
    // Emit new particle
    this._emitTimer -= dt;
    const emitInterval = EMIT_RATE * Math.max(0.2, 1 - (hSpeed - MIN_SPEED) / PEAK_SPEED);

    if (this._enabled && hSpeed > MIN_SPEED && this._emitTimer <= 0 && (onRamp || hSpeed > 350)) {
      this._emitTimer = emitInterval;
      const life = TRAIL_LIFE * (0.7 + 0.3 * Math.random());
      const col  = _speedColor(hSpeed);
      const i    = this._head % TRAIL_SIZE;
      this._px[i] = playerPos.x + (Math.random() - 0.5) * 4;
      this._py[i] = playerPos.y + 2 + Math.random() * 6;
      this._pz[i] = playerPos.z + (Math.random() - 0.5) * 4;
      this._life[i]   = life;
      this._maxL[i]   = life;
      this._sr[i] = col.r;
      this._sg[i] = col.g;
      this._sb[i] = col.b;
      this._head++;
      this._count = Math.min(this._count + 1, TRAIL_SIZE);
    }

    // Update alive particles + fill GPU buffers
    let writeIdx = 0;
    const pos  = this._posAttr.array;
    const cols = this._colAttr.array;
    const sizes = this._sizeAttr.array;

    for (let j = 0; j < TRAIL_SIZE; j++) {
      if (this._life[j] <= 0) continue;
      this._life[j] -= dt;
      if (this._life[j] <= 0) { this._life[j] = 0; continue; }

      const frac = this._life[j] / this._maxL[j]; // 1→0
      const base = writeIdx * 3;
      pos[base]     = this._px[j];
      pos[base + 1] = this._py[j] + (1 - frac) * 8; // rise as fades
      pos[base + 2] = this._pz[j];
      cols[base]     = this._sr[j] * frac;
      cols[base + 1] = this._sg[j] * frac;
      cols[base + 2] = this._sb[j] * frac;
      sizes[writeIdx] = 6 + frac * 18;
      writeIdx++;
    }

    this._geo.setDrawRange(0, writeIdx);
    this._posAttr.needsUpdate  = true;
    this._colAttr.needsUpdate  = true;
    this._sizeAttr.needsUpdate = true;
  }

  dispose() {
    this._scene.remove(this._points);
    this._geo.dispose();
    this._mat.dispose();
  }
}
