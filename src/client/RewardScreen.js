/**
 * RewardScreen — Post-match XP / level-up overlay
 * Shows: XP gained breakdown, animated progress bar, level-up fanfare, new unlocks.
 * Usage:
 *   const rewards = new RewardScreen();
 *   rewards.show({ xpGains: [{amount, source, label}], xpSystem, unlocks: [] });
 */
import { RARITY_COLOR } from './CosmeticsSystem.js';
import { levelTitle }   from './XPSystem.js';

export class RewardScreen {
  constructor() {
    this._el      = null;
    this._visible = false;
    this._timer   = null;
  }

  get visible() { return this._visible; }

  /**
   * @param {object} opts
   * @param {Array}  opts.xpGains   — [{amount, label}]
   * @param {object} opts.xpSystem  — XPSystem instance (has .level, .xp, .xpNeeded, .title)
   * @param {number} opts.oldLevel  — level before rewards
   * @param {number} opts.oldXP     — xp before rewards
   * @param {Array}  opts.unlocks   — [{name, rarity, type}] new unlocks this match
   * @param {function} opts.onClose
   */
  show({ xpGains = [], xpSystem, oldLevel = 1, oldXP = 0, unlocks = [], onClose = null } = {}) {
    if (this._visible) this.hide();
    this._visible = true;
    clearTimeout(this._timer);

    const totalXP    = xpGains.reduce((s, g) => s + g.amount, 0);
    const newLevel   = xpSystem?.level ?? oldLevel;
    const leveledUp  = newLevel > oldLevel;
    const currXP     = xpSystem?.xp ?? 0;
    const xpNeeded   = xpSystem?.xpNeeded ?? 100;
    const title      = xpSystem?.title ?? levelTitle(newLevel);

    if (!this._el) this._build();

    this._el.innerHTML = this._render({
      xpGains, totalXP, oldLevel, newLevel, oldXP, currXP, xpNeeded, leveledUp, unlocks, title
    });

    this._el.style.display = 'flex';
    // Animate XP bar after brief delay
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const bar = this._el.querySelector('#rw-xp-fill');
        if (bar) bar.style.width = `${Math.min(100, (currXP / xpNeeded) * 100)}%`;
      });
    });

    // Wire close button
    this._el.querySelector('#rw-close')?.addEventListener('click', () => {
      this.hide(); onClose?.();
    });

    // Auto-dismiss after 9 seconds
    this._timer = setTimeout(() => { this.hide(); onClose?.(); }, 9000);
  }

  hide() {
    this._visible = false;
    if (this._el) this._el.style.display = 'none';
    clearTimeout(this._timer);
  }

  _build() {
    const el = document.createElement('div');
    el.id = 'reward-screen';
    el.style.cssText = `
      display:none; position:fixed; inset:0;
      align-items:center; justify-content:center;
      background:rgba(0,0,0,0.72); backdrop-filter:blur(3px);
      z-index:8500; font-family:monospace; color:#fff; pointer-events:auto;
    `;
    document.body.appendChild(el);
    this._el = el;
  }

  _render({ xpGains, totalXP, oldLevel, newLevel, oldXP, currXP, xpNeeded, leveledUp, unlocks, title }) {
    const rarityColor = (r) => RARITY_COLOR[r] ?? '#888';

    const gainsHtml = xpGains.map(g => `
      <div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid #1a1a1a">
        <span style="color:#888;font-size:12px">${_esc(g.label ?? g.source)}</span>
        <span style="color:#00cfff;font-size:12px;font-weight:bold">+${g.amount} XP</span>
      </div>
    `).join('');

    const unlocksHtml = unlocks.length ? `
      <div style="margin-top:14px">
        <div style="font-size:10px;letter-spacing:3px;color:#444;margin-bottom:8px">UNLOCKED</div>
        ${unlocks.map(u => `
          <div style="display:flex;align-items:center;gap:8px;padding:5px 8px;
            background:rgba(255,255,255,0.03);border:1px solid ${rarityColor(u.rarity)}44;
            border-radius:4px;margin-bottom:4px">
            <span style="color:${rarityColor(u.rarity)};font-size:11px;font-weight:bold">
              ${u.rarity?.toUpperCase() ?? ''}
            </span>
            <span style="font-size:12px;color:#ccc">${_esc(u.name ?? u.id)}</span>
          </div>
        `).join('')}
      </div>
    ` : '';

    const levelUpBanner = leveledUp ? `
      <div style="
        text-align:center;padding:10px;margin-bottom:14px;
        background:linear-gradient(90deg,#00cfff11,#00cfff33,#00cfff11);
        border:1px solid #00cfff44;border-radius:6px;
        animation:pulse 0.6s ease infinite alternate;
      ">
        <div style="font-size:11px;letter-spacing:4px;color:#00cfff88">LEVEL UP</div>
        <div style="font-size:28px;font-weight:900;color:#00cfff">
          ${oldLevel} → ${newLevel}
        </div>
        <div style="font-size:12px;color:#888;margin-top:2px">${title}</div>
      </div>
    ` : '';

    // Old fill width (before animation)
    const oldFill = Math.min(100, (oldXP / xpNeeded) * 100);

    return `
      <div style="
        width:min(440px,90vw); background:#0a0a0f;
        border:1px solid #1a1a2a; border-radius:10px;
        padding:24px; box-shadow:0 0 60px rgba(0,0,0,0.8);
      ">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:18px">
          <div>
            <div style="font-size:10px;letter-spacing:4px;color:#444">MATCH COMPLETE</div>
            <div style="font-size:18px;font-weight:bold;color:#fff;margin-top:2px">XP Report</div>
          </div>
          <button id="rw-close" style="
            background:transparent;border:1px solid #333;color:#666;
            padding:4px 10px;cursor:pointer;font-family:monospace;font-size:11px;
            border-radius:4px;
          ">✕ Close</button>
        </div>

        ${levelUpBanner}

        <div style="margin-bottom:14px">
          <div style="font-size:10px;letter-spacing:3px;color:#444;margin-bottom:8px">XP BREAKDOWN</div>
          ${gainsHtml}
          <div style="display:flex;justify-content:space-between;padding:7px 0;margin-top:4px">
            <span style="color:#fff;font-size:13px;font-weight:bold">Total</span>
            <span style="color:#00cfff;font-size:14px;font-weight:900">+${totalXP} XP</span>
          </div>
        </div>

        <div style="margin-bottom:${unlocks.length ? 14 : 6}px">
          <div style="display:flex;justify-content:space-between;margin-bottom:6px">
            <span style="font-size:11px;color:#555">Level ${newLevel} · ${title}</span>
            <span style="font-size:11px;color:#555">${currXP} / ${xpNeeded} XP</span>
          </div>
          <div style="height:8px;background:#111;border-radius:4px;overflow:hidden">
            <div id="rw-xp-fill" style="
              height:100%;width:${oldFill}%;
              background:linear-gradient(90deg,#0088cc,#00cfff);
              border-radius:4px;transition:width 1.2s cubic-bezier(0.4,0,0.2,1);
            "></div>
          </div>
        </div>

        ${unlocksHtml}

        <div style="text-align:center;margin-top:12px;font-size:10px;color:#222">
          Auto-closing in a moment…
        </div>
      </div>

      <style>
        @keyframes pulse { from { opacity:0.8 } to { opacity:1 } }
      </style>
    `;
  }
}

function _esc(str) { return String(str ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
