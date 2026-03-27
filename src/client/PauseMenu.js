/**
 * PauseMenu.js — Full in-game pause overlay (Escape key)
 * Tabs: Resume · Settings · Change Map · Main Menu
 * Settings are live-updated via SettingsManager.
 */
import { MAPS_BY_DIFF, DIFFICULTY } from './MapCatalog.js';

const DIFF_COLOR = {
  [DIFFICULTY.BEGINNER]:     '#22c55e',
  [DIFFICULTY.INTERMEDIATE]: '#3b82f6',
  [DIFFICULTY.ADVANCED]:     '#f97316',
  [DIFFICULTY.EXPERT]:       '#ef4444',
};
const DIFF_LABEL = {
  [DIFFICULTY.BEGINNER]:     'Beginner',
  [DIFFICULTY.INTERMEDIATE]: 'Intermediate',
  [DIFFICULTY.ADVANCED]:     'Advanced',
  [DIFFICULTY.EXPERT]:       'Expert',
};

export class PauseMenu {
  /**
   * @param {InputManager}    input
   * @param {SettingsManager} settings  — passed so sliders update live
   */
  constructor(input, settings = null) {
    this._input    = input;
    this._settings = settings;
    this._el       = null;
    this._visible  = false;
    this._tab      = 'settings'; // 'settings' | 'mapselect'

    // Callbacks set by main.js
    this.onResume    = null;
    this.onChangeMap = null; // (mapId)
    this.onMainMenu  = null;
  }

  get visible() { return this._visible; }

  show() {
    if (this._visible) return;
    this._visible = true;
    this._tab     = 'settings';
    if (this._input) this._input.menuOpen = true;
    document.exitPointerLock?.();
    if (!this._el) this._build();
    this._el.style.display = 'flex';
    this._render();
  }

  hide() {
    if (!this._visible) return;
    this._visible = false;
    if (this._input) this._input.menuOpen = false;
    if (this._el) this._el.style.display = 'none';
  }

  // ── DOM build (once) ───────────────────────────────────────────────────────
  _build() {
    const el = document.createElement('div');
    el.id = 'pause-menu';
    el.style.cssText = `
      display:none; position:fixed; inset:0;
      background:rgba(0,0,0,0.88); backdrop-filter:blur(4px);
      align-items:center; justify-content:center;
      font-family:monospace; color:#fff; z-index:9500;
    `;
    document.body.appendChild(el);
    this._el = el;
  }

  _render() {
    if (!this._el) return;
    const s = this._settings;

    const sensVal  = s?.sensitivity ?? 0.002;
    const fovVal   = s?.fov ?? 90;
    const volVal   = s?.volume ?? 0.7;
    const nameVal  = _esc(s?.name ?? 'Player');
    const colorVal = s?.color ?? '#00cfff';

    const navBtn = (id, label, active) => `
      <button id="${id}" style="
        display:block; width:100%; padding:11px 16px; margin-bottom:4px;
        text-align:left; background:${active ? 'rgba(0,207,255,0.14)' : 'transparent'};
        border:1px solid ${active ? '#00cfff44' : 'transparent'};
        color:${active ? '#00cfff' : '#888'}; cursor:pointer;
        font-family:monospace; font-size:13px; border-radius:5px;
        transition:all 0.12s;
      "
        onmouseover="this.style.background='rgba(255,255,255,0.06)';this.style.color='#ccc'"
        onmouseout="this.style.background='${active ? 'rgba(0,207,255,0.14)' : 'transparent'}';this.style.color='${active ? '#00cfff' : '#888'}'"
      >${label}</button>
    `;

    const settingsHtml = `
      <div style="padding:0 4px">
        <div style="font-size:11px;letter-spacing:3px;color:#444;margin-bottom:20px">SETTINGS</div>

        ${_row('Sensitivity', `
          <input id="pm-sens" type="range" min="0.0005" max="0.008" step="0.0001"
            value="${sensVal}" style="${_sliderCss()}">
          <span id="pm-sens-lbl" style="min-width:44px;text-align:right;color:#ccc;font-size:12px">${sensVal.toFixed(4)}</span>
        `)}

        ${_row('FOV', `
          <input id="pm-fov" type="range" min="60" max="130" step="1"
            value="${fovVal}" style="${_sliderCss()}">
          <span id="pm-fov-lbl" style="min-width:34px;text-align:right;color:#ccc;font-size:12px">${fovVal}°</span>
        `)}

        ${_row('Volume', `
          <input id="pm-vol" type="range" min="0" max="1" step="0.01"
            value="${volVal}" style="${_sliderCss()}">
          <span id="pm-vol-lbl" style="min-width:34px;text-align:right;color:#ccc;font-size:12px">${Math.round(volVal*100)}%</span>
        `)}

        <div style="border-top:1px solid #1a1a1a;margin:18px 0"></div>

        ${_row('Name', `
          <input id="pm-name" type="text" value="${nameVal}" maxlength="24" style="
            flex:1; background:#111; border:1px solid #333; color:#fff;
            padding:5px 8px; font-family:monospace; font-size:13px;
            border-radius:4px; outline:none;
          ">
          <button id="pm-name-save" style="
            padding:5px 10px; background:#0a3a5a; border:1px solid #00cfff44;
            color:#00cfff; cursor:pointer; font-family:monospace;
            font-size:11px; border-radius:4px; margin-left:6px;
          ">Save</button>
        `)}

        ${_row('Color', `
          <input id="pm-color" type="color" value="${colorVal}" style="
            width:44px; height:30px; border:none; background:transparent;
            cursor:pointer; border-radius:4px;
          ">
          <span style="font-size:11px;color:#555;margin-left:8px">Player highlight color</span>
        `)}

        <div style="border-top:1px solid #1a1a1a;margin:18px 0"></div>
        <div style="font-size:10px;color:#333;letter-spacing:1px">
          Changes apply instantly · Saved automatically
        </div>
      </div>
    `;

    const mapHtml = `
      <div style="max-height:70vh;overflow-y:auto;padding-right:8px">
        <div style="font-size:11px;letter-spacing:3px;color:#444;margin-bottom:20px">SELECT MAP</div>
        ${Object.values(DIFFICULTY).map(diff => `
          <div style="margin-bottom:16px">
            <div style="color:${DIFF_COLOR[diff]};font-size:10px;font-weight:bold;
              letter-spacing:2px;margin-bottom:8px">${DIFF_LABEL[diff].toUpperCase()}</div>
            <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:5px">
              ${(MAPS_BY_DIFF[diff] || []).map(m => `
                <div data-mapid="${m.id}" class="pm-map-card" style="
                  padding:8px 10px; border:1px solid #1e1e1e; border-radius:5px;
                  background:rgba(255,255,255,0.02); cursor:pointer; user-select:none;
                "
                  onmouseover="this.style.borderColor='#444';this.style.background='rgba(255,255,255,0.05)'"
                  onmouseout="this.style.borderColor='#1e1e1e';this.style.background='rgba(255,255,255,0.02)'"
                >
                  <div style="font-size:12px;font-weight:bold;color:#ccc">${_esc(m.name)}</div>
                  <div style="font-size:10px;color:#444;margin-top:2px">${_esc(m.desc)}</div>
                </div>
              `).join('')}
            </div>
          </div>
        `).join('')}
      </div>
    `;

    this._el.innerHTML = `
      <div style="
        display:flex; width:min(820px,96vw); max-height:90vh;
        background:#0a0a0f; border:1px solid #1a1a2a; border-radius:10px;
        overflow:hidden; box-shadow:0 0 60px rgba(0,0,0,0.8);
      ">
        <!-- Left nav sidebar -->
        <div style="
          width:160px; min-width:160px; background:#06060c;
          border-right:1px solid #111; padding:24px 12px;
          display:flex; flex-direction:column;
        ">
          <div style="font-size:11px;letter-spacing:5px;color:#222;margin-bottom:4px">SURF</div>
          <div style="font-size:18px;font-weight:bold;color:#00cfff;margin-bottom:28px">PAUSED</div>

          ${navBtn('pm-nav-resume',  '▶  Resume',     false)}
          ${navBtn('pm-nav-settings','⚙  Settings',   this._tab === 'settings')}
          ${navBtn('pm-nav-map',     '🗺  Change Map', this._tab === 'mapselect')}

          <div style="flex:1"></div>

          ${navBtn('pm-nav-mainmenu','⌂  Main Menu',  false)}

          <div style="color:#282828;font-size:10px;margin-top:12px;letter-spacing:1px">
            ESC to resume
          </div>
        </div>

        <!-- Right content -->
        <div style="flex:1;padding:24px 28px;overflow-y:auto;min-height:400px">
          ${this._tab === 'settings' ? settingsHtml : mapHtml}
        </div>
      </div>
    `;

    this._wireEvents();
  }

  _wireEvents() {
    const $ = id => document.getElementById(id);

    // Nav buttons
    $('pm-nav-resume')?.addEventListener('click', () => {
      this.hide();
      this.onResume?.();
    });

    $('pm-nav-settings')?.addEventListener('click', () => {
      this._tab = 'settings';
      this._render();
    });

    $('pm-nav-map')?.addEventListener('click', () => {
      this._tab = 'mapselect';
      this._render();
    });

    $('pm-nav-mainmenu')?.addEventListener('click', () => {
      this.hide();
      this.onMainMenu?.();
    });

    // Settings sliders (live update)
    const sensEl = $('pm-sens');
    const sensLbl = $('pm-sens-lbl');
    if (sensEl) {
      sensEl.addEventListener('input', () => {
        const v = parseFloat(sensEl.value);
        if (sensLbl) sensLbl.textContent = v.toFixed(4);
        this._settings?.set('sensitivity', v);
      });
    }

    const fovEl = $('pm-fov');
    const fovLbl = $('pm-fov-lbl');
    if (fovEl) {
      fovEl.addEventListener('input', () => {
        const v = parseFloat(fovEl.value);
        if (fovLbl) fovLbl.textContent = v + '°';
        this._settings?.set('fov', v);
      });
    }

    const volEl = $('pm-vol');
    const volLbl = $('pm-vol-lbl');
    if (volEl) {
      volEl.addEventListener('input', () => {
        const v = parseFloat(volEl.value);
        if (volLbl) volLbl.textContent = Math.round(v * 100) + '%';
        this._settings?.set('volume', v);
      });
    }

    // Name save
    $('pm-name-save')?.addEventListener('click', () => {
      const inp = $('pm-name');
      if (!inp) return;
      const v = inp.value.trim().slice(0, 24) || 'Player';
      this._settings?.set('name', v);
    });
    // Also save on Enter
    $('pm-name')?.addEventListener('keydown', e => {
      if (e.code === 'Enter') { e.preventDefault(); $('pm-name-save')?.click(); }
      e.stopPropagation(); // prevent game keys firing
    });

    // Color picker
    $('pm-color')?.addEventListener('input', e => {
      this._settings?.set('color', e.target.value);
    });

    // Map cards (event delegation)
    this._el?.querySelectorAll('.pm-map-card').forEach(card => {
      card.addEventListener('click', () => {
        const mapId = card.dataset.mapid;
        if (!mapId) return;
        this.hide();
        this.onChangeMap?.(mapId);
      });
    });
  }
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function _sliderCss() {
  return `flex:1; accent-color:#00cfff; cursor:pointer; height:4px;`;
}

function _row(label, content) {
  return `
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:14px">
      <div style="min-width:90px;font-size:11px;color:#555;letter-spacing:1px">
        ${label.toUpperCase()}
      </div>
      <div style="display:flex;align-items:center;flex:1;gap:0">
        ${content}
      </div>
    </div>
  `;
}

function _esc(str) {
  return String(str ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
