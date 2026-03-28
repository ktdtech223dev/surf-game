/**
 * SettingsManager — Phase 4
 * Persists player name, sensitivity, FOV, and volume in localStorage.
 * Provides a settings panel (Escape key) and name entry on first launch.
 */

const LS_KEY = 'surfgame_settings';

const CREW = [
  { id: 'keshawn', name: 'Keshawn', color: '#80e060' },
  { id: 'sean',    name: 'Sean',    color: '#f0c040' },
  { id: 'dart',    name: 'Dart',    color: '#e04040' },
  { id: 'amari',   name: 'Amari',   color: '#40c0e0' },
];

const DEFAULTS = {
  name:        'Player',
  sensitivity: 0.002,
  fov:         90,
  volume:      0.7,
  color:       '#00cfff',
  profileId:   null,
};

export class SettingsManager {
  constructor() {
    this._data    = { ...DEFAULTS };
    this._panelEl = document.getElementById('settings-panel');
    this._nameEl  = document.getElementById('settings-panel');
    this._load();
    this._bindPanel();
  }

  // ── Accessors ──────────────────────────────────────────────────────────────

  get name()        { return this._data.name; }
  get sensitivity() { return this._data.sensitivity; }
  get fov()         { return this._data.fov; }
  get volume()      { return this._data.volume; }
  get color()       { return this._data.color; }

  /** True if this is the player's first visit (name is default) */
  get isFirstLaunch() {
    return !localStorage.getItem(LS_KEY);
  }

  // ── Panel open / close ─────────────────────────────────────────────────────

  openPanel() {
    this._populatePanel();
    const el = document.getElementById('settings-panel');
    if (el) el.style.display = 'flex';
  }

  closePanel() {
    const el = document.getElementById('settings-panel');
    if (el) el.style.display = 'none';
  }

  isPanelOpen() {
    const el = document.getElementById('settings-panel');
    return el ? el.style.display !== 'none' : false;
  }

  // ── Profile selection (shown every launch) ────────────────────────────────

  /**
   * Show the N Games crew profile selector.
   * Resolves with the selected profile id ('keshawn' | 'sean' | 'dart' | 'amari').
   */
  promptName() {
    return new Promise(resolve => {
      const screen = document.getElementById('profile-screen');
      if (!screen) { resolve(this._data.profileId ?? 'keshawn'); return; }

      screen.style.display = 'flex';

      const cards = screen.querySelectorAll('.profile-card');
      const lastId = this._data.profileId;

      // Highlight previously selected card
      cards.forEach(card => {
        if (lastId && card.dataset.id === lastId) {
          card.style.outline = '2px solid ' + card.dataset.color;
        }
      });

      const pick = (card) => {
        const { id, name, color } = card.dataset;
        this._data.profileId = id;
        this._data.name      = name;
        this._data.color     = color;
        this._save();
        screen.style.display = 'none';
        resolve(id);
      };

      cards.forEach(card => {
        // Hover effect
        card.addEventListener('mouseenter', () => {
          card.style.background = `rgba(255,255,255,0.06)`;
          card.style.transform  = 'scale(1.04)';
        });
        card.addEventListener('mouseleave', () => {
          card.style.background = `rgba(${_hexToRgb(card.dataset.color)},0.05)`;
          card.style.transform  = 'scale(1)';
        });
        card.addEventListener('click', () => pick(card), { once: true });
      });
    });
  }

  get profileId() { return this._data.profileId; }

  // ── Internal ───────────────────────────────────────────────────────────────

  _load() {
    try {
      const saved = JSON.parse(localStorage.getItem(LS_KEY) || '{}');
      this._data = { ...DEFAULTS, ...saved };
    } catch { this._data = { ...DEFAULTS }; }
  }

  _save() {
    try { localStorage.setItem(LS_KEY, JSON.stringify(this._data)); } catch {}
  }

  _populatePanel() {
    const byId = id => document.getElementById(id);

    const nameInput = byId('cfg-name');
    if (nameInput) nameInput.value = this._data.name;

    const sensSlider = byId('cfg-sensitivity');
    if (sensSlider) sensSlider.value = this._data.sensitivity;

    const sensLabel = byId('cfg-sensitivity-label');
    if (sensLabel) sensLabel.textContent = this._data.sensitivity.toFixed(4);

    const fovSlider = byId('cfg-fov');
    if (fovSlider) fovSlider.value = this._data.fov;

    const fovLabel = byId('cfg-fov-label');
    if (fovLabel) fovLabel.textContent = this._data.fov;

    const volSlider = byId('cfg-volume');
    if (volSlider) volSlider.value = this._data.volume;

    const volLabel = byId('cfg-volume-label');
    if (volLabel) volLabel.textContent = Math.round(this._data.volume * 100) + '%';

    const colorPick = byId('cfg-color');
    if (colorPick) colorPick.value = this._data.color;
  }

  _bindPanel() {
    // Live slider updates
    const bind = (id, labelId, key, transform = v => v) => {
      const el = document.getElementById(id);
      const lb = document.getElementById(labelId);
      if (!el) return;
      el.addEventListener('input', () => {
        const v = parseFloat(el.value);
        this._data[key] = transform(v);
        if (lb) lb.textContent = key === 'volume'
          ? Math.round(v * 100) + '%'
          : key === 'sensitivity'
            ? v.toFixed(4)
            : v;
        this._save();
        this._onChange?.(key, this._data[key]);
      });
    };

    bind('cfg-sensitivity', 'cfg-sensitivity-label', 'sensitivity');
    bind('cfg-fov',         'cfg-fov-label',         'fov');
    bind('cfg-volume',      'cfg-volume-label',      'volume');

    document.getElementById('cfg-name')?.addEventListener('change', e => {
      const v = e.target.value.trim().slice(0, 20) || 'Player';
      this._data.name = v;
      this._save();
      this._onChange?.('name', v);
    });

    document.getElementById('cfg-color')?.addEventListener('input', e => {
      this._data.color = e.target.value;
      this._save();
      this._onChange?.('color', e.target.value);
    });

    document.getElementById('cfg-close')?.addEventListener('click', () => this.closePanel());
  }

  /** Set a single value, save, and fire onChange — used by PauseMenu sliders */
  set(key, value) {
    this._data[key] = value;
    this._save();
    this._onChange?.(key, value);
  }

  /** Called whenever a setting changes live. Set in main.js */
  onChange(fn) { this._onChange = fn; }
}

function _hexToRgb(hex) {
  const r = parseInt(hex.slice(1,3), 16);
  const g = parseInt(hex.slice(3,5), 16);
  const b = parseInt(hex.slice(5,7), 16);
  return `${r},${g},${b}`;
}
