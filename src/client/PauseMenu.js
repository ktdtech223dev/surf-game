/**
 * PauseMenu.js — In-game pause overlay (Escape key)
 * Options: Resume | Change Map | Settings | Main Menu
 */
import { MAP_CATALOG, MAPS_BY_DIFF, DIFFICULTY } from './MapCatalog.js';

export class PauseMenu {
  constructor(input) {
    this._input     = input;
    this._el        = null;
    this._visible   = false;
    this._view      = 'root'; // 'root' | 'mapselect'

    // Callbacks set by caller
    this.onResume    = null;
    this.onChangeMap = null; // (mapId)
    this.onMainMenu  = null;
    this.onSettings  = null;
  }

  show() {
    if (this._visible) return;
    this._visible = true;
    this._view    = 'root';
    if (this._input) this._input.menuOpen = true;
    document.exitPointerLock?.();
    this._build();
    this._render();
  }

  hide() {
    if (!this._visible) return;
    this._visible = false;
    if (this._input) this._input.menuOpen = false;
    if (this._el) this._el.style.display = 'none';
  }

  get visible() { return this._visible; }

  // ── Build root DOM element (once) ──────────────────────────────────────────
  _build() {
    if (this._el) { this._el.style.display = 'flex'; return; }

    const el = document.createElement('div');
    el.id = 'pause-menu';
    el.style.cssText = `
      display:flex; position:fixed; inset:0;
      background:rgba(0,0,0,0.82); backdrop-filter:blur(3px);
      flex-direction:column; align-items:center; justify-content:center;
      font-family:monospace; color:#fff; z-index:9500;
    `;
    document.body.appendChild(el);
    this._el = el;
  }

  _render() {
    if (!this._el) return;
    this._el.innerHTML = this._view === 'mapselect'
      ? this._htmlMapSelect()
      : this._htmlRoot();

    // Wire globals
    window._pauseResume     = () => this._doResume();
    window._pauseChangeMap  = () => { this._view = 'mapselect'; this._render(); };
    window._pauseMainMenu   = () => { this.hide(); this.onMainMenu?.(); };
    window._pauseSettings   = () => { this.hide(); this.onSettings?.(); };
    window._pauseBack       = () => { this._view = 'root'; this._render(); };
    window._pauseSelectMap  = (mapId) => { this.hide(); this.onChangeMap?.(mapId); };
  }

  _htmlRoot() {
    const btn = (label, fn, accent = false) => `
      <button onclick="${fn}" style="
        width:220px; padding:14px 0; margin:5px 0;
        border:1px solid ${accent ? '#00cfff' : '#333'};
        background:${accent ? 'rgba(0,207,255,0.12)' : 'rgba(255,255,255,0.04)'};
        color:${accent ? '#00cfff' : '#ccc'}; cursor:pointer;
        font-family:monospace; font-size:15px; border-radius:6px;
        transition:background 0.15s;
      " onmouseover="this.style.background='rgba(255,255,255,0.1)'"
         onmouseout="this.style.background='${accent ? 'rgba(0,207,255,0.12)' : 'rgba(255,255,255,0.04)'}'">
        ${label}
      </button>
    `;
    return `
      <div style="text-align:center">
        <div style="font-size:11px;letter-spacing:6px;color:#555;margin-bottom:6px">PAUSED</div>
        <div style="font-size:28px;font-weight:bold;color:#00cfff;margin-bottom:32px">SURFGAME</div>
        ${btn('▶  Resume',    'window._pauseResume()',    true)}
        ${btn('🗺  Change Map', 'window._pauseChangeMap()')}
        ${btn('⚙  Settings',  'window._pauseSettings()')}
        ${btn('⌂  Main Menu', 'window._pauseMainMenu()')}
        <div style="color:#333;font-size:11px;margin-top:24px">Press Escape to resume</div>
      </div>
    `;
  }

  _htmlMapSelect() {
    const diffColors = {
      [DIFFICULTY.BEGINNER]:     '#22c55e',
      [DIFFICULTY.INTERMEDIATE]: '#3b82f6',
      [DIFFICULTY.ADVANCED]:     '#f97316',
      [DIFFICULTY.EXPERT]:       '#ef4444',
    };
    const diffLabels = {
      [DIFFICULTY.BEGINNER]:     'Beginner',
      [DIFFICULTY.INTERMEDIATE]: 'Intermediate',
      [DIFFICULTY.ADVANCED]:     'Advanced',
      [DIFFICULTY.EXPERT]:       'Expert',
    };

    const sections = Object.values(DIFFICULTY).map(diff => `
      <div style="margin-bottom:16px">
        <div style="color:${diffColors[diff]};font-size:12px;font-weight:bold;margin-bottom:8px">
          ${diffLabels[diff].toUpperCase()}
        </div>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:6px">
          ${(MAPS_BY_DIFF[diff] || []).map(m => `
            <div onclick="window._pauseSelectMap('${m.id}')" style="
              padding:8px 10px; border:1px solid #222; border-radius:5px;
              background:rgba(255,255,255,0.03); cursor:pointer;
            " onmouseover="this.style.borderColor='#444'"
               onmouseout="this.style.borderColor='#222'">
              <div style="font-size:13px;font-weight:bold">${_esc(m.name)}</div>
              <div style="font-size:10px;color:#555;margin-top:2px">${_esc(m.desc)}</div>
            </div>
          `).join('')}
        </div>
      </div>
    `).join('');

    return `
      <div style="width:min(860px,95vw);max-height:90vh;overflow-y:auto;padding:24px">
        <div style="display:flex;align-items:center;gap:16px;margin-bottom:20px">
          <button onclick="window._pauseBack()" style="
            padding:6px 14px;border:1px solid #333;background:transparent;
            color:#888;cursor:pointer;font-family:monospace;font-size:13px;border-radius:4px;
          ">← Back</button>
          <div style="font-size:18px;font-weight:bold;color:#00cfff">Select Map</div>
        </div>
        ${sections}
      </div>
    `;
  }

  _doResume() {
    this.hide();
    this.onResume?.();
  }
}

function _esc(str) {
  return String(str ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
