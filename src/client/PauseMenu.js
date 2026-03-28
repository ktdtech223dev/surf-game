/**
 * PauseMenu.js — Full in-game pause overlay
 *
 * Layout: left sidebar with primary actions + sub-panel for Settings / Map / Stats / Crosshair
 * Opened automatically on pointer-lock release (main.js pointerlockchange handler).
 * Resume button / Escape key re-acquires pointer lock.
 */
import { MAPS_BY_DIFF, DIFFICULTY } from './MapCatalog.js';
import { RadioSystem } from './RadioSystem.js';

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
  constructor(input, settings = null) {
    this._input       = input;
    this._settings    = settings;
    this._el          = null;
    this._visible     = false;
    this._panel       = null; // null | 'settings' | 'mapselect' | 'stats' | 'crosshair'

    // Set by main.js
    this._statTracker = null;
    this._crosshair   = null;
    this._radio       = null; // RadioSystem instance

    // Callbacks
    this.onResume    = null;
    this.onChangeMap = null;
    this.onMainMenu  = null;
  }

  get visible() { return this._visible; }

  show() {
    if (this._visible) return;
    this._visible = true;
    this._panel   = null;
    if (this._input) this._input.menuOpen = true;
    document.exitPointerLock?.();
    if (!this._el) this._buildShell();
    this._el.style.display = 'flex';
    this._renderSidebar();
    this._renderPanel();
  }

  hide() {
    if (!this._visible) return;
    this._visible = false;
    if (this._input) this._input.menuOpen = false;
    if (this._el) this._el.style.display = 'none';
  }

  // ── Shell (built once) ────────────────────────────────────────────────────
  _buildShell() {
    const el = document.createElement('div');
    el.id = 'pause-menu';
    el.style.cssText = `
      display:none; position:fixed; inset:0;
      background:rgba(0,0,0,0.82); backdrop-filter:blur(6px);
      align-items:center; justify-content:center;
      font-family:monospace; color:#fff; z-index:9500;
    `;
    el.innerHTML = `
      <div id="pm-box" style="
        display:flex; width:min(780px,95vw); max-height:88vh;
        background:#080810; border:1px solid #1a1a2e;
        border-radius:12px; overflow:hidden;
        box-shadow:0 0 80px rgba(0,0,0,0.9), 0 0 0 1px rgba(0,207,255,0.04);
      ">
        <div id="pm-sidebar" style="
          width:210px; min-width:210px; background:#05050e;
          border-right:1px solid #111622; padding:28px 14px;
          display:flex; flex-direction:column; gap:2px;
        "></div>
        <div id="pm-panel" style="
          flex:1; padding:28px 32px; overflow-y:auto; min-height:420px;
        "></div>
      </div>
    `;
    document.body.appendChild(el);
    this._el = el;
  }

  // ── Sidebar ───────────────────────────────────────────────────────────────
  _renderSidebar() {
    const sb = document.getElementById('pm-sidebar');
    if (!sb) return;

    const btn = (id, icon, label, danger = false, accent = false) => `
      <button id="${id}" style="
        display:flex; align-items:center; gap:10px;
        width:100%; padding:12px 14px; margin:0;
        background:transparent; border:none;
        color:${danger ? '#e55' : accent ? '#00cfff' : '#9a9ab0'};
        cursor:pointer; font-family:monospace; font-size:13px;
        border-radius:7px; text-align:left; letter-spacing:0.5px;
        transition:background 0.1s, color 0.1s;
      "
        onmouseover="this.style.background='rgba(255,255,255,0.06)';this.style.color='${danger ? '#ff6666' : '#fff'}'"
        onmouseout="this.style.background='transparent';this.style.color='${danger ? '#e55' : accent ? '#00cfff' : '#9a9ab0'}'"
      >
        <span style="font-size:15px;width:20px;text-align:center">${icon}</span>
        <span>${label}</span>
      </button>
    `;

    const divider = `<div style="height:1px;background:#111622;margin:8px 4px"></div>`;

    sb.innerHTML = `
      <div style="padding:4px 14px 20px">
        <div style="font-size:9px;letter-spacing:5px;color:#1e1e3a;margin-bottom:2px">SURF GAME</div>
        <div style="font-size:22px;font-weight:900;color:#00cfff;letter-spacing:3px">PAUSED</div>
      </div>

      ${btn('pm-resume',   '▶', 'Resume',      false, true)}
      ${divider}
      ${btn('pm-mapsel',   '🗺', 'Change Map')}
      ${btn('pm-settings', '⚙', 'Settings')}
      ${btn('pm-stats',    '📊', 'Statistics')}
      ${btn('pm-crosshair','✛', 'Crosshair')}
      ${btn('pm-radio',    '📻', 'Radio')}
      <div style="flex:1;min-height:20px"></div>
      ${divider}
      ${btn('pm-mainmenu', '⌂', 'Main Menu',   false, false)}
    `;

    document.getElementById('pm-resume')?.addEventListener('click', () => {
      this.hide();
      this.onResume?.();
    });

    document.getElementById('pm-mapsel')?.addEventListener('click', () => {
      this._panel = 'mapselect'; this._renderPanel(); this._highlightNav('pm-mapsel');
    });
    document.getElementById('pm-settings')?.addEventListener('click', () => {
      this._panel = 'settings'; this._renderPanel(); this._highlightNav('pm-settings');
    });
    document.getElementById('pm-stats')?.addEventListener('click', () => {
      this._panel = 'stats'; this._renderPanel(); this._highlightNav('pm-stats');
    });
    document.getElementById('pm-crosshair')?.addEventListener('click', () => {
      this._panel = 'crosshair'; this._renderPanel(); this._highlightNav('pm-crosshair');
    });

    document.getElementById('pm-radio')?.addEventListener('click', () => {
      this._panel = 'radio'; this._renderPanel(); this._highlightNav('pm-radio');
    });
    document.getElementById('pm-mainmenu')?.addEventListener('click', () => {
      this.hide();
      this.onMainMenu?.();
    });
  }

  _highlightNav(activeId) {
    ['pm-mapsel','pm-settings','pm-stats','pm-crosshair','pm-radio'].forEach(id => {
      const el = document.getElementById(id);
      if (!el) return;
      if (id === activeId) {
        el.style.background = 'rgba(0,207,255,0.1)';
        el.style.color      = '#00cfff';
      } else {
        el.style.background = 'transparent';
        el.style.color      = '#9a9ab0';
      }
    });
  }

  // ── Right panel ───────────────────────────────────────────────────────────
  _renderPanel() {
    const panel = document.getElementById('pm-panel');
    if (!panel) return;

    switch (this._panel) {
      case 'settings':  panel.innerHTML = this._settingsHTML();  this._wireSettings();  break;
      case 'mapselect': panel.innerHTML = this._mapSelectHTML(); this._wireMapSelect(); break;
      case 'stats':
        panel.innerHTML = '<div id="pm-stats-wrap"></div>';
        if (this._statTracker) {
          const wrap = document.getElementById('pm-stats-wrap');
          if (wrap) wrap.innerHTML = this._statTracker.renderHTML();
        }
        break;
      case 'crosshair':
        panel.innerHTML = '<div id="pm-crosshair-wrap"></div>';
        if (this._crosshair) {
          const wrap = document.getElementById('pm-crosshair-wrap');
          if (wrap) this._crosshair.openEditor(wrap);
        }
        break;
      case 'radio':
        panel.innerHTML = '<div id="pm-radio-wrap"></div>';
        if (this._radio) {
          this._radio.renderPanel(document.getElementById('pm-radio-wrap'));
        }
        break;
      default:
        panel.innerHTML = this._homeHTML();
        this._wireHome();
    }
  }

  // ── Home panel (default) ──────────────────────────────────────────────────
  _homeHTML() {
    const s = this._settings;
    const name = _esc(s?.name ?? 'Player');
    return `
      <div style="height:100%;display:flex;flex-direction:column;justify-content:center;align-items:center;gap:0;padding:0 16px">
        <div style="font-size:11px;letter-spacing:4px;color:#1e1e3a;margin-bottom:28px">GAME PAUSED</div>

        <button id="pm-home-resume" style="
          width:100%; max-width:300px; padding:16px; margin-bottom:10px;
          background:rgba(0,207,255,0.12); border:1px solid rgba(0,207,255,0.35);
          color:#00cfff; font-family:monospace; font-size:15px; font-weight:bold;
          letter-spacing:3px; border-radius:8px; cursor:pointer;
          transition:all 0.15s;
          box-shadow:0 0 20px rgba(0,207,255,0.1);
        "
          onmouseover="this.style.background='rgba(0,207,255,0.22)';this.style.boxShadow='0 0 30px rgba(0,207,255,0.25)'"
          onmouseout="this.style.background='rgba(0,207,255,0.12)';this.style.boxShadow='0 0 20px rgba(0,207,255,0.1)'"
        >▶  RESUME</button>

        <button id="pm-home-map" style="
          width:100%; max-width:300px; padding:13px; margin-bottom:6px;
          background:rgba(255,255,255,0.03); border:1px solid #1a1a2e;
          color:#8888aa; font-family:monospace; font-size:13px; letter-spacing:2px;
          border-radius:8px; cursor:pointer; transition:all 0.12s;
        "
          onmouseover="this.style.background='rgba(255,255,255,0.07)';this.style.color='#ccc';this.style.borderColor='#333'"
          onmouseout="this.style.background='rgba(255,255,255,0.03)';this.style.color='#8888aa';this.style.borderColor='#1a1a2e'"
        >🗺  CHANGE MAP</button>

        <button id="pm-home-menu" style="
          width:100%; max-width:300px; padding:13px; margin-bottom:0;
          background:rgba(255,255,255,0.03); border:1px solid #1a1a2e;
          color:#8888aa; font-family:monospace; font-size:13px; letter-spacing:2px;
          border-radius:8px; cursor:pointer; transition:all 0.12s;
        "
          onmouseover="this.style.background='rgba(255,255,255,0.07)';this.style.color='#ccc';this.style.borderColor='#333'"
          onmouseout="this.style.background='rgba(255,255,255,0.03)';this.style.color='#8888aa';this.style.borderColor='#1a1a2e'"
        >⌂  MAIN MENU</button>

        <div style="margin-top:32px;font-size:10px;color:#1a1a2a;letter-spacing:2px">
          ESC to resume &nbsp;·&nbsp; playing as ${name}
        </div>
      </div>
    `;
  }

  _wireHome() {
    document.getElementById('pm-home-resume')?.addEventListener('click', () => {
      this.hide(); this.onResume?.();
    });
    document.getElementById('pm-home-map')?.addEventListener('click', () => {
      this._panel = 'mapselect'; this._renderPanel(); this._highlightNav('pm-mapsel');
    });
    document.getElementById('pm-home-menu')?.addEventListener('click', () => {
      this.hide(); this.onMainMenu?.();
    });
  }

  // ── Settings panel ────────────────────────────────────────────────────────
  _settingsHTML() {
    const s        = this._settings;
    const sensVal  = s?.sensitivity ?? 0.002;
    const fovVal   = s?.fov ?? 90;
    const volVal   = s?.volume ?? 0.7;
    const nameVal  = _esc(s?.name ?? 'Player');
    const colorVal = s?.color ?? '#00cfff';

    return `
      <div>
        <div style="font-size:10px;letter-spacing:4px;color:#2a2a4a;margin-bottom:24px">SETTINGS</div>

        ${_row('SENSITIVITY', `
          <input id="pm-sens" type="range" min="0.0005" max="0.008" step="0.0001"
            value="${sensVal}" style="${_sliderCss()}">
          <span id="pm-sens-lbl" style="min-width:48px;text-align:right;color:#ccc;font-size:12px">${sensVal.toFixed(4)}</span>
        `)}
        ${_row('FOV', `
          <input id="pm-fov" type="range" min="60" max="130" step="1"
            value="${fovVal}" style="${_sliderCss()}">
          <span id="pm-fov-lbl" style="min-width:36px;text-align:right;color:#ccc;font-size:12px">${fovVal}°</span>
        `)}
        ${_row('VOLUME', `
          <input id="pm-vol" type="range" min="0" max="1" step="0.01"
            value="${volVal}" style="${_sliderCss()}">
          <span id="pm-vol-lbl" style="min-width:36px;text-align:right;color:#ccc;font-size:12px">${Math.round(volVal*100)}%</span>
        `)}

        <div style="border-top:1px solid #111622;margin:20px 0"></div>

        ${_row('NAME', `
          <input id="pm-name" type="text" value="${nameVal}" maxlength="24" style="
            flex:1; background:#0d0d18; border:1px solid #222;
            color:#fff; padding:6px 10px; font-family:monospace;
            font-size:13px; border-radius:5px; outline:none;
          ">
          <button id="pm-name-save" style="
            padding:6px 12px; background:#0a2a3a; border:1px solid #00cfff33;
            color:#00cfff; cursor:pointer; font-family:monospace;
            font-size:11px; border-radius:5px; margin-left:8px; white-space:nowrap;
          ">Save</button>
        `)}
        ${_row('COLOR', `
          <input id="pm-color" type="color" value="${colorVal}" style="
            width:44px; height:30px; border:none; background:transparent; cursor:pointer; border-radius:4px;
          ">
          <span style="font-size:11px;color:#3a3a5a;margin-left:10px">Player highlight</span>
        `)}

        <div style="border-top:1px solid #111622;margin:20px 0"></div>
        <div style="font-size:10px;color:#2a2a3a;letter-spacing:1px">Changes apply instantly · Saved automatically</div>
      </div>
    `;
  }

  _wireSettings() {
    const $   = id => document.getElementById(id);
    const s   = this._settings;
    const wire = (elId, lblId, prop, fmt) => {
      const el  = $(elId);
      const lbl = $(lblId);
      el?.addEventListener('input', () => {
        const v = parseFloat(el.value);
        if (lbl) lbl.textContent = fmt(v);
        s?.set(prop, v);
      });
    };
    wire('pm-sens', 'pm-sens-lbl', 'sensitivity', v => v.toFixed(4));
    wire('pm-fov',  'pm-fov-lbl',  'fov',         v => v + '°');
    wire('pm-vol',  'pm-vol-lbl',  'volume',       v => Math.round(v * 100) + '%');

    $('pm-name-save')?.addEventListener('click', () => {
      const v = ($('pm-name')?.value?.trim() || 'Player').slice(0, 24);
      s?.set('name', v);
    });
    $('pm-name')?.addEventListener('keydown', e => {
      if (e.code === 'Enter') { e.preventDefault(); $('pm-name-save')?.click(); }
      e.stopPropagation();
    });
    $('pm-color')?.addEventListener('input', e => s?.set('color', e.target.value));
  }

  // ── Map select panel ──────────────────────────────────────────────────────
  _mapSelectHTML() {
    return `
      <div>
        <div style="font-size:10px;letter-spacing:4px;color:#2a2a4a;margin-bottom:24px">CHANGE MAP</div>
        <div style="max-height:60vh;overflow-y:auto;padding-right:6px">
          ${Object.values(DIFFICULTY).map(diff => `
            <div style="margin-bottom:20px">
              <div style="
                color:${DIFF_COLOR[diff]};font-size:9px;font-weight:bold;
                letter-spacing:3px;margin-bottom:8px;
              ">${DIFF_LABEL[diff].toUpperCase()}</div>
              <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:6px">
                ${(MAPS_BY_DIFF[diff] || []).map(m => `
                  <div data-mapid="${m.id}" class="pm-map-card" style="
                    padding:10px 12px; border:1px solid #161622;
                    border-radius:7px; background:rgba(255,255,255,0.02);
                    cursor:pointer; user-select:none; transition:all 0.12s;
                  "
                    onmouseover="this.style.borderColor='${DIFF_COLOR[diff]}44';this.style.background='rgba(255,255,255,0.05)'"
                    onmouseout="this.style.borderColor='#161622';this.style.background='rgba(255,255,255,0.02)'"
                  >
                    <div style="font-size:12px;font-weight:bold;color:#ccc">${_esc(m.name)}</div>
                    <div style="font-size:10px;color:#3a3a5a;margin-top:3px">${_esc(m.desc ?? '')}</div>
                  </div>
                `).join('')}
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  _wireMapSelect() {
    document.querySelectorAll('.pm-map-card').forEach(card => {
      card.addEventListener('click', () => {
        const mapId = card.dataset.mapid;
        if (!mapId) return;
        this.hide();
        this.onChangeMap?.(mapId);
      });
    });
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function _sliderCss() {
  return 'flex:1; accent-color:#00cfff; cursor:pointer; height:4px;';
}

function _row(label, content) {
  return `
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px">
      <div style="min-width:96px;font-size:10px;color:#3a3a5a;letter-spacing:1.5px">${label}</div>
      <div style="display:flex;align-items:center;flex:1;gap:0">${content}</div>
    </div>
  `;
}

function _esc(str) {
  return String(str ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
