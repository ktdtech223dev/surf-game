/**
 * MainMenu.js — Animated main menu + map select + loadout screen
 * No localStorage — all data from DataService
 */
import { ds } from './DataService.js';
import { MAP_CATALOG, MAPS_BY_DIFF, DIFFICULTY } from './MapCatalog.js';
import { KNIFE_DEFS, KNIFE_BY_ID } from './KnifeSystem.js';

export class MainMenu {
  constructor(onPlayMap, input = null, net = null) {
    this._onPlayMap  = onPlayMap; // callback(mapId)
    this._input      = input;     // InputManager — used to block pointer lock while menu is open
    this._net        = net;       // NetworkClient — for lobby state
    this.onJoinOnline = null;     // set by main.js
    this._el         = null;
    this._visible    = false;
    this._tab        = 'play';   // 'play' | 'online' | 'loadout' | 'leaderboard' | 'settings'
    this._ownedKnives= new Set(['knife_default']);
    this._ownedSkins = new Set(['skin_default']);
    this._equippedKnife = 'knife_default';
    this._equippedSkin  = 'skin_default';
    this._selectedMap   = null;
    this._scores        = {};    // mapId → [{ rank, name, time_ms }]
  }

  async show() {
    this._visible = true;
    if (this._input) this._input.menuOpen = true;
    document.exitPointerLock?.();
    await this._loadUnlocks();
    this._build();
    this._el.style.display = 'flex';
    this._renderTab();
  }

  hide() {
    this._visible = false;
    if (this._input) this._input.menuOpen = false;
    if (this._el) this._el.style.display = 'none';
  }

  // ── Build DOM ──────────────────────────────────────────────────────────────

  _build() {
    if (this._el) return;
    const el = document.createElement('div');
    el.id = 'main-menu';
    el.style.cssText = `
      display:none; position:fixed; inset:0; background:rgba(0,0,0,0.97);
      flex-direction:column; align-items:center; justify-content:flex-start;
      font-family:monospace; color:#fff; z-index:10000; overflow:hidden;
    `;
    document.body.appendChild(el);
    this._el = el;
  }

  _renderTab() {
    if (!this._el) return;
    const player = ds.player;
    const name   = player?.name ?? 'Player';
    const color  = player?.color ?? '#00cfff';

    this._el.innerHTML = `
      <div style="width:100%;max-width:900px;padding:24px 20px">
        <!-- Header -->
        <div style="text-align:center;margin-bottom:24px">
          <div style="font-size:36px;font-weight:bold;color:#00cfff;letter-spacing:4px">SURFGAME</div>
          <div style="color:#444;font-size:12px;margin-top:4px">
            Playing as <span style="color:${color}">${_esc(name)}</span>
          </div>
        </div>

        <!-- Tabs -->
        <div style="display:flex;gap:4px;margin-bottom:20px;justify-content:center">
          ${['play','online','loadout','leaderboard','settings'].map(t => `
            <button onclick="window._menuTab('${t}')" style="
              padding:8px 20px; border:1px solid ${this._tab===t?'#00cfff':'#333'};
              background:${this._tab===t?'rgba(0,207,255,0.12)':'transparent'};
              color:${this._tab===t?'#00cfff':'#666'}; cursor:pointer;
              font-family:monospace; font-size:13px; border-radius:4px;
            ">${t.toUpperCase()}</button>
          `).join('')}
        </div>

        <!-- Tab content -->
        <div id="menu-content">
          ${this._tab === 'play'        ? this._renderPlay()        : ''}
          ${this._tab === 'online'      ? this._renderOnline()      : ''}
          ${this._tab === 'loadout'     ? this._renderLoadout()     : ''}
          ${this._tab === 'leaderboard' ? this._renderLeaderboard() : ''}
          ${this._tab === 'settings'    ? this._renderSettings()    : ''}
        </div>
      </div>
    `;

    // Wire tab switcher
    window._menuTab = (tab) => { this._tab = tab; this._renderTab(); };
    // Wire online join
    window._menuJoinOnline = () => { if (this.onJoinOnline) this.onJoinOnline(); };
    // Wire play button
    window._menuPlayMap = (mapId) => {
      this._onPlayMap(mapId);
      this.hide();
    };
    // Wire equip
    window._menuEquipKnife = (id) => this._equipKnife(id);
    window._menuEquipSkin  = (id) => this._equipSkin(id);
    // Wire settings save
    window._menuSaveName  = async () => {
      const inp = document.getElementById('menu-name-inp');
      if (!inp) return;
      await ds.updateProfile({ name: inp.value.trim() });
      this._renderTab();
    };
    window._menuSaveColor = async () => {
      const inp = document.getElementById('menu-color-inp');
      if (!inp) return;
      await ds.updateProfile({ color: inp.value });
      this._renderTab();
    };
  }

  // ── Tab: Online lobby ─────────────────────────────────────────────────────

  _renderOnline() {
    const s = this._net?.lobbyState ?? null;
    const secLeft = s ? Math.max(0, Math.ceil((s.nextRotateAt - Date.now()) / 1000)) : 600;
    const min = String(Math.floor(secLeft / 60)).padStart(2,'0');
    const sec = String(secLeft % 60).padStart(2,'0');
    const players = s?.playerCount ?? '...';
    const mapName = (s?.mapId ?? '...').replace(/_/g,' ').toUpperCase();
    const votes = s?.skipVotes ?? 0;
    const needed = s?.skipNeeded ?? 1;

    return `
      <div style="max-width:500px;margin:0 auto;text-align:center;padding:20px 0">
        <div style="font-size:11px;letter-spacing:4px;color:#555;margin-bottom:24px">ONLINE LOBBY</div>

        <div style="border:1px solid #1a1a2a;border-radius:8px;padding:24px;margin-bottom:20px">
          <div style="color:#555;font-size:10px;letter-spacing:2px;margin-bottom:8px">CURRENT MAP</div>
          <div style="font-size:20px;font-weight:bold;color:#00cfff;margin-bottom:4px">${_esc(mapName)}</div>
          <div style="color:#444;font-size:11px">next rotation in <b style="color:#888">${min}:${sec}</b></div>
        </div>

        <div style="display:flex;gap:12px;justify-content:center;margin-bottom:20px">
          <div style="border:1px solid #111;border-radius:6px;padding:12px 20px;min-width:100px">
            <div style="font-size:22px;font-weight:bold;color:#fff">${players}</div>
            <div style="font-size:10px;color:#444;margin-top:2px">PLAYERS ONLINE</div>
          </div>
          <div style="border:1px solid #111;border-radius:6px;padding:12px 20px;min-width:100px">
            <div style="font-size:22px;font-weight:bold;color:#fff">${votes}/${needed}</div>
            <div style="font-size:10px;color:#444;margin-top:2px">SKIP VOTES</div>
          </div>
        </div>

        <button onclick="window._menuJoinOnline()" style="
          width:100%;padding:16px 0;background:rgba(0,207,255,0.12);
          border:1px solid #00cfff;color:#00cfff;cursor:pointer;
          font-family:monospace;font-size:16px;letter-spacing:2px;border-radius:6px;
          margin-bottom:12px;
        ">&#9654;  JOIN LOBBY</button>

        <div style="color:#333;font-size:10px;letter-spacing:1px">
          Joins the shared server — map rotates every 10 minutes<br>
          Maps chosen at random &middot; Procedural maps possible
        </div>
      </div>
    `;
  }

  // ── Tab: Play (map select) ─────────────────────────────────────────────────

  _renderPlay() {
    const sections = [
      { label: '⬤ Beginner',     diff: DIFFICULTY.BEGINNER     },
      { label: '⬤ Intermediate', diff: DIFFICULTY.INTERMEDIATE },
      { label: '⬤ Advanced',     diff: DIFFICULTY.ADVANCED     },
      { label: '⬤ Expert',       diff: DIFFICULTY.EXPERT       },
    ];
    const diffColors = { beginner:'#22c55e', intermediate:'#3b82f6', advanced:'#f97316', expert:'#ef4444' };

    return sections.map(({ label, diff }) => `
      <div style="margin-bottom:18px">
        <div style="color:${diffColors[diff]};font-size:13px;font-weight:bold;margin-bottom:8px">
          ${label}
        </div>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:8px">
          ${(MAPS_BY_DIFF[diff] || []).map(m => `
            <div onclick="window._menuPlayMap('${m.id}')" style="
              padding:10px 12px; border:1px solid #222; border-radius:6px;
              background:rgba(255,255,255,0.03); cursor:pointer;
              transition:border-color 0.2s;
            " onmouseover="this.style.borderColor='#444'" onmouseout="this.style.borderColor='#222'">
              <div style="font-size:14px;font-weight:bold">${_esc(m.name)}</div>
              <div style="font-size:10px;color:#555;margin-top:3px">${_esc(m.desc)}</div>
              <div style="font-size:10px;color:#333;margin-top:4px">🗡 ${_esc(KNIFE_BY_ID[m.knifeId]?.name ?? '?')}</div>
            </div>
          `).join('')}
        </div>
      </div>
    `).join('');
  }

  // ── Tab: Loadout ───────────────────────────────────────────────────────────

  _renderLoadout() {
    const knifeRows = KNIFE_DEFS.map(k => {
      const owned    = this._ownedKnives.has(k.id);
      const equipped = this._equippedKnife === k.id;
      return `
        <div onclick="${owned ? `window._menuEquipKnife('${k.id}')` : ''}" style="
          display:flex;align-items:center;gap:10px;padding:8px 12px;
          border:1px solid ${equipped?'#ffd700':owned?'#333':'#111'};
          border-radius:6px;cursor:${owned?'pointer':'default'};
          background:${equipped?'rgba(255,215,0,0.08)':'transparent'};
          opacity:${owned?1:0.3};
        ">
          <div style="width:14px;height:14px;border-radius:50%;background:#${k.color.toString(16).padStart(6,'0')}"></div>
          <div>
            <div style="font-size:13px;color:${equipped?'#ffd700':'#ccc'}">${_esc(k.name)}</div>
            <div style="font-size:10px;color:#555">${_esc(k.desc)}</div>
          </div>
          ${equipped ? '<span style="margin-left:auto;color:#ffd700;font-size:11px">EQUIPPED</span>' : ''}
          ${!owned   ? '<span style="margin-left:auto;color:#333;font-size:11px">LOCKED</span>' : ''}
        </div>
      `;
    }).join('');

    return `
      <div style="font-size:13px;color:#666;margin-bottom:12px">
        ${this._ownedKnives.size}/${KNIFE_DEFS.length} knives unlocked
      </div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:6px;max-height:60vh;overflow-y:auto">
        ${knifeRows}
      </div>
    `;
  }

  // ── Tab: Leaderboard ──────────────────────────────────────────────────────

  _renderLeaderboard() {
    const cached = Object.entries(this._scores);
    if (!cached.length) {
      // Trigger async load
      this._loadScores();
      return '<div style="color:#444;text-align:center;padding:40px">Loading scores...</div>';
    }

    return cached.slice(0, 4).map(([mapId, scores]) => `
      <div style="margin-bottom:16px">
        <div style="color:#00cfff;font-size:12px;margin-bottom:6px">${_esc(mapId.replace('_', ' ').toUpperCase())}</div>
        <div style="border:1px solid #1a1a1a;border-radius:6px;overflow:hidden">
          ${scores.slice(0, 5).map((s, i) => `
            <div style="display:flex;gap:12px;padding:6px 12px;background:${i%2?'rgba(255,255,255,0.02)':'transparent'}">
              <span style="color:${i===0?'#ffd700':i===1?'#aaa':i===2?'#cd7f32':'#555'};min-width:16px">#${s.rank}</span>
              <span style="flex:1;color:#ccc">${_esc(s.name)}</span>
              <span style="color:#888">${_fmtTime(s.time_ms)}</span>
            </div>
          `).join('')}
        </div>
      </div>
    `).join('');
  }

  // ── Tab: Settings ─────────────────────────────────────────────────────────

  _renderSettings() {
    const p = ds.player;
    return `
      <div style="max-width:400px;margin:0 auto">
        <div style="margin-bottom:16px">
          <label style="display:block;color:#888;font-size:11px;margin-bottom:6px">PLAYER NAME</label>
          <div style="display:flex;gap:8px">
            <input id="menu-name-inp" value="${_esc(p?.name??'')}" maxlength="24" style="
              flex:1;background:#111;border:1px solid #333;color:#fff;
              padding:8px;font-family:monospace;font-size:13px;border-radius:4px;
            ">
            <button onclick="window._menuSaveName()" style="
              padding:8px 14px;background:#0a3a5a;border:1px solid #00cfff;
              color:#00cfff;cursor:pointer;font-family:monospace;border-radius:4px;
            ">Save</button>
          </div>
        </div>
        <div style="margin-bottom:16px">
          <label style="display:block;color:#888;font-size:11px;margin-bottom:6px">PLAYER COLOR</label>
          <div style="display:flex;gap:8px;align-items:center">
            <input id="menu-color-inp" type="color" value="${p?.color??'#00cfff'}" style="width:50px;height:36px;border:none;background:transparent">
            <button onclick="window._menuSaveColor()" style="
              padding:8px 14px;background:#0a3a5a;border:1px solid #00cfff;
              color:#00cfff;cursor:pointer;font-family:monospace;border-radius:4px;
            ">Save</button>
          </div>
        </div>
        <div style="margin-top:24px;padding:12px;border:1px solid #111;border-radius:6px;color:#333;font-size:11px">
          Mouse sensitivity, FOV, volume — available in the in-game settings panel (press Escape).
        </div>
      </div>
    `;
  }

  // ── Data loading ───────────────────────────────────────────────────────────

  async _loadUnlocks() {
    if (!ds.isReady) return;
    try {
      const [unlocks, profile] = await Promise.all([ds.getUnlocks(), ds.getProfile()]);
      unlocks.filter(u => u.item_type === 'knife').forEach(u => this._ownedKnives.add(u.item_id));
      unlocks.filter(u => u.item_type === 'skin' ).forEach(u => this._ownedSkins.add(u.item_id));
      if (profile?.knife) this._equippedKnife = profile.knife;
      if (profile?.skin)  this._equippedSkin  = profile.skin;
    } catch {}
  }

  async _loadScores() {
    const mapIds = MAP_CATALOG.slice(0, 4).map(m => m.id);
    try {
      const results = await Promise.all(mapIds.map(id => ds.getScores(id)));
      mapIds.forEach((id, i) => { this._scores[id] = results[i].scores; });
      this._renderTab();
    } catch {}
  }

  _equipKnife(id) {
    this._equippedKnife = id;
    ds.updateProfile({ knife: id }).catch(() => {});
    this._renderTab();
  }

  _equipSkin(id) {
    this._equippedSkin = id;
    ds.updateProfile({ skin: id }).catch(() => {});
    this._renderTab();
  }
}

function _esc(str) { return String(str ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
function _fmtTime(ms) {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const rem = s % 60;
  const mss = ms % 1000;
  return `${String(m).padStart(2,'0')}:${String(rem).padStart(2,'0')}.${String(mss).padStart(3,'0')}`;
}
