/**
 * CrosshairSystem — Fully customizable crosshair with dynamic spread
 * Styles: default, dot, circle, cross+dot, sniper, chevron
 * Persisted in SettingsManager
 */

const LS_KEY = 'surfgame_crosshair';

const DEFAULTS = {
  style:    'default',   // default | dot | circle | sniperDot | plusdot | chevron
  color:    '#ffffff',
  size:     16,          // px (cross arm length)
  thick:    2,           // px
  gap:      4,           // center gap px
  alpha:    0.85,
  outline:  true,
  outlineColor: 'rgba(0,0,0,0.6)',
  dot:      false,
  dotSize:  3,
  dynamic:  true,        // expand on move/shoot
};

export class CrosshairSystem {
  constructor() {
    this._cfg     = { ...DEFAULTS };
    this._spread  = 0;    // current extra spread px
    this._targetSpread = 0;
    this._el      = document.getElementById('crosshair') ?? this._buildEl();
    this._load();
    this._draw();
  }

  // ── Called on shoot ────────────────────────────────────────────────────────

  onShoot() {
    this._targetSpread = Math.min(this._targetSpread + 8, 32);
  }

  // ── Called on move (speed-based spread) ───────────────────────────────────

  setSpeed(hSpeed) {
    if (!this._cfg.dynamic) return;
    this._targetSpread = Math.max(this._targetSpread, Math.min(14, (hSpeed - 200) / 100));
  }

  // ── Tick: decay spread ─────────────────────────────────────────────────────

  tick(dt) {
    this._spread += (this._targetSpread - this._spread) * (dt * 12);
    this._targetSpread = Math.max(0, this._targetSpread - dt * 30);
    if (this._cfg.dynamic) this._draw();
  }

  // ── Open editor panel ─────────────────────────────────────────────────────

  openEditor(container) {
    const c = this._cfg;
    container.innerHTML = `
      <div style="font-size:9px;letter-spacing:3px;color:#444;margin-bottom:12px">CROSSHAIR</div>

      ${_row('Style', `
        <select id="ch-style" style="${_inputCss()}">
          ${['default','dot','circle','sniperDot','plusdot','chevron'].map(s =>
            `<option value="${s}" ${c.style===s?'selected':''}>${s}</option>`
          ).join('')}
        </select>
      `)}
      ${_row('Color', `<input id="ch-color" type="color" value="${c.color}" style="width:44px;height:28px;border:none;background:transparent;cursor:pointer">`)}
      ${_row('Size',  `${_slider('ch-size', 4, 32, 1, c.size)} <span id="ch-size-lbl" style="min-width:28px;color:#ccc;font-size:12px">${c.size}</span>`)}
      ${_row('Gap',   `${_slider('ch-gap',  0, 16, 1, c.gap)}  <span id="ch-gap-lbl"  style="min-width:28px;color:#ccc;font-size:12px">${c.gap}</span>`)}
      ${_row('Thick', `${_slider('ch-thick',1, 6,  1, c.thick)}<span id="ch-thick-lbl"style="min-width:28px;color:#ccc;font-size:12px">${c.thick}</span>`)}
      ${_row('Alpha', `${_slider('ch-alpha',0.1,1,0.05,c.alpha)}<span id="ch-alpha-lbl"style="min-width:28px;color:#ccc;font-size:12px">${c.alpha.toFixed(2)}</span>`)}
      ${_checkRow('ch-outline','Outline', c.outline)}
      ${_checkRow('ch-dot',    'Center dot', c.dot)}
      ${_checkRow('ch-dynamic','Dynamic spread', c.dynamic)}

      <div style="margin-top:16px;text-align:center">
        <div id="ch-preview-wrap" style="
          width:80px;height:80px;background:#1a1a1a;border:1px solid #222;border-radius:6px;
          display:inline-flex;align-items:center;justify-content:center;
        ">
          <canvas id="ch-preview" width="80" height="80"></canvas>
        </div>
      </div>
    `;

    const bind = (id, key, parse = v => v, labelId = null) => {
      const el = container.querySelector(`#${id}`);
      if (!el) return;
      el.addEventListener('input', () => {
        const v = parse(el.value);
        this._cfg[key] = v;
        this._save();
        this._draw();
        this._drawPreview(container.querySelector('#ch-preview'));
        if (labelId) container.querySelector(`#${labelId}`).textContent =
          typeof v === 'number' ? (v % 1 ? v.toFixed(2) : v) : '';
      });
    };

    bind('ch-style',  'style',   v => v);
    bind('ch-color',  'color',   v => v);
    bind('ch-size',   'size',    parseFloat, 'ch-size-lbl');
    bind('ch-gap',    'gap',     parseFloat, 'ch-gap-lbl');
    bind('ch-thick',  'thick',   parseFloat, 'ch-thick-lbl');
    bind('ch-alpha',  'alpha',   parseFloat, 'ch-alpha-lbl');
    // Note: checkboxes are handled by the 'change' listener block below.
    // Calling bind() with el.value for checkboxes would always yield "on", not a boolean.

    // Checkbox events — use el.checked (not el.value which is always "on")
    const _checkboxKeyMap = { 'ch-outline': 'outline', 'ch-dot': 'dot', 'ch-dynamic': 'dynamic' };
    ['ch-outline', 'ch-dot', 'ch-dynamic'].forEach(id => {
      const el = container.querySelector(`#${id}`);
      if (!el) return;
      el.addEventListener('change', () => {
        this._cfg[_checkboxKeyMap[id]] = el.checked;
        this._save();
        this._draw();
        this._drawPreview(container.querySelector('#ch-preview'));
      });
    });

    this._drawPreview(container.querySelector('#ch-preview'));
  }

  // ── Draw crosshair to HUD DOM ──────────────────────────────────────────────

  _draw() {
    if (!this._el) return;
    const c     = this._cfg;
    const extra = this._spread | 0;
    const size  = c.size + extra;
    const gap   = c.gap  + extra * 0.5;
    const col   = c.color;
    const ol    = c.outline ? `text-shadow:1px 1px 2px ${c.outlineColor},-1px -1px 2px ${c.outlineColor}` : '';

    // Clear old content
    this._el.innerHTML = '';
    this._el.style.cssText = `
      position:fixed; top:50%; left:50%;
      transform:translate(-50%,-50%);
      pointer-events:none; z-index:300;
    `;

    const canvas = document.createElement('canvas');
    const dim = (size + gap + 4) * 2 + 20;
    canvas.width  = dim;
    canvas.height = dim;
    canvas.style.cssText = `
      position:absolute; left:50%; top:50%;
      transform:translate(-50%,-50%);
      opacity:${c.alpha};
    `;
    this._el.appendChild(canvas);

    const ctx = canvas.getContext('2d');
    const cx  = dim / 2;
    const cy  = dim / 2;

    ctx.strokeStyle = col;
    ctx.fillStyle   = col;
    ctx.lineWidth   = c.thick;

    if (c.outline) {
      ctx.shadowColor   = c.outlineColor;
      ctx.shadowBlur    = 3;
    }

    switch (c.style) {
      case 'dot':
        ctx.beginPath();
        ctx.arc(cx, cy, c.dotSize + extra * 0.3, 0, Math.PI * 2);
        ctx.fill();
        break;

      case 'circle':
        ctx.beginPath();
        ctx.arc(cx, cy, size * 0.5 + gap * 0.5, 0, Math.PI * 2);
        ctx.stroke();
        if (c.dot) { ctx.beginPath(); ctx.arc(cx, cy, c.dotSize, 0, Math.PI*2); ctx.fill(); }
        break;

      case 'sniperDot':
        // Long thin lines with large gap + dot
        ctx.lineWidth = 1;
        const sLen = size * 2.5;
        ctx.beginPath(); ctx.moveTo(cx - sLen, cy); ctx.lineTo(cx - gap * 2, cy); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx + gap * 2, cy); ctx.lineTo(cx + sLen, cy); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx, cy - sLen); ctx.lineTo(cx, cy - gap * 2); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx, cy + gap * 2); ctx.lineTo(cx, cy + sLen); ctx.stroke();
        ctx.beginPath(); ctx.arc(cx, cy, 1.5, 0, Math.PI * 2); ctx.fill();
        break;

      case 'chevron':
        ctx.lineJoin = 'round';
        ctx.lineWidth = c.thick + 1;
        const h = size * 0.6;
        ctx.beginPath();
        ctx.moveTo(cx - size, cy + h * 0.5);
        ctx.lineTo(cx, cy - h * 0.5);
        ctx.lineTo(cx + size, cy + h * 0.5);
        ctx.stroke();
        break;

      case 'plusdot':
      default:
        // Standard cross
        const arms = [
          [cx - size - gap, cy, cx - gap, cy],
          [cx + gap, cy, cx + size + gap, cy],
          [cx, cy - size - gap, cx, cy - gap],
          [cx, cy + gap, cx, cy + size + gap],
        ];
        for (const [x1, y1, x2, y2] of arms) {
          ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
        }
        if (c.dot || c.style === 'plusdot') {
          ctx.beginPath(); ctx.arc(cx, cy, c.dotSize, 0, Math.PI * 2); ctx.fill();
        }
        break;
    }
  }

  _drawPreview(canvas) {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, 80, 80);
    // Draw dark bg
    ctx.fillStyle = '#111'; ctx.fillRect(0, 0, 80, 80);
    // Mini crosshair
    const c   = this._cfg;
    const cx  = 40; const cy = 40;
    ctx.strokeStyle = c.color; ctx.fillStyle = c.color;
    ctx.lineWidth   = c.thick; ctx.globalAlpha = c.alpha;
    if (c.outline) { ctx.shadowColor = c.outlineColor; ctx.shadowBlur = 2; }
    const s = Math.round(c.size * 0.65); const g = Math.round(c.gap * 0.65);
    ctx.beginPath(); ctx.moveTo(cx-s-g,cy); ctx.lineTo(cx-g,cy); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx+g,cy); ctx.lineTo(cx+s+g,cy); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx,cy-s-g); ctx.lineTo(cx,cy-g); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx,cy+g); ctx.lineTo(cx,cy+s+g); ctx.stroke();
    if (c.dot) { ctx.beginPath(); ctx.arc(cx,cy,Math.round(c.dotSize*0.65),0,Math.PI*2); ctx.fill(); }
    ctx.globalAlpha = 1;
  }

  _buildEl() {
    const el = document.createElement('div');
    el.id = 'crosshair';
    document.body.appendChild(el);
    return el;
  }

  _load() {
    try {
      const saved = JSON.parse(localStorage.getItem(LS_KEY) || '{}');
      this._cfg = { ...DEFAULTS, ...saved };
    } catch { this._cfg = { ...DEFAULTS }; }
  }

  _save() {
    try { localStorage.setItem(LS_KEY, JSON.stringify(this._cfg)); } catch {}
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function _inputCss() {
  return 'background:#111;border:1px solid #333;color:#fff;padding:4px 6px;font-family:monospace;font-size:12px;border-radius:4px;flex:1';
}
function _slider(id, min, max, step, val) {
  return `<input id="${id}" type="range" min="${min}" max="${max}" step="${step}" value="${val}" style="flex:1;accent-color:#00cfff;cursor:pointer;height:4px">`;
}
function _row(label, content) {
  return `<div style="display:flex;align-items:center;gap:10px;margin-bottom:10px">
    <div style="min-width:70px;font-size:10px;color:#555;letter-spacing:1px">${label.toUpperCase()}</div>
    <div style="display:flex;align-items:center;flex:1;gap:6px">${content}</div>
  </div>`;
}
function _checkRow(id, label, checked) {
  return `<div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
    <div style="min-width:70px;font-size:10px;color:#555;letter-spacing:1px">${label.toUpperCase()}</div>
    <input id="${id}" type="checkbox" ${checked?'checked':''} style="accent-color:#00cfff;width:14px;height:14px;cursor:pointer">
  </div>`;
}
