/**
 * LoadoutMenu — Full-screen loadout selector
 * Left panel: knife TYPE selector (model shape)
 * Right panel: skin selector for equipped type
 * Bottom: preview model rotating in real-time
 */
import * as THREE from 'three';
import { KNIFE_TYPES, KNIFE_SKINS, RARITY_COLOR, RARITY_GLOW, KNIFE_SKIN_BY_ID } from './CosmeticsSystem.js';
import { levelTitle } from './XPSystem.js';

export class LoadoutMenu {
  /**
   * @param {KnifeSystem} knifeSystem
   * @param {XPSystem}    xpSystem
   */
  constructor(knifeSystem, xpSystem = null) {
    this._knife  = knifeSystem;
    this._xp     = xpSystem;
    this._el     = null;
    this._visible = false;
    this._previewRenderer = null;
    this._previewScene    = null;
    this._previewCamera   = null;
    this._previewMesh     = null;
    this._rafId           = null;

    // Callbacks
    this.onClose = null;
  }

  get visible() { return this._visible; }

  show() {
    if (this._visible) return;
    this._visible = true;
    if (!this._el) this._buildContainer();
    this._render();
    this._el.style.display = 'flex';
    requestAnimationFrame(() => this._startPreview());
  }

  hide() {
    if (!this._visible) return;
    this._visible = false;
    if (this._el) this._el.style.display = 'none';
    this._stopPreview();
    this.onClose?.();
  }

  // ── Build root element ─────────────────────────────────────────────────────
  _buildContainer() {
    const el = document.createElement('div');
    el.id = 'loadout-menu';
    el.style.cssText = `
      display:none; position:fixed; inset:0;
      background:rgba(0,0,0,0.94); backdrop-filter:blur(6px);
      align-items:center; justify-content:center;
      z-index:8000; font-family:monospace; color:#fff;
    `;
    document.body.appendChild(el);
    this._el = el;
  }

  // ── Render loadout ─────────────────────────────────────────────────────────
  _render() {
    if (!this._el) return;
    const level      = this._xp?.level ?? 1;
    const ownedTypes = new Set(this._knife?.ownedTypes ?? ['classic']);
    const ownedSkins = new Set(this._knife?.owned ?? ['default']);
    const curType    = this._knife?.equippedType ?? 'classic';
    const curSkin    = this._knife?.equipped ?? 'default';

    // Filter skins that match current selection or all
    const allSkins = KNIFE_SKINS;

    const typeCards = KNIFE_TYPES.map(t => {
      const owned   = ownedTypes.has(t.id);
      const active  = t.id === curType;
      const col     = RARITY_COLOR[t.rarity] ?? '#888';
      return `
        <div data-typeid="${t.id}" class="lm-type-card" style="
          padding:10px 12px; border:1px solid ${active ? col : owned ? '#1e2a1e' : '#111'};
          border-radius:6px; background:${active ? col+'18' : owned ? '#0a120a' : '#060606'};
          cursor:${owned ? 'pointer' : 'default'}; margin-bottom:6px;
          opacity:${owned ? '1' : '0.45'}; position:relative; transition:all 0.12s;
        ">
          <div style="font-size:12px;font-weight:bold;color:${active ? col : owned ? '#ccc' : '#444'}">
            ${_esc(t.name)}
          </div>
          <div style="font-size:10px;color:#444;margin-top:2px">${_esc(t.desc)}</div>
          ${!owned ? `<div style="font-size:9px;color:#555;margin-top:4px">🔒 ${_esc(t.unlockDesc)}</div>` : ''}
          ${active ? `<div style="position:absolute;top:6px;right:8px;font-size:10px;color:${col}">EQUIPPED</div>` : ''}
        </div>
      `;
    }).join('');

    const skinCards = allSkins.map(s => {
      const owned  = ownedSkins.has(s.id);
      const active = s.id === curSkin;
      const col    = RARITY_COLOR[s.rarity] ?? '#888';
      const glow   = active ? RARITY_GLOW[s.rarity] : 'none';
      return `
        <div data-skinid="${s.id}" class="lm-skin-card" style="
          padding:8px; border:1px solid ${active ? col : owned ? '#1a1a1a' : '#0d0d0d'};
          border-radius:5px; background:${active ? col+'18' : '#0a0a0a'};
          cursor:${owned ? 'pointer' : 'default'}; opacity:${owned ? '1' : '0.35'};
          box-shadow:${glow}; transition:all 0.10s; text-align:center;
        ">
          <div style="width:100%;height:16px;border-radius:3px;margin-bottom:5px;
            background:${_hexCss(s.blade)};"></div>
          <div style="font-size:10px;color:${active ? col : owned ? '#aaa' : '#333'};
            font-weight:${active ? 'bold' : 'normal'}">${_esc(s.name)}</div>
          <div style="font-size:9px;color:${col};margin-top:1px">${s.rarity?.toUpperCase() ?? ''}</div>
          ${!owned ? '<div style="font-size:9px;color:#333">🔒</div>' : ''}
        </div>
      `;
    }).join('');

    this._el.innerHTML = `
      <div style="
        width:min(900px,96vw); max-height:92vh; background:#08080f;
        border:1px solid #1a1a2a; border-radius:10px; overflow:hidden;
        display:flex; flex-direction:column; box-shadow:0 0 80px rgba(0,0,0,0.9);
      ">
        <!-- Header -->
        <div style="
          display:flex; justify-content:space-between; align-items:center;
          padding:16px 20px; border-bottom:1px solid #111; background:#060610;
        ">
          <div>
            <div style="font-size:10px;letter-spacing:4px;color:#333">LOADOUT</div>
            <div style="font-size:18px;font-weight:bold;color:#00cfff">Knife Customization</div>
          </div>
          <div style="text-align:right">
            <div style="font-size:11px;color:#555">Level ${level} · ${levelTitle(level)}</div>
            ${this._xp ? `
              <div style="width:120px;height:4px;background:#111;border-radius:2px;margin-top:4px">
                <div style="height:100%;width:${Math.min(100,(this._xp.xp/this._xp.xpNeeded)*100).toFixed(1)}%;
                  background:#00cfff;border-radius:2px;"></div>
              </div>
            ` : ''}
          </div>
          <button id="lm-close" style="
            background:transparent;border:1px solid #333;color:#666;
            padding:6px 12px;cursor:pointer;font-family:monospace;font-size:12px;
            border-radius:4px;
          ">✕ Close</button>
        </div>

        <!-- Body: three columns -->
        <div style="display:flex;flex:1;overflow:hidden;min-height:0">
          <!-- Knife type list -->
          <div style="width:200px;min-width:200px;border-right:1px solid #111;padding:14px;overflow-y:auto">
            <div style="font-size:9px;letter-spacing:3px;color:#333;margin-bottom:10px">KNIFE TYPE</div>
            ${typeCards}
          </div>

          <!-- Skin grid -->
          <div style="flex:1;padding:14px;overflow-y:auto">
            <div style="font-size:9px;letter-spacing:3px;color:#333;margin-bottom:10px">SKINS</div>
            <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(90px,1fr));gap:6px">
              ${skinCards}
            </div>
          </div>

          <!-- Preview panel -->
          <div style="width:180px;min-width:180px;border-left:1px solid #111;
            display:flex;flex-direction:column;align-items:center;padding:14px">
            <div style="font-size:9px;letter-spacing:3px;color:#333;margin-bottom:10px">PREVIEW</div>
            <canvas id="lm-preview" width="152" height="180" style="
              border:1px solid #1a1a1a;border-radius:6px;background:#060608;
            "></canvas>
            <div style="margin-top:10px;text-align:center">
              <div style="font-size:12px;font-weight:bold;color:#ccc" id="lm-type-name">
                ${_esc(KNIFE_TYPES.find(t=>t.id===curType)?.name ?? 'Classic')}
              </div>
              <div style="font-size:11px;color:${RARITY_COLOR[KNIFE_SKIN_BY_ID[curSkin]?.rarity ?? 'common'] ?? '#888'}" id="lm-skin-name">
                ${_esc(KNIFE_SKIN_BY_ID[curSkin]?.name ?? 'Default')}
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    this._wireEvents();
  }

  _wireEvents() {
    this._el.querySelector('#lm-close')?.addEventListener('click', () => this.hide());

    // Type cards
    this._el.querySelectorAll('.lm-type-card').forEach(card => {
      card.addEventListener('click', () => {
        const typeId = card.dataset.typeid;
        if (!typeId) return;
        if (this._knife?.equipType(typeId)) {
          this._render();
          this._startPreview();
        }
      });
      card.addEventListener('mouseover', () => { if (card.style.opacity !== '0.45') card.style.background = 'rgba(255,255,255,0.04)'; });
      card.addEventListener('mouseout',  () => this._render());
    });

    // Skin cards
    this._el.querySelectorAll('.lm-skin-card').forEach(card => {
      card.addEventListener('click', () => {
        const skinId = card.dataset.skinid;
        if (!skinId) return;
        if (this._knife?.equipSkin(skinId)) {
          this._render();
          this._startPreview();
        }
      });
    });
  }

  // ── 3D Preview renderer ────────────────────────────────────────────────────
  _startPreview() {
    this._stopPreview();
    const canvas = this._el?.querySelector('#lm-preview');
    if (!canvas) return;

    this._previewRenderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    this._previewRenderer.setSize(152, 180);
    this._previewRenderer.setClearColor(0x000000, 0);

    this._previewScene  = new THREE.Scene();
    this._previewCamera = new THREE.PerspectiveCamera(45, 152 / 180, 0.1, 100);
    this._previewCamera.position.set(0, 1.2, 5.5);
    this._previewCamera.lookAt(0, 0, 0);

    // Lighting
    const amb = new THREE.AmbientLight(0xffffff, 0.6);
    const dir = new THREE.DirectionalLight(0xffffff, 1.2);
    dir.position.set(2, 4, 3);
    const fill = new THREE.DirectionalLight(0x4488ff, 0.4);
    fill.position.set(-2, 0, 2);
    this._previewScene.add(amb, dir, fill);

    // Build preview mesh
    this._buildPreviewMesh();

    // Animate
    const animate = () => {
      this._rafId = requestAnimationFrame(animate);
      if (this._previewMesh) this._previewMesh.rotation.y += 0.012;
      this._previewRenderer?.render(this._previewScene, this._previewCamera);
    };
    animate();
  }

  _buildPreviewMesh() {
    if (this._previewMesh) {
      this._previewScene.remove(this._previewMesh);
      this._previewMesh.traverse(o => o.geometry?.dispose());
    }
    // Build a minimal preview using the knife system's builder
    // We create a temporary knife instance just for the preview geometry
    const skin    = KNIFE_SKIN_BY_ID[this._knife?.equipped ?? 'default'] ?? KNIFE_SKIN_BY_ID['default'];
    const typeId  = this._knife?.equippedType ?? 'classic';
    const preview = this._buildPreviewType(typeId, skin);
    preview.rotation.set(0.3, 0.5, 0.1);
    preview.scale.setScalar(0.9);
    this._previewMesh = preview;
    this._previewScene.add(preview);
  }

  _buildPreviewType(typeId, skin) {
    // Reuse geometry logic (light version for preview)
    const g   = new THREE.Group();
    const bm  = new THREE.MeshLambertMaterial({ color: skin.blade, flatShading: true });
    const hm  = new THREE.MeshLambertMaterial({ color: skin.handle, flatShading: true });
    const am  = new THREE.MeshLambertMaterial({ color: skin.accent, flatShading: true });
    const HPI = Math.PI / 2;
    const add = (geo, mat, px=0,py=0,pz=0,rx=0,ry=0,rz=0) => {
      const m = new THREE.Mesh(geo, mat);
      m.position.set(px,py,pz); if (rx||ry||rz) m.rotation.set(rx,ry,rz);
      g.add(m);
    };
    switch (typeId) {
      case 'karambit':
        add(new THREE.TorusGeometry(0.98, 0.095, 4, 16, Math.PI*0.85), bm, 0,0.1,0, 0,0,HPI);
        add(new THREE.CylinderGeometry(0.20,0.24,0.95,7), hm, 0,0,0.6, HPI,0,0);
        add(new THREE.TorusGeometry(0.26,0.07,6,12), am, 0,0,1.1);
        break;
      case 'butterfly':
        add(new THREE.BoxGeometry(0.18,0.14,2.1), bm, 0,0,-0.8);
        add(new THREE.BoxGeometry(0.32,0.18,0.9), hm, 0, 0.15,0.5);
        add(new THREE.BoxGeometry(0.32,0.18,0.9), hm, 0,-0.15,0.5);
        break;
      case 'bayonet':
        add(new THREE.BoxGeometry(0.55,0.22,2.6), bm, 0,0.04,-1.0);
        add(new THREE.ConeGeometry(0.14,0.5,4), bm, 0,0.04,-2.4, HPI,0,0);
        add(new THREE.BoxGeometry(1.4,0.38,0.3), am);
        add(new THREE.CylinderGeometry(0.22,0.26,1.1,8), hm, 0,0,0.7, HPI,0,0);
        break;
      case 'tanto':
        add(new THREE.BoxGeometry(0.58,0.18,1.8), bm, 0,0,-0.7);
        add(new THREE.BoxGeometry(0.58,0.18,0.5), bm, 0,0.05,-1.6);
        add(new THREE.BoxGeometry(1.2,0.28,0.22), am);
        add(new THREE.BoxGeometry(0.38,0.28,1.0), hm, 0,0,0.6);
        break;
      case 'dagger':
        add(new THREE.BoxGeometry(0.4,0.22,2.2), bm, 0,0,-0.9);
        add(new THREE.ConeGeometry(0.14,0.55,4), bm, 0,0,-2.1, HPI,0,0);
        add(new THREE.BoxGeometry(1.1,0.13,0.2), am, 0, 0.18,0);
        add(new THREE.BoxGeometry(1.1,0.13,0.2), am, 0,-0.18,0);
        add(new THREE.CylinderGeometry(0.18,0.21,0.85,8), hm, 0,0,0.5, HPI,0,0);
        add(new THREE.SphereGeometry(0.26,6,4), am, 0,0,1.0);
        break;
      default: // classic
        add(new THREE.BoxGeometry(0.52,0.20,2.0), bm, 0,0.04,-0.75);
        add(new THREE.ConeGeometry(0.16,0.6,4), bm, 0,0.04,-1.92, HPI,0,0);
        add(new THREE.BoxGeometry(1.3,0.3,0.22), am);
        add(new THREE.CylinderGeometry(0.22,0.26,1.0,8), hm, 0,0,0.6, HPI,0,0);
    }
    return g;
  }

  _stopPreview() {
    if (this._rafId) { cancelAnimationFrame(this._rafId); this._rafId = null; }
    if (this._previewRenderer) { this._previewRenderer.dispose(); this._previewRenderer = null; }
    if (this._previewMesh) {
      this._previewMesh.traverse(o => o.geometry?.dispose());
      this._previewMesh = null;
    }
    this._previewScene  = null;
    this._previewCamera = null;
  }
}

function _esc(str)    { return String(str??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
function _hexCss(hex) { return '#' + (hex ?? 0x888888).toString(16).padStart(6, '0'); }
