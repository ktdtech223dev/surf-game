/**
 * GhostRenderer — Phase 2
 * Renders remote players with:
 *  - Position interpolation (100 ms render delay, smooth movement)
 *  - Name + player-id label above ghost
 *  - HP bar
 *  - Hit-flash effect (brief red tint on damage)
 */

import * as THREE from 'three';

const GHOST_COLORS = [0x00cfff, 0xff4488, 0x00ff88, 0xffcc00, 0xff8800, 0xaa44ff, 0xff4444, 0x44ffff];

const BODY_H   = 52;
const BODY_R   = 13;
const HEAD_R   = 14;
const HEAD_Y   = 68;
const INTERP_DELAY = 120; // ms — render this far behind live position

export class GhostRenderer {
  constructor(scene) {
    this.scene  = scene;
    this.ghosts = new Map(); // id → GhostEntry
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  /** Called when a position snapshot arrives from the server */
  addSnapshot(id, snap, serverTime) {
    let g = this.ghosts.get(id);
    if (!g) g = this._createGhost(id);
    g.buffer.push({ t: serverTime ?? Date.now(), snap: { ...snap } });
    // Keep at most 20 snapshots
    if (g.buffer.length > 20) g.buffer.shift();
    // Update name/hp from snap extras if present
    if (snap.name !== undefined) this.setName(id, snap.name);
    if (snap.hp   !== undefined) this.setHp(id, snap.hp);
  }

  setName(id, name) {
    const g = this.ghosts.get(id);
    if (g) { g.name = name; this._rebuildLabel(g); }
  }

  setColor(id, hexStr) {
    const g = this.ghosts.get(id);
    if (!g) return;
    const color = parseInt(hexStr.replace('#', ''), 16);
    if (isNaN(color)) return;
    g.color = color;
    g.mats.forEach(m => m.color.setHex(color));
    this._rebuildLabel(g);
  }

  setHp(id, hp) {
    const g = this.ghosts.get(id);
    if (g) { g.hp = hp; this._updateHpBar(g); }
  }

  flashHit(id) {
    const g = this.ghosts.get(id);
    if (!g) return;
    // Briefly make the materials red
    g.mats.forEach(m => { m.color.setHex(0xff2200); });
    clearTimeout(g._flashTimer);
    g._flashTimer = setTimeout(() => {
      g.mats.forEach(m => m.color.setHex(g.color));
    }, 180);
  }

  remove(id) {
    const g = this.ghosts.get(id);
    if (!g) return;
    this.scene.remove(g.group);
    g.group.traverse(o => {
      if (o.geometry) o.geometry.dispose();
      if (o.material) o.material.dispose();
    });
    this.ghosts.delete(id);
  }

  clear() {
    for (const id of [...this.ghosts.keys()]) this.remove(id);
  }

  /** Call every render frame to advance interpolation */
  tick() {
    const renderTime = Date.now() - INTERP_DELAY;
    for (const [, g] of this.ghosts) {
      this._interpolate(g, renderTime);
      this._updateBillboards(g);
    }
  }

  // ── Ghost creation ─────────────────────────────────────────────────────────

  _createGhost(id) {
    const color  = GHOST_COLORS[id % GHOST_COLORS.length];
    const mat    = new THREE.MeshLambertMaterial({ color, transparent: true, opacity: 0.7 });
    const group  = new THREE.Group();

    const body = new THREE.Mesh(new THREE.CylinderGeometry(BODY_R, BODY_R, BODY_H, 10), mat);
    body.position.y = BODY_H / 2;
    group.add(body);

    const head = new THREE.Mesh(new THREE.SphereGeometry(HEAD_R, 10, 7), mat);
    head.position.y = HEAD_Y;
    group.add(head);

    // Direction chevron
    const chev = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(-10, 0, 0), new THREE.Vector3(0, 0, 20), new THREE.Vector3(10, 0, 0),
      ]),
      new THREE.LineBasicMaterial({ color, opacity: 0.5, transparent: true }),
    );
    chev.position.y = HEAD_Y;
    group.add(chev);

    // HP bar (canvas sprite)
    const hpCanvas = document.createElement('canvas');
    hpCanvas.width = 64; hpCanvas.height = 10;
    const hpTex = new THREE.CanvasTexture(hpCanvas);
    const hpSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: hpTex, transparent: true }));
    hpSprite.scale.set(60, 8, 1);
    hpSprite.position.y = HEAD_Y + HEAD_R + 18;
    group.add(hpSprite);

    // Name label (canvas sprite)
    const lblCanvas = document.createElement('canvas');
    lblCanvas.width = 256; lblCanvas.height = 32;
    const lblTex = new THREE.CanvasTexture(lblCanvas);
    const lblSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: lblTex, transparent: true }));
    lblSprite.scale.set(160, 20, 1);
    lblSprite.position.y = HEAD_Y + HEAD_R + 28;
    group.add(lblSprite);

    group.visible = false;
    this.scene.add(group);

    const entry = {
      group, color,
      mats: [mat],
      buffer: [],
      name: `Player ${id}`,
      hp: 100,
      hpCanvas, hpTex, hpSprite,
      lblCanvas, lblTex, lblSprite,
      _flashTimer: null,
    };
    this.ghosts.set(id, entry);
    this._updateHpBar(entry);
    this._rebuildLabel(entry);
    return entry;
  }

  // ── Interpolation ──────────────────────────────────────────────────────────

  _interpolate(g, renderTime) {
    const buf = g.buffer;
    if (buf.length === 0) return;

    // Find the two samples that straddle renderTime
    let before = null, after = null;
    for (let i = 0; i < buf.length; i++) {
      if (buf[i].t <= renderTime) before = buf[i];
      else { after = buf[i]; break; }
    }

    let snap;
    if (before && after) {
      const t = (renderTime - before.t) / (after.t - before.t);
      snap = {
        x:   _lerp(before.snap.x,   after.snap.x,   t),
        y:   _lerp(before.snap.y,   after.snap.y,   t),
        z:   _lerp(before.snap.z,   after.snap.z,   t),
        yaw: _lerpAngle(before.snap.yaw ?? 0, after.snap.yaw ?? 0, t),
      };
    } else if (before) {
      snap = before.snap;
    } else {
      snap = buf[0].snap;
    }

    g.group.position.set(snap.x, snap.y, snap.z);
    const chev = g.group.children[2];
    if (chev) chev.rotation.y = snap.yaw ?? 0;
    g.group.visible = true;

    // Prune old buffer entries (keep last 3 before renderTime)
    const cutoff = buf.findIndex(e => e.t > renderTime) - 3;
    if (cutoff > 0) g.buffer.splice(0, cutoff);
  }

  // ── Label / HP bar ─────────────────────────────────────────────────────────

  _updateHpBar(g) {
    const ctx = g.hpCanvas.getContext('2d');
    ctx.clearRect(0, 0, 64, 10);
    ctx.fillStyle = '#333';
    ctx.fillRect(0, 3, 64, 4);
    const hpFrac = Math.max(0, Math.min(1, g.hp / 100));
    const col = hpFrac > 0.5 ? '#0f0' : hpFrac > 0.25 ? '#ff0' : '#f00';
    ctx.fillStyle = col;
    ctx.fillRect(0, 3, Math.round(64 * hpFrac), 4);
    g.hpTex.needsUpdate = true;
  }

  _rebuildLabel(g) {
    const ctx = g.lblCanvas.getContext('2d');
    ctx.clearRect(0, 0, 256, 32);
    ctx.fillStyle = `#${g.color.toString(16).padStart(6, '0')}`;
    ctx.font = 'bold 14px Consolas, monospace';
    ctx.textAlign = 'center';
    ctx.shadowColor = '#000'; ctx.shadowBlur = 4;
    ctx.fillText(g.name, 128, 22);
    g.lblTex.needsUpdate = true;
  }

  _updateBillboards(g) {
    // Sprites are always billboarded automatically in Three.js — no-op needed
  }
}

function _lerp(a, b, t) { return a + (b - a) * t; }
function _lerpAngle(a, b, t) {
  let d = b - a;
  while (d >  Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return a + d * t;
}
