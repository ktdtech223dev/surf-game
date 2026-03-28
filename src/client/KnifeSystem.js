/**
 * KnifeSystem — 6 distinct knife types with unique geometry + inspect animations
 * Types: classic, karambit, butterfly, bayonet, tanto, dagger
 * Skins (colors) applied on top of any type.
 */
import * as THREE from 'three';
import { ds } from './DataService.js';
import { KNIFE_TYPES, KNIFE_SKIN_BY_ID, KNIFE_TYPE_BY_ID } from './CosmeticsSystem.js';

export { KNIFE_SKINS as KNIFE_DEFS, KNIFE_SKIN_BY_ID as KNIFE_BY_ID } from './CosmeticsSystem.js';

const BASE_POS = new THREE.Vector3(0.60, -0.52, -2.0);
const HPI = Math.PI / 2;

export class KnifeSystem {
  constructor(scene, camera) {
    this.scene  = scene;
    this.camera = camera;

    this._ownedTypes   = new Set(['classic']);
    this._ownedSkins   = new Set(['default']);
    this._equippedType = 'classic';
    this._equippedSkin = 'default';
    this._mesh         = null;
    this._butterParts  = null;

    this._inspecting  = false;
    this._inspectT    = 0;
    this._idleT       = 0;

    this._rebuildMesh();
  }

  // ── Public ─────────────────────────────────────────────────────────────────

  async load() {
    if (!ds.isReady) return;
    try {
      const [unlocks, profile] = await Promise.all([ds.getUnlocks(), ds.getProfile()]);
      unlocks.filter(u => u.item_type === 'knife' || u.item_type === 'knife_skin')
        .forEach(u => this._ownedSkins.add(u.item_id));
      unlocks.filter(u => u.item_type === 'knife_type')
        .forEach(u => this._ownedTypes.add(u.item_id));
      if (profile?.knife_type && this._ownedTypes.has(profile.knife_type))
        this._equippedType = profile.knife_type;
      if (profile?.knife && this._ownedSkins.has(profile.knife))
        this._equippedSkin = profile.knife;
      this._rebuildMesh();
    } catch (e) { console.warn('[KnifeSystem] Load failed:', e.message); }
  }

  async grant(knifeId) {
    if (this._ownedSkins.has(knifeId)) return false;
    try {
      const res = await ds.grantUnlock('knife', knifeId);
      if (res?.granted) { this._ownedSkins.add(knifeId); this._showUnlock(knifeId, 'skin'); return true; }
    } catch {}
    return false;
  }

  grantType(typeId) {
    if (this._ownedTypes.has(typeId)) return false;
    this._ownedTypes.add(typeId);
    this._showUnlock(typeId, 'type');
    return true;
  }

  equipSkin(skinId) {
    if (!this._ownedSkins.has(skinId)) return false;
    this._equippedSkin = skinId;
    this._applyMaterials();
    ds.updateProfile({ knife: skinId }).catch(() => {});
    return true;
  }

  equipType(typeId) {
    if (!this._ownedTypes.has(typeId)) return false;
    this._equippedType = typeId;
    this._rebuildMesh();
    ds.updateProfile({ knife_type: typeId }).catch(() => {});
    return true;
  }

  toggleInspect() { this._inspecting = !this._inspecting; this._inspectT = 0; }

  tick(dt) {
    if (!this._mesh) return;
    this._inspecting ? this._tickInspect(dt) : this._tickIdle(dt);
  }

  get ownedCount()   { return this._ownedSkins.size; }
  get owned()        { return Array.from(this._ownedSkins); }
  get ownedTypes()   { return Array.from(this._ownedTypes); }
  get equipped()     { return this._equippedSkin; }
  get equippedType() { return this._equippedType; }

  // ── Internal helpers ───────────────────────────────────────────────────────

  _mat(skin, role) {
    const hex = role === 'blade' ? skin.blade : role === 'handle' ? skin.handle : skin.accent;
    const m   = new THREE.MeshLambertMaterial({ color: hex, flatShading: true });
    if (skin.emissive && role === 'blade') m.emissive = new THREE.Color(hex).multiplyScalar(0.25);
    return m;
  }

  _part(geo, mat, role, px = 0, py = 0, pz = 0, rx = 0, ry = 0, rz = 0) {
    const mesh = new THREE.Mesh(geo, mat);
    mesh.userData.role = role;
    mesh.position.set(px, py, pz);
    if (rx || ry || rz) mesh.rotation.set(rx, ry, rz);
    return mesh;
  }

  _rebuildMesh() {
    if (this._mesh) { this.camera.remove(this._mesh); this._mesh.traverse(o => o.geometry?.dispose()); }
    this._butterParts = null;
    const skin = KNIFE_SKIN_BY_ID[this._equippedSkin] ?? KNIFE_SKIN_BY_ID['default'];
    this._mesh = this._buildType(this._equippedType, skin);
    this._mesh.position.copy(BASE_POS);
    this._mesh.rotation.set(0.10, Math.PI * 0.15, 0.05);
    this.camera.add(this._mesh);
    if (!this.scene.getObjectById(this.camera.id)) this.scene.add(this.camera);
  }

  _applyMaterials() {
    if (!this._mesh) return;
    const skin = KNIFE_SKIN_BY_ID[this._equippedSkin] ?? KNIFE_SKIN_BY_ID['default'];
    this._mesh.traverse(o => {
      if (!o.isMesh) return;
      const r = o.userData.role;
      const hex = r === 'blade' ? skin.blade : r === 'handle' ? skin.handle : skin.accent;
      if (hex !== undefined) o.material.color.setHex(hex);
    });
  }

  _buildType(typeId, skin) {
    switch (typeId) {
      case 'karambit':  return this._buildKarambit(skin);
      case 'butterfly': return this._buildButterfly(skin);
      case 'bayonet':   return this._buildBayonet(skin);
      case 'tanto':     return this._buildTanto(skin);
      case 'dagger':    return this._buildDagger(skin);
      default:          return this._buildClassic(skin);
    }
  }

  // ── 1. CLASSIC ─────────────────────────────────────────────────────────────
  _buildClassic(skin) {
    const g  = new THREE.Group();
    const bm = this._mat(skin, 'blade');
    const hm = this._mat(skin, 'handle');
    const am = this._mat(skin, 'accent');

    g.add(this._part(new THREE.BoxGeometry(0.52, 0.20, 2.0),          bm, 'blade',  0, 0.04, -0.75));
    g.add(this._part(new THREE.ConeGeometry(0.16, 0.6, 4),            bm, 'blade',  0, 0.04, -1.92, HPI, 0, 0));
    g.add(this._part(new THREE.BoxGeometry(0.07, 0.11, 1.80),         am, 'accent', 0, 0.17, -0.78));
    g.add(this._part(new THREE.BoxGeometry(1.30, 0.30, 0.22),         am, 'accent', 0, 0,     0.06));
    // Three grip segments
    for (let i = 0; i < 3; i++) {
      const r = i % 2 === 1;
      g.add(this._part(new THREE.CylinderGeometry(r?0.24:0.21, r?0.24:0.21, 0.28, 8),
        r ? am : hm, r ? 'accent' : 'handle', 0, 0, 0.48 + i * 0.32, HPI, 0, 0));
    }
    g.add(this._part(new THREE.CylinderGeometry(0.28, 0.20, 0.22, 6), am, 'accent', 0, 0, 1.32, HPI, 0, 0));
    return g;
  }

  // ── 2. KARAMBIT ────────────────────────────────────────────────────────────
  _buildKarambit(skin) {
    const g  = new THREE.Group();
    const bm = this._mat(skin, 'blade');
    const hm = this._mat(skin, 'handle');
    const am = this._mat(skin, 'accent');

    // Curved arc blade
    const arcGeo = new THREE.TorusGeometry(0.98, 0.095, 4, 16, Math.PI * 0.85);
    g.add(this._part(arcGeo, bm, 'blade', 0, 0.10, -0.38, 0, 0, HPI));
    // Inner sharpened edge
    const edgeGeo = new THREE.TorusGeometry(0.84, 0.040, 3, 12, Math.PI * 0.80);
    g.add(this._part(edgeGeo, am, 'accent', 0, 0.08, -0.38, 0.04, 0, HPI));
    // Tip spike
    g.add(this._part(new THREE.ConeGeometry(0.09, 0.26, 4), bm, 'blade', -0.68, 0.80, -0.40, 0.05, 0, -HPI));
    // Handle
    g.add(this._part(new THREE.CylinderGeometry(0.20, 0.24, 0.95, 7), hm, 'handle', 0, 0, 0.48, HPI, 0, 0));
    // Finger ring
    g.add(this._part(new THREE.TorusGeometry(0.26, 0.07, 6, 12), am, 'accent', 0, 0, 1.02));
    return g;
  }

  // ── 3. BUTTERFLY ───────────────────────────────────────────────────────────
  _buildButterfly(skin) {
    const g  = new THREE.Group();
    const bm = this._mat(skin, 'blade');
    const hm = this._mat(skin, 'handle');
    const am = this._mat(skin, 'accent');

    // Thin blade
    g.add(this._part(new THREE.BoxGeometry(0.18, 0.14, 2.10), bm, 'blade',  0, 0, -0.82));
    g.add(this._part(new THREE.ConeGeometry(0.10, 0.40, 4),   bm, 'blade',  0, 0, -1.98, HPI, 0, 0));
    g.add(this._part(new THREE.BoxGeometry(0.04, 0.04, 1.60), am, 'accent', 0, 0.07, -0.82));

    // Two handle halves (animated)
    const halfA = new THREE.Group();
    halfA.add(this._part(new THREE.BoxGeometry(0.32, 0.18, 0.88), hm, 'handle', 0,  0.15, 0.54));
    halfA.add(this._part(new THREE.BoxGeometry(0.32, 0.06, 0.06), am, 'accent', 0,  0.15, 0.10));
    halfA.add(this._part(new THREE.BoxGeometry(0.32, 0.06, 0.06), am, 'accent', 0,  0.15, 0.98));

    const halfB = new THREE.Group();
    halfB.add(this._part(new THREE.BoxGeometry(0.32, 0.18, 0.88), hm, 'handle', 0, -0.15, 0.54));
    halfB.add(this._part(new THREE.BoxGeometry(0.32, 0.06, 0.06), am, 'accent', 0, -0.15, 0.10));
    halfB.add(this._part(new THREE.BoxGeometry(0.32, 0.06, 0.06), am, 'accent', 0, -0.15, 0.98));

    g.add(halfA, halfB);
    this._butterParts = { halfA, halfB };

    // Pivot pins
    g.add(this._part(new THREE.CylinderGeometry(0.05, 0.05, 0.42, 5), am, 'accent', 0, 0, 0.10, 0, 0, HPI));
    g.add(this._part(new THREE.CylinderGeometry(0.05, 0.05, 0.42, 5), am, 'accent', 0, 0, 0.98, 0, 0, HPI));
    return g;
  }

  // ── 4. BAYONET ─────────────────────────────────────────────────────────────
  _buildBayonet(skin) {
    const g  = new THREE.Group();
    const bm = this._mat(skin, 'blade');
    const hm = this._mat(skin, 'handle');
    const am = this._mat(skin, 'accent');

    // Long main blade
    g.add(this._part(new THREE.BoxGeometry(0.55, 0.22, 2.60), bm, 'blade',  0, 0.04, -1.06));
    // Clip-point box
    g.add(this._part(new THREE.BoxGeometry(0.55, 0.16, 0.70), bm, 'blade',  0, 0.14, -2.36, -0.18, 0, 0));
    // Tip
    g.add(this._part(new THREE.ConeGeometry(0.14, 0.50, 4),   bm, 'blade',  0, 0.04, -2.60, HPI, 0, 0));
    // Fuller groove
    g.add(this._part(new THREE.BoxGeometry(0.07, 0.07, 2.20), am, 'accent', 0.16, 0.02, -0.98));
    // Serrations
    for (let i = 0; i < 5; i++)
      g.add(this._part(new THREE.BoxGeometry(0.06, 0.15, 0.12), am, 'accent', 0, -0.10, -0.14 - i * 0.18));
    // Guard
    g.add(this._part(new THREE.BoxGeometry(1.40, 0.38, 0.30), am, 'accent',  0,  0,    0.08));
    g.add(this._part(new THREE.CylinderGeometry(0.14, 0.14, 0.34, 8), am, 'accent', -0.35, -0.20, 0.08, HPI, 0, 0));
    // Handle
    g.add(this._part(new THREE.CylinderGeometry(0.22, 0.26, 1.10, 8), hm, 'handle', 0, 0, 0.64, HPI, 0, 0));
    for (let i = 0; i < 4; i++)
      g.add(this._part(new THREE.CylinderGeometry(0.28, 0.28, 0.06, 8), am, 'accent', 0, 0, 0.30 + i * 0.25, HPI, 0, 0));
    g.add(this._part(new THREE.CylinderGeometry(0.24, 0.20, 0.28, 6), am, 'accent', 0, 0, 1.24, HPI, 0, 0));
    return g;
  }

  // ── 5. TANTO ───────────────────────────────────────────────────────────────
  _buildTanto(skin) {
    const g  = new THREE.Group();
    const bm = this._mat(skin, 'blade');
    const hm = this._mat(skin, 'handle');
    const am = this._mat(skin, 'accent');

    // Main flat blade
    g.add(this._part(new THREE.BoxGeometry(0.58, 0.18, 1.80), bm, 'blade',  0, 0,    -0.74));
    // Secondary forward section
    g.add(this._part(new THREE.BoxGeometry(0.58, 0.18, 0.55), bm, 'blade',  0, 0.05, -1.69));
    // Wedge tip
    g.add(this._part(new THREE.BoxGeometry(0.58, 0.17, 0.38), bm, 'blade',  0, 0,    -2.04, 0.34, 0, 0));
    // Spine lines
    g.add(this._part(new THREE.BoxGeometry(0.07, 0.09, 1.70), am, 'accent', 0, 0.14, -0.72));
    g.add(this._part(new THREE.BoxGeometry(0.07, 0.09, 0.50), am, 'accent', 0, 0.14, -1.68));
    // Tanto step detail
    g.add(this._part(new THREE.BoxGeometry(0.58, 0.07, 0.08), am, 'accent', 0, -0.05, -1.48));
    // Square guard
    g.add(this._part(new THREE.BoxGeometry(1.20, 0.28, 0.22), am, 'accent', 0,  0,    0.06));
    // Rectangular handle
    g.add(this._part(new THREE.BoxGeometry(0.38, 0.28, 1.00), hm, 'handle', 0,  0,    0.60));
    for (let i = 0; i < 4; i++)
      g.add(this._part(new THREE.BoxGeometry(0.42, 0.04, 0.06), am, 'accent', 0, 0, 0.20 + i * 0.23));
    // Square pommel
    g.add(this._part(new THREE.BoxGeometry(0.44, 0.34, 0.24), am, 'accent', 0, 0, 1.14));
    return g;
  }

  // ── 6. DAGGER ──────────────────────────────────────────────────────────────
  _buildDagger(skin) {
    const g  = new THREE.Group();
    const bm = this._mat(skin, 'blade');
    const hm = this._mat(skin, 'handle');
    const am = this._mat(skin, 'accent');

    // Symmetrical double-edged blade
    g.add(this._part(new THREE.BoxGeometry(0.40, 0.22, 2.20), bm, 'blade',  0,  0,    -0.90));
    g.add(this._part(new THREE.BoxGeometry(0.07, 0.09, 2.00), am, 'accent', 0,  0.14, -0.88));
    g.add(this._part(new THREE.BoxGeometry(0.07, 0.09, 2.00), am, 'accent', 0, -0.14, -0.88));
    g.add(this._part(new THREE.ConeGeometry(0.14, 0.55, 4),   bm, 'blade',  0,  0,    -2.08, HPI, 0, 0));
    // Center ridge
    g.add(this._part(new THREE.BoxGeometry(0.05, 0.07, 1.80), am, 'accent', 0, 0, -0.86));
    // Twin guards
    g.add(this._part(new THREE.BoxGeometry(1.10, 0.13, 0.20), am, 'accent', 0,  0.18, 0.06));
    g.add(this._part(new THREE.BoxGeometry(1.10, 0.13, 0.20), am, 'accent', 0, -0.18, 0.06));
    // Handle
    g.add(this._part(new THREE.CylinderGeometry(0.18, 0.21, 0.85, 8), hm, 'handle', 0, 0, 0.52, HPI, 0, 0));
    for (let i = 0; i < 4; i++)
      g.add(this._part(new THREE.CylinderGeometry(0.23, 0.23, 0.06, 8), am, 'accent', 0, 0, 0.22 + i * 0.20, HPI, 0, 0));
    // Ball pommel
    g.add(this._part(new THREE.SphereGeometry(0.26, 6, 4), am, 'accent', 0, 0, 1.02));
    return g;
  }

  // ── Idle animation ─────────────────────────────────────────────────────────
  _tickIdle(dt) {
    this._idleT += dt;
    const bob  = Math.sin(this._idleT * 2.5) * 0.055;
    const sway = Math.sin(this._idleT * 1.2) * 0.012;
    this._mesh.position.set(BASE_POS.x + sway, BASE_POS.y + bob, BASE_POS.z);
    this._mesh.rotation.set(0.10, Math.PI * 0.15, 0.05);
    if (this._butterParts) {
      this._butterParts.halfA.rotation.z = 0;
      this._butterParts.halfB.rotation.z = 0;
    }
  }

  // ── Inspect animations ─────────────────────────────────────────────────────
  _tickInspect(dt) {
    this._inspectT += dt;
    const t = this._inspectT;
    switch (this._equippedType) {
      case 'karambit':  this._animKarambit(t);  break;
      case 'butterfly': this._animButterfly(t); break;
      case 'bayonet':   this._animBayonet(t);   break;
      case 'tanto':     this._animTanto(t);     break;
      case 'dagger':    this._animDagger(t);    break;
      default:          this._animClassic(t);   break;
    }
  }

  _animClassic(t) {
    this._mesh.position.set(BASE_POS.x - 0.10, BASE_POS.y + 0.06, BASE_POS.z + 0.10);
    this._mesh.rotation.set(
      Math.sin(t * 0.8) * 0.55,
      Math.PI * 0.15 + Math.sin(t * 0.6) * 1.60,
      Math.sin(t * 1.0) * 0.30
    );
  }

  _animKarambit(t) {
    // Rapid Z-spin simulating spinning on finger ring
    this._mesh.position.set(BASE_POS.x, BASE_POS.y + 0.04, BASE_POS.z + 0.05);
    this._mesh.rotation.set(
      Math.sin(t * 0.5) * 0.20,
      Math.PI * 0.15 + Math.sin(t * 0.3) * 0.40,
      t * 3.20
    );
  }

  _animButterfly(t) {
    // Handles flip open/close
    this._mesh.position.set(BASE_POS.x - 0.06, BASE_POS.y + 0.08, BASE_POS.z + 0.08);
    this._mesh.rotation.set(
      Math.sin(t * 0.7) * 0.40,
      Math.PI * 0.15 + Math.sin(t * 0.5) * 0.80,
      0
    );
    if (this._butterParts) {
      const flip = Math.sin(t * 2.5) * Math.PI * 0.70;
      this._butterParts.halfA.rotation.z =  flip;
      this._butterParts.halfB.rotation.z = -flip;
    }
  }

  _animBayonet(t) {
    // Slow weighted rotation
    const s = t * 0.5;
    this._mesh.position.set(BASE_POS.x, BASE_POS.y + 0.02, BASE_POS.z + 0.05);
    this._mesh.rotation.set(
      Math.sin(s * 0.9) * 0.35,
      Math.PI * 0.15 + s * 1.00,
      Math.sin(s * 0.6) * 0.20
    );
  }

  _animTanto(t) {
    // Sharp angular snaps
    const snap = x => Math.sign(x) * Math.pow(Math.abs(x), 0.38);
    this._mesh.position.set(BASE_POS.x, BASE_POS.y + 0.04, BASE_POS.z);
    this._mesh.rotation.set(
      snap(Math.sin(t * 1.2)) * 0.60,
      Math.PI * 0.15 + snap(Math.sin(t * 0.9)) * 1.40,
      snap(Math.sin(t * 1.5)) * 0.35
    );
  }

  _animDagger(t) {
    // Double-axis continuous spin
    this._mesh.position.set(BASE_POS.x, BASE_POS.y + 0.06, BASE_POS.z + 0.06);
    this._mesh.rotation.set(
      t * 1.50,
      Math.PI * 0.15 + t * 2.00,
      Math.sin(t * 0.8) * 0.25
    );
  }

  // ── Unlock toast ───────────────────────────────────────────────────────────
  _showUnlock(id, kind) {
    const def = kind === 'type' ? KNIFE_TYPE_BY_ID[id] : KNIFE_SKIN_BY_ID[id];
    if (!def) return;
    const rarity = def.rarity ?? 'common';
    const col = { common:'#9ca3af', uncommon:'#22c55e', rare:'#3b82f6', epic:'#a855f7', legendary:'#f59e0b' }[rarity] ?? '#888';
    const icon = kind === 'type' ? '🔪' : '🎨';
    const el = document.createElement('div');
    el.style.cssText = `
      position:fixed;bottom:140px;right:16px;padding:10px 16px;
      background:rgba(0,0,0,0.92);border:1px solid ${col};border-radius:6px;
      color:${col};font-family:monospace;font-size:13px;z-index:9999;
      box-shadow:0 0 14px ${col}55;
      animation:slideInRight 0.3s ease,fadeOut 0.4s 3.8s forwards;
    `;
    el.innerHTML = `${icon} <b>${def.name}</b> ${kind === 'type' ? 'knife unlocked' : 'skin unlocked'}!`;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 4500);
  }
}
