/**
 * AchievementSystem.js — Client-side achievement tracking + popup
 * Checks conditions, calls DataService to unlock, shows slide-in popup
 */
import { ds } from './DataService.js';

const POPUP_DURATION = 4000; // ms

export class AchievementSystem {
  constructor() {
    this._unlocked  = new Set();   // keys already unlocked this session
    this._queue     = [];          // pending popups
    this._showing   = false;
    this._el        = null;        // DOM popup element
    this._loaded    = false;

    this._sessionKills = 0;
    this._mapsCompleted = new Set();
  }

  async load() {
    if (!ds.isReady) return;
    try {
      const list = await ds.getAchievements();
      list.filter(a => a.unlocked).forEach(a => this._unlocked.add(a.key));
      this._loaded = true;
    } catch (e) {
      console.warn('[Achievements] Load failed:', e.message);
    }
  }

  // ── Event triggers ─────────────────────────────────────────────────────────

  onSpeed(speed) {
    if (speed >= 1200) this._try('speed_1200');
    else if (speed >= 800) this._try('speed_800');
    else if (speed >= 500) this._try('speed_500');
  }

  onMapFinish(mapId, timeSec) {
    this._mapsCompleted.add(mapId);
    this._try('first_finish');
    if (timeSec < 30)  this._try('sub_30');
    if (timeSec < 60)  this._try('sub_60');
    // Check difficulty completion
    this._checkDifficultyCompletion();
  }

  onKill() {
    this._sessionKills++;
    this._try('first_kill');
    if (this._sessionKills >= 10) this._try('kills_10');
  }

  onDailyComplete() { this._try('daily_done'); }
  onWeeklyComplete() { this._try('weekly_done'); }

  onKnifeUnlock(knifesOwned) {
    if (knifesOwned >= 5)  this._try('knife_5');
    if (knifesOwned >= 16) this._try('knife_16');
    if (knifesOwned >= 32) this._try('knife_all');
  }

  onGhostBeaten() { this._try('ghost_top'); }

  // ── Internal ───────────────────────────────────────────────────────────────

  async _try(key) {
    if (this._unlocked.has(key)) return;
    this._unlocked.add(key);
    try {
      const res = await ds.unlockAchievement(key);
      if (res?.unlocked) this._showPopup(key);
    } catch {}
  }

  _checkDifficultyCompletion() {
    const { MAP_CATALOG, DIFFICULTY, MAPS_BY_DIFF } = window._mapCatalog ?? {};
    if (!MAP_CATALOG) return;
    for (const [diff, maps] of Object.entries(MAPS_BY_DIFF)) {
      const allDone = maps.every(m => this._mapsCompleted.has(m.id));
      if (allDone) {
        const key = { beginner: 'beginner_all', intermediate: 'inter_all', advanced: 'advanced_all', expert: 'expert_all' }[diff];
        if (key) this._try(key);
      }
    }
  }

  _showPopup(key) {
    this._queue.push(key);
    if (!this._showing) this._nextPopup();
  }

  async _nextPopup() {
    if (!this._queue.length) { this._showing = false; return; }
    this._showing = true;
    const key = this._queue.shift();
    const el  = this._getEl();

    // Achievement name from server defs (embedded as inline data)
    const NAMES = {
      speed_500: ['⚡ Subsonic', 'Reached 500 u/s!'],
      speed_800: ['🚀 Supersonic', 'Reached 800 u/s!'],
      speed_1200:['🌠 Hypersonic', 'Reached 1200 u/s!'],
      first_finish:['🏁 First Run', 'Completed your first map!'],
      sub_60:    ['⏱ Sub-60', 'Under 60 seconds!'],
      sub_30:    ['🕐 Sub-30', 'Under 30 seconds!'],
      first_kill:['🔫 First Blood', 'Got your first kill!'],
      kills_10:  ['🎯 Sharpshooter', '10 kills in a session!'],
      beginner_all:['🌱 Beginner\'s Luck', 'All beginner maps done!'],
      inter_all: ['🌿 Intermediate', 'All intermediate maps done!'],
      advanced_all:['🌲 Advanced', 'All advanced maps done!'],
      expert_all:['🌳 Expert', 'All expert maps done!'],
      ghost_top: ['👻 Ghost Buster', 'Beat the world record ghost!'],
      daily_done:['📅 Daily Grind', 'Daily challenge complete!'],
      weekly_done:['📆 Weekender', 'Weekly challenge complete!'],
      knife_5:   ['🗡 Collector', '5 knives unlocked!'],
      knife_16:  ['⚔ Arsenal', '16 knives unlocked!'],
      knife_all: ['🏆 Cutlery Set', 'All 32 knives unlocked!'],
    };

    const [title, desc] = NAMES[key] ?? [`🏅 ${key}`, 'Achievement unlocked!'];
    el.innerHTML = `
      <div style="font-size:11px;color:#888;text-transform:uppercase;letter-spacing:1px">Achievement Unlocked</div>
      <div style="font-size:15px;font-weight:bold;color:#ffd700;margin-top:3px">${title}</div>
      <div style="font-size:11px;color:#aaa;margin-top:2px">${desc}</div>
    `;

    el.style.transform = 'translateX(0)';
    el.style.opacity   = '1';

    await _sleep(POPUP_DURATION);

    el.style.transform = 'translateX(120%)';
    el.style.opacity   = '0';

    await _sleep(400);
    this._nextPopup();
  }

  _getEl() {
    if (this._el) return this._el;
    const el = document.createElement('div');
    el.id = 'achievement-popup';
    el.style.cssText = `
      position:fixed; bottom:80px; right:16px; width:260px; padding:12px 16px;
      background:rgba(0,0,0,0.88); border:1px solid #ffd700; border-radius:8px;
      color:#fff; font-family:monospace; pointer-events:none; z-index:999;
      transition: transform 0.35s cubic-bezier(0.4,0,0.2,1), opacity 0.35s;
      transform: translateX(120%); opacity:0;
    `;
    document.body.appendChild(el);
    this._el = el;
    return el;
  }
}

function _sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
