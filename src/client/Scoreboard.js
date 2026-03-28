/**
 * Scoreboard — Tab key overlay
 * Shows: rank · name · kills · deaths · HP + top run times
 */

export class Scoreboard {
  constructor() {
    this._el          = document.getElementById('scoreboard');
    this._players     = new Map(); // id → { name, kills, deaths, hp, alive }
    this._localId     = null;
    this._leaderboard = [];
  }

  setLocalId(id) { this._localId = id; }

  updateLeaderboard(list) { this._leaderboard = list || []; }

  updateFromList(list) {
    for (const p of list) this._players.set(p.id, { ...p });
    const ids = new Set(list.map(p => p.id));
    for (const id of this._players.keys()) if (!ids.has(id)) this._players.delete(id);
  }

  upsert(id, data) {
    this._players.set(id, { ...(this._players.get(id) || {}), ...data, id });
  }

  remove(id) { this._players.delete(id); }

  show()  { if (!this._el) return; this._render(); this._el.style.display = 'block'; }
  hide()  { if (this._el)  this._el.style.display = 'none'; }

  // ── Private ───────────────────────────────────────────────────────────────

  _render() {
    if (!this._el) return;
    const sorted = [...this._players.values()].sort((a, b) => (b.kills || 0) - (a.kills || 0));

    const rows = sorted.map((p, i) => {
      const isLocal = p.id === this._localId;
      const bg      = isLocal ? 'rgba(0,207,255,0.07)' : 'transparent';
      const nameCol = isLocal ? '#00cfff' : '#ccc';
      const alive   = p.alive !== false;
      const hp      = p.hp ?? 100;
      const hpCol   = hp > 50 ? '#0f0' : hp > 25 ? '#fa0' : '#f44';
      return `<tr style="background:${bg}">
        <td style="color:#445;width:28px">${i + 1}</td>
        <td style="color:${nameCol};max-width:160px;overflow:hidden;white-space:nowrap">
          ${alive ? '' : '<span style="color:#f44;font-size:9px">✝ </span>'}${_esc(p.name || `Player ${p.id}`)}
        </td>
        <td style="color:#0f0;text-align:right">${p.kills ?? 0}</td>
        <td style="color:#f44;text-align:right">${p.deaths ?? 0}</td>
        <td style="color:${hpCol};text-align:right;font-size:11px">${hp}hp</td>
      </tr>`;
    }).join('');

    this._el.innerHTML = `
      <div style="font-weight:bold;color:#00cfff;font-size:14px;margin-bottom:8px;letter-spacing:2px">SCOREBOARD</div>
      <table style="width:100%;border-collapse:collapse;font-size:12px;line-height:1.9">
        <thead>
          <tr style="color:#334;font-size:10px;border-bottom:1px solid #1a2a3a">
            <th style="text-align:left">#</th>
            <th style="text-align:left">NAME</th>
            <th style="text-align:right">K</th>
            <th style="text-align:right">D</th>
            <th style="text-align:right">HP</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
      <div style="color:#334;font-size:10px;margin-top:8px;text-align:center">
        ${this._players.size} player${this._players.size !== 1 ? 's' : ''} online
      </div>
      ${this._leaderboard.length > 0 ? this._renderLeaderboard() : ''}
    `;
  }

  _renderLeaderboard() {
    const rows = this._leaderboard.map((e, i) => {
      const isLocal = e.name === this._localName;
      const col     = i === 0 ? '#ffcc00' : i === 1 ? '#aaa' : i === 2 ? '#cd7f32' : '#446';
      const t       = e.time;
      const ms      = Math.floor((t % 1) * 1000);
      const sec     = Math.floor(t % 60);
      const min     = Math.floor(t / 60);
      const pad     = (n, w = 2) => String(n).padStart(w, '0');
      const timeStr = `${pad(min)}:${pad(sec)}.${pad(ms, 3)}`;
      return `<tr>
        <td style="color:${col};width:24px">${i + 1}</td>
        <td style="color:${isLocal ? '#0cf' : '#aaa'}">${_esc(e.name)}</td>
        <td style="color:${col};text-align:right;font-weight:bold">${timeStr}</td>
        <td style="color:#334;font-size:10px;text-align:right;padding-left:8px">${e.date || ''}</td>
      </tr>`;
    }).join('');
    return `
      <div style="margin-top:14px;border-top:1px solid #0a2040;padding-top:10px">
        <div style="color:#ffcc00;font-size:11px;letter-spacing:3px;margin-bottom:6px">TOP TIMES</div>
        <table style="width:100%;border-collapse:collapse;font-size:12px;line-height:1.8">
          <tbody>${rows}</tbody>
        </table>
      </div>`;
  }

  get _localName() {
    return this._players.get(this._localId)?.name || '';
  }
}

function _esc(str) {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
