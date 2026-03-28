/**
 * ChallengeSystem.js — Daily & weekly challenge display + completion tracking
 */
import { ds } from './DataService.js';

export class ChallengeSystem {
  constructor() {
    this._daily  = null;
    this._weekly = null;
    this._dailyDone  = false;
    this._weeklyDone = false;
    this._el         = null;
  }

  async load() {
    if (!ds.isReady) return;
    try {
      const [d, w] = await Promise.all([
        ds.getDailyChallenge(),
        ds.getWeeklyChallenge(),
      ]);
      this._daily       = d.challenge;
      this._dailyDone   = d.completed;
      this._weekly      = w.challenge;
      this._weeklyDone  = w.completed;
      this._render();
    } catch (e) {
      console.warn('[ChallengeSystem] Load failed:', e.message);
    }
  }

  // ── Progress trackers (called from game events) ────────────────────────────

  /** Returns { daily: bool, weekly: bool } — true if just completed */
  async checkSpeed(speed) {
    const results = { daily: false, weekly: false };
    if (this._daily && !this._dailyDone && this._daily.type === 'speed' && speed >= this._daily.val) {
      results.daily = await this._complete('daily');
    }
    if (this._weekly && !this._weeklyDone && this._weekly.type === 'speed' && speed >= this._weekly.val) {
      results.weekly = await this._complete('weekly');
    }
    return results;
  }

  async checkMapFinish(mapId, timeSec) {
    const results = { daily: false, weekly: false };
    const timeS = Math.round(timeSec);

    if (this._daily && !this._dailyDone) {
      const c = this._daily;
      if ((c.type === 'map' && c.map_id === mapId) ||
          (c.type === 'time' && c.map_id === mapId && timeS <= c.val)) {
        results.daily = await this._complete('daily');
      }
    }
    if (this._weekly && !this._weeklyDone) {
      const c = this._weekly;
      if ((c.type === 'map' && c.map_id === mapId) ||
          (c.type === 'time' && c.map_id === mapId && timeS <= c.val)) {
        results.weekly = await this._complete('weekly');
      }
    }
    return results;
  }

  async checkKills(totalKills) {
    const results = { daily: false, weekly: false };
    if (this._daily && !this._dailyDone && this._daily.type === 'kills' && totalKills >= this._daily.val) {
      results.daily = await this._complete('daily');
    }
    if (this._weekly && !this._weeklyDone && this._weekly.type === 'kills' && totalKills >= this._weekly.val) {
      results.weekly = await this._complete('weekly');
    }
    return results;
  }

  // ── Complete a challenge ───────────────────────────────────────────────────

  async _complete(which) {
    const ch = which === 'daily' ? this._daily : this._weekly;
    if (!ch) return false;
    try {
      const res = await ds.completeChallenge(ch.id);
      if (res?.completed) {
        if (which === 'daily')  this._dailyDone  = true;
        if (which === 'weekly') this._weeklyDone = true;
        this._render();
        this._showCompletedBanner(which, ch.label);
        return true;
      }
    } catch {}
    return false;
  }

  // ── UI ─────────────────────────────────────────────────────────────────────

  _render() {
    const el = this._getEl();
    const _row = (label, ch, done) => {
      if (!ch) return '';
      const color = done ? '#555' : '#ffd700';
      const check = done ? '<span style="color:#0f0">✓</span>' : '<span style="color:#555">○</span>';
      return `
        <div style="margin-bottom:4px">
          <span style="color:#666;font-size:10px">${label}</span>
          ${check} <span style="color:${color};font-size:11px">${ch.label}</span>
        </div>`;
    };
    el.innerHTML =
      _row('DAILY',  this._daily,  this._dailyDone) +
      _row('WEEKLY', this._weekly, this._weeklyDone);
  }

  _getEl() {
    if (this._el) return this._el;
    const el = document.createElement('div');
    el.id = 'challenge-hud';
    el.style.cssText = `
      position:fixed; top:12px; left:50%; transform:translateX(-50%);
      background:rgba(0,0,0,0.55); border:1px solid #333; border-radius:6px;
      padding:6px 12px; font-family:monospace; pointer-events:none; z-index:200;
      text-align:center; min-width:220px;
    `;
    document.body.appendChild(el);
    this._el = el;
    return el;
  }

  _showCompletedBanner(which, label) {
    const el = document.createElement('div');
    el.style.cssText = `
      position:fixed; top:50%; left:50%; transform:translate(-50%,-50%);
      background:rgba(0,0,0,0.92); border:2px solid #ffd700; border-radius:12px;
      padding:20px 32px; text-align:center; font-family:monospace; z-index:9999;
      animation: fadeOut 0.4s 3s forwards;
    `;
    el.innerHTML = `
      <div style="font-size:28px">🏆</div>
      <div style="color:#ffd700;font-size:18px;font-weight:bold;margin:8px 0">
        ${which === 'daily' ? 'Daily' : 'Weekly'} Complete!
      </div>
      <div style="color:#aaa;font-size:12px">${label}</div>
    `;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 3500);
  }

  get dailyChallenge()  { return this._daily; }
  get weeklyChallenge() { return this._weekly; }
  get dailyDone()       { return this._dailyDone; }
  get weeklyDone()      { return this._weeklyDone; }
}
