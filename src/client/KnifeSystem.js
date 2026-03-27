/**
 * KnifeSystem.js — Knife collection, inspect animation, loadout screen
 * 32 completion knives + base knives, F-key inspect
 */
import * as THREE from 'three';
import { ds } from './DataService.js';

// Knife definitions (id, name, description, color)
export const KNIFE_DEFS = [
  { id: 'knife_default',    name: 'Standard',    desc: 'A reliable blade.',             color: 0x888888 },
  // Beginner
  { id: 'knife_shoreline',  name: 'Shoreline',   desc: 'Blue as the ocean.',            color: 0x1e90ff },
  { id: 'knife_coastal',    name: 'Coastal',     desc: 'Green like coastal grass.',     color: 0x22c55e },
  { id: 'knife_basin',      name: 'Basin',       desc: 'Red as volcanic rock.',         color: 0xff4444 },
  { id: 'knife_inlet',      name: 'Inlet',       desc: 'Amber glow of an inlet.',       color: 0xffaa00 },
  { id: 'knife_cove',       name: 'Cove',        desc: 'Purple twilight.',              color: 0xaa44ff },
  { id: 'knife_bay',        name: 'Bay',         desc: 'Teal bay waters.',              color: 0x00ffcc },
  { id: 'knife_delta',      name: 'Delta',       desc: 'Golden delta sediment.',        color: 0xdddd00 },
  { id: 'knife_lagoon',     name: 'Lagoon',      desc: 'Tropical blue.',                color: 0x00aaff },
  // Intermediate
  { id: 'knife_gorge',      name: 'Gorge',       desc: 'Deep orange gorge stone.',      color: 0xff6600 },
  { id: 'knife_canyon',     name: 'Canyon',      desc: 'Rusty canyon walls.',           color: 0xff8844 },
  { id: 'knife_ravine',     name: 'Ravine',      desc: 'Lime ravine moss.',             color: 0x88ff44 },
  { id: 'knife_chasm',      name: 'Chasm',       desc: 'Deep blue void.',               color: 0x4488ff },
  { id: 'knife_abyss',      name: 'Abyss',       desc: 'Bottomless pink abyss.',        color: 0xff0088 },
  { id: 'knife_ridge',      name: 'Ridge',       desc: 'Lavender mountain ridge.',      color: 0xaaaaff },
  { id: 'knife_summit',     name: 'Summit',      desc: 'White summit snow.',            color: 0xffffff },
  { id: 'knife_peak',       name: 'Peak',        desc: 'Cyan icy peak.',                color: 0x00ffff },
  // Advanced
  { id: 'knife_storm',      name: 'Storm',       desc: 'Yellow lightning.',             color: 0xffff00 },
  { id: 'knife_tempest',    name: 'Tempest',     desc: 'Storm-blue tempest.',           color: 0x0088ff },
  { id: 'knife_gale',       name: 'Gale',        desc: 'Scorching red gale.',           color: 0xff0055 },
  { id: 'knife_squall',     name: 'Squall',      desc: 'Tropical squall green.',        color: 0x00ff88 },
  { id: 'knife_cyclone',    name: 'Cyclone',     desc: 'Purple cyclone vortex.',        color: 0x8800ff },
  { id: 'knife_vortex',     name: 'Vortex',      desc: 'Orange spiral.',                color: 0xffaa22 },
  { id: 'knife_maelstrom',  name: 'Maelstrom',   desc: 'Deep blue crushing force.',     color: 0x4400ff },
  { id: 'knife_typhoon',    name: 'Typhoon',     desc: 'Blinding magenta typhoon.',     color: 0xff00ff },
  // Expert
  { id: 'knife_void',       name: 'Void',        desc: 'Red suspended in nothing.',     color: 0xff2200 },
  { id: 'knife_null',       name: 'Null',        desc: 'Teal in absolute darkness.',    color: 0x00ffaa },
  { id: 'knife_zenith',     name: 'Zenith',      desc: 'Highest point of existence.',   color: 0xbbaaff },
  { id: 'knife_apex',       name: 'Apex',        desc: 'Apex of mastery.',              color: 0xff5500 },
  { id: 'knife_omega',      name: 'Omega',       desc: 'The end of all things.',        color: 0x00ff66 },
  { id: 'knife_sigma',      name: 'Sigma',       desc: 'For those who transcended.',    color: 0xff44ff },
  { id: 'knife_prime',      name: 'Prime',       desc: 'Blue edge dimension.',          color: 0x00aaff },
  { id: 'knife_absolute',   name: 'Absolute',    desc: 'Gilded. The ultimate blade.',   color: 0xffd700 },
  // Special
  { id: 'knife_daily',      name: 'Daily',       desc: 'Rewarded for daily mastery.',   color: 0x00ccff },
  { id: 'knife_weekly',     name: 'Weekly',      desc: 'Rewarded for weekly mastery.',  color: 0xff8800 },
];

export const KNIFE_BY_ID = Object.fromEntries(KNIFE_DEFS.map(k => [k.id, k]));

export class KnifeSystem {
  constructor(scene, camera) {
    this.scene  = scene;
    this.camera = camera;

    this._owned     = new Set(['knife_default']);
    this._equipped  = 'knife_default';
    this._mesh      = null;
    this._inspecting = false;
    this._inspectT  = 0;
    this._basePos   = new THREE.Vector3(0.6, -0.5, -2.0);
    this._inspectRot = 0;

    this._buildKnifeMesh(0x888888);
  }

  async load() {
    if (!ds.isReady) return;
    try {
      const unlocks = await ds.getUnlocks();
      unlocks.filter(u => u.item_type === 'knife').forEach(u => this._owned.add(u.item_id));
      // Load equipped from profile
      const profile = await ds.getProfile();
      if (profile?.knife && this._owned.has(profile.knife)) {
        this._equipped = profile.knife;
      }
      this._applyEquipped();
    } catch (e) {
      console.warn('[KnifeSystem] Load failed:', e.message);
    }
  }

  // ── Grant a knife (after map completion) ───────────────────────────────────
  async grant(knifeId) {
    if (this._owned.has(knifeId)) return false;
    try {
      const res = await ds.grantUnlock('knife', knifeId);
      if (res?.granted) {
        this._owned.add(knifeId);
        this._showUnlockNotice(knifeId);
        return true;
      }
    } catch {}
    return false;
  }

  // ── Equip ──────────────────────────────────────────────────────────────────
  equip(knifeId) {
    if (!this._owned.has(knifeId)) return false;
    this._equipped = knifeId;
    this._applyEquipped();
    ds.updateProfile({ knife: knifeId }).catch(() => {});
    return true;
  }

  // ── F-key inspect toggle ───────────────────────────────────────────────────
  toggleInspect() {
    this._inspecting = !this._inspecting;
    this._inspectT   = 0;
  }

  // ── Tick (called from main game loop) ─────────────────────────────────────
  tick(dt) {
    if (!this._mesh) return;
    if (this._inspecting) {
      this._inspectT  += dt * 2;
      this._inspectRot = Math.sin(this._inspectT) * 0.8;
      this._mesh.rotation.set(
        Math.sin(this._inspectT * 0.5) * 0.4,
        this._inspectRot + Math.PI * 0.3,
        Math.sin(this._inspectT * 0.3) * 0.25
      );
    } else {
      // Idle bob
      this._inspectT += dt;
      const bob = Math.sin(this._inspectT * 2.5) * 0.06;
      this._mesh.position.copy(this._basePos).add(new THREE.Vector3(0, bob, 0));
      this._mesh.rotation.set(0.1, Math.PI * 0.15, 0.05);
    }
  }

  get ownedCount() { return this._owned.size; }
  get owned()      { return Array.from(this._owned); }
  get equipped()   { return this._equipped; }

  // ── Internals ──────────────────────────────────────────────────────────────

  _applyEquipped() {
    const def = KNIFE_BY_ID[this._equipped];
    if (!def || !this._mesh) return;
    this._mesh.material.color.setHex(def.color);
  }

  _buildKnifeMesh(color) {
    // Viewmodel knife — sized for world scale (eye height 56 units, 1 unit ≈ 3 cm)
    // Placed at z=-2.0 in camera space (well beyond near=0.5)
    const group = new THREE.Group();

    const bladeMat  = new THREE.MeshLambertMaterial({ color, flatShading: true });
    const handleMat = new THREE.MeshLambertMaterial({ color: 0x1a1a1a, flatShading: true });
    const guardMat  = new THREE.MeshLambertMaterial({ color: 0x444444, flatShading: true });

    // Blade — 0.6 wide × 0.22 tall × 2.2 long
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.22, 2.2), bladeMat);
    blade.position.z = -0.85;

    // Tip cone
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.65, 4), bladeMat);
    tip.rotation.x = Math.PI / 2;
    tip.position.z = -2.3;

    // Handle
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.26, 1.1, 6), handleMat);
    handle.rotation.x = Math.PI / 2;
    handle.position.z = 0.6;

    // Guard (cross-piece)
    const guard = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.38, 0.28), guardMat);
    guard.position.z = 0.02;

    group.add(blade, tip, handle, guard);
    group.position.copy(this._basePos);
    group.rotation.set(0.1, Math.PI * 0.15, 0.05);
    group.scale.setScalar(1.0);

    this._mesh = group;
    this.camera.add(group);

    // Ensure camera is in scene
    if (!this.scene.getObjectById(this.camera.id)) {
      this.scene.add(this.camera);
    }
  }

  _showUnlockNotice(knifeId) {
    const def = KNIFE_BY_ID[knifeId];
    if (!def) return;
    const el = document.createElement('div');
    el.style.cssText = `
      position:fixed; bottom:140px; right:16px; padding:10px 14px;
      background:rgba(0,0,0,0.85); border:1px solid #ffd700; border-radius:6px;
      color:#ffd700; font-family:monospace; font-size:13px; z-index:999;
      animation: slideInRight 0.3s ease, fadeOut 0.4s 3.5s forwards;
    `;
    el.innerHTML = `🗡 <b>${def.name}</b> knife unlocked!`;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 4000);
  }
}
