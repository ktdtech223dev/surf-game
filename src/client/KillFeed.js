/**
 * KillFeed — floating kill notifications (top-right area)
 * Each entry fades after 5 s; max 6 shown at once.
 */

const MAX_ENTRIES = 6;
const FADE_MS     = 5000;

export class KillFeed {
  constructor() {
    this._el      = document.getElementById('kill-feed');
    this._entries = []; // { el, expireAt }
  }

  /** @param {{ killerId, victimId, killerName, victimName }} kill */
  addKill(kill, localId) {
    if (!this._el) return;

    const isLocalKiller = kill.killerId === localId;
    const isLocalVictim = kill.victimId === localId;

    const killerColor = isLocalKiller ? '#00ff88' : '#ccc';
    const victimColor = isLocalVictim ? '#ff4444' : '#aaa';
    const icon        = '⚡';

    const div = document.createElement('div');
    div.className = 'kf-entry';
    div.innerHTML =
      `<span style="color:${killerColor}">${_esc(kill.killerName)}</span>`
      + ` <span style="color:#555">${icon}</span> `
      + `<span style="color:${victimColor}">${_esc(kill.victimName)}</span>`;
    div.style.opacity   = '1';
    div.style.transition = `opacity 0.6s`;

    this._el.prepend(div);
    this._entries.unshift({ el: div, expireAt: performance.now() + FADE_MS });

    // Trim to max
    while (this._entries.length > MAX_ENTRIES) {
      const old = this._entries.pop();
      old.el.remove();
    }
  }

  /** Call every frame to expire entries */
  tick() {
    const now = performance.now();
    this._entries = this._entries.filter(e => {
      if (now > e.expireAt) {
        e.el.style.opacity = '0';
        setTimeout(() => e.el.remove(), 650);
        return false;
      }
      return true;
    });
  }
}

function _esc(str) {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
