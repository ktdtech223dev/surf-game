/**
 * GhostSystem.js — Server-backed ghost replay system
 * Records at 60Hz, compresses with pako (zlib), uploads to /api/ghosts
 * Downloads & replays world-record ghost
 */
import * as THREE from 'three';
import { ds } from './DataService.js';

// We use pako for zlib compression (pure JS)
// Fallback: just raw binary if pako unavailable
let pako = null;
(async () => {
  try { pako = await import('https://cdn.jsdelivr.net/npm/pako@2.1.0/dist/pako.esm.mjs'); } catch {}
})();

const RECORD_HZ  = 60;
const FRAME_STEP = 1 / RECORD_HZ;
const MAX_FRAMES = 60 * 60 * 10; // 10 minutes max

export class GhostSystem {
  constructor(scene) {
    this.scene = scene;

    // Recording
    this._recording  = false;
    this._frames     = [];  // [{x,y,z,yaw}]
    this._accumTime  = 0;
    this._startTime  = 0;

    // Playback
    this._ghost      = null;    // { id, player_name, player_color, time_ms }
    this._ghostFrames = null;   // decoded frames array
    this._ghostMesh  = null;    // THREE.Mesh
    this._playback   = false;
    this._ghostT     = 0;

    // Label above ghost
    this._ghostLabel = null;
  }

  // ── Recording ──────────────────────────────────────────────────────────────

  startRecording() {
    this._recording = true;
    this._frames    = [];
    this._accumTime = 0;
    this._startTime = performance.now();
  }

  stopRecording() {
    this._recording = false;
  }

  /** Call every game tick with dt (seconds) and player position/yaw */
  tick(dt, position, yaw) {
    if (!this._recording) return;
    this._accumTime += dt;
    while (this._accumTime >= FRAME_STEP) {
      this._accumTime -= FRAME_STEP;
      if (this._frames.length < MAX_FRAMES) {
        this._frames.push(
          Math.round(position.x),
          Math.round(position.y),
          Math.round(position.z),
          Math.round(yaw * 1000)  // yaw × 1000 for precision
        );
      }
    }
  }

  /** Encode frames → ArrayBuffer, compress, upload if it's a PB */
  async upload(mapId, timeSec) {
    if (!this._frames.length) return;
    const timeMs = Math.round(timeSec * 1000);

    try {
      // Pack frames as Int16Array
      const raw = new Int16Array(this._frames);
      let buf = raw.buffer;

      // Compress with pako if available
      if (pako?.deflate) {
        const compressed = pako.deflate(new Uint8Array(buf));
        buf = compressed.buffer.slice(compressed.byteOffset, compressed.byteOffset + compressed.byteLength);
      }

      const res = await ds.submitGhost(mapId, timeMs, buf);
      console.log('[Ghost] Uploaded ghost:', res);
      return res;
    } catch (e) {
      console.warn('[Ghost] Upload failed:', e.message);
    }
  }

  // ── Playback ───────────────────────────────────────────────────────────────

  /** Fetch and start playing the WR ghost for a map */
  async loadTopGhost(mapId) {
    try {
      const ghostMeta = await ds.getTopGhost(mapId);
      if (!ghostMeta) { this.clearGhost(); return; }

      this._ghost = ghostMeta;
      const buf   = await ds.fetchGhostData(ghostMeta.id);

      // Decompress
      let raw;
      if (pako?.inflate) {
        try {
          const inflated = pako.inflate(new Uint8Array(buf));
          raw = new Int16Array(inflated.buffer.slice(inflated.byteOffset, inflated.byteOffset + inflated.byteLength));
        } catch {
          raw = new Int16Array(buf);
        }
      } else {
        raw = new Int16Array(buf);
      }

      // Decode frames: groups of 4 (x, y, z, yaw*1000)
      this._ghostFrames = [];
      for (let i = 0; i < raw.length - 3; i += 4) {
        this._ghostFrames.push({ x: raw[i], y: raw[i+1], z: raw[i+2], yaw: raw[i+3] / 1000 });
      }

      this._ensureGhostMesh(ghostMeta.player_color ?? '#888888');
      this._playback = true;
      this._ghostT   = 0;
      console.log(`[Ghost] Loaded ${this._ghostFrames.length} frames from ${ghostMeta.player_name}`);
    } catch (e) {
      console.warn('[Ghost] Load failed:', e.message);
      this.clearGhost();
    }
  }

  clearGhost() {
    if (this._ghostMesh) {
      this.scene.remove(this._ghostMesh);
      this._ghostMesh = null;
    }
    this._playback    = false;
    this._ghostFrames = null;
    this._ghost       = null;
  }

  /** Call every game tick with dt (seconds) to advance ghost playback */
  tickPlayback(dt) {
    if (!this._playback || !this._ghostFrames?.length || !this._ghostMesh) return;
    this._ghostT += dt * RECORD_HZ;
    const idx = Math.min(Math.floor(this._ghostT), this._ghostFrames.length - 1);
    const frame = this._ghostFrames[idx];
    this._ghostMesh.position.set(frame.x, frame.y + 36, frame.z);
    this._ghostMesh.rotation.y = frame.yaw;

    if (idx >= this._ghostFrames.length - 1) {
      // Loop
      this._ghostT = 0;
    }
  }

  _ensureGhostMesh(colorHex) {
    if (this._ghostMesh) { this.scene.remove(this._ghostMesh); }

    const geo   = new THREE.CapsuleGeometry(18, 36, 4, 8);
    const color = parseInt(colorHex.replace('#', ''), 16);
    const mat   = new THREE.MeshLambertMaterial({ color, transparent: true, opacity: 0.45 });
    this._ghostMesh = new THREE.Mesh(geo, mat);
    this._ghostMesh.userData.isGhost = true;
    this.scene.add(this._ghostMesh);
  }

  get isRecording() { return this._recording; }
  get frameCount()  { return this._frames.length / 4; }
  get ghostMeta()   { return this._ghost; }
}
