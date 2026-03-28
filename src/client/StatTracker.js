/**
 * StatTracker — Tracks session + all-time statistics
 * Stats: kills, deaths, distance, top speed, surf time, maps, XP earned
 * Shows in Pause Menu "Stats" tab and post-match summary
 */

const LS_KEY = 'surfgame_stats';

export class StatTracker {
  constructor() {
    // Session stats (reset each play session)
    this.session = {
      kills:         0,
      deaths:        0,
      mapsCompleted: 0,
      topSpeed:      0,
      distanceSurfed:0,  // world units
      totalXP:       0,
      startTime:     Date.now(),
      bestRunSec:    null,
      checkpoints:   0,
      shotsHit:      0,
      shotsFired:    0,
    };

    // Persistent all-time stats
    this.allTime = this._load();
  }

  // ── Event hooks ────────────────────────────────────────────────────────────

  onKill()              { this.session.kills++;          this.allTime.kills++;           this._save(); }
  onDeath()             { this.session.deaths++;         this.allTime.deaths++;          this._save(); }
  onMapFinish(timeSec)  { this.session.mapsCompleted++;  this.allTime.mapsCompleted++;   this._save();
                          if (!this.session.bestRunSec || timeSec < this.session.bestRunSec) this.session.bestRunSec = timeSec; }
  onShot()              { this.session.shotsFired++;     this.allTime.shotsFired++;      }
  onHit()               { this.session.shotsHit++;       this.allTime.shotsHit++;        }
  onXPEarned(amount)    { this.session.totalXP += amount; this.allTime.totalXP += amount; this._save(); }
  onCheckpoint()        { this.session.checkpoints++; }

  tickSpeed(hSpeed, dt) {
    if (hSpeed > this.session.topSpeed) this.session.topSpeed = hSpeed;
    if (hSpeed > this.allTime.topSpeed) { this.allTime.topSpeed = hSpeed; this._save(); }
    if (hSpeed > 100) {
      const dist = hSpeed * dt;
      this.session.distanceSurfed += dist;
      this.allTime.distanceSurfed += dist;
    }
  }

  // ── Computed stats ─────────────────────────────────────────────────────────

  get sessionKD()    { return this.session.deaths > 0 ? (this.session.kills / this.session.deaths).toFixed(2) : this.session.kills.toFixed(1); }
  get allTimeKD()    { return this.allTime.deaths > 0  ? (this.allTime.kills  / this.allTime.deaths).toFixed(2)  : this.allTime.kills.toFixed(1); }
  get sessionAccuracy() {
    if (!this.session.shotsFired) return '—';
    return `${Math.round((this.session.shotsHit / this.session.shotsFired) * 100)}%`;
  }
  get sessionTimePlayed() {
    const sec = Math.floor((Date.now() - this.session.startTime) / 1000);
    const m   = Math.floor(sec / 60);
    const s   = sec % 60;
    return `${m}m ${s}s`;
  }
  get sessionDistanceKm() { return (this.session.distanceSurfed / 50000).toFixed(2); }
  get allTimeDistanceKm() { return (this.allTime.distanceSurfed  / 50000).toFixed(2); }

  // ── Render HTML for pause menu ─────────────────────────────────────────────

  renderHTML() {
    const s = this.session;
    const a = this.allTime;

    const row = (label, sessVal, allVal) => `
      <tr>
        <td style="color:#555;font-size:11px;padding:5px 0;min-width:140px">${label}</td>
        <td style="color:#ccc;font-size:12px;text-align:right;padding-right:20px">${sessVal}</td>
        <td style="color:#666;font-size:12px;text-align:right">${allVal}</td>
      </tr>
    `;

    return `
      <div style="font-size:9px;letter-spacing:3px;color:#444;margin-bottom:14px">STATISTICS</div>
      <table style="width:100%;border-collapse:collapse">
        <thead>
          <tr>
            <th style="color:#333;font-size:9px;font-weight:normal;text-align:left;padding-bottom:8px"></th>
            <th style="color:#00cfff88;font-size:9px;font-weight:normal;text-align:right;padding-right:20px;padding-bottom:8px">SESSION</th>
            <th style="color:#55555588;font-size:9px;font-weight:normal;text-align:right;padding-bottom:8px">ALL TIME</th>
          </tr>
        </thead>
        <tbody>
          ${row('Kills',         s.kills,              a.kills)}
          ${row('Deaths',        s.deaths,             a.deaths)}
          ${row('K/D Ratio',     this.sessionKD,       this.allTimeKD)}
          ${row('Maps Finished', s.mapsCompleted,      a.mapsCompleted)}
          ${row('Top Speed',     `${s.topSpeed|0} u/s`, `${a.topSpeed|0} u/s`)}
          ${row('Distance',      `${this.sessionDistanceKm} km`, `${this.allTimeDistanceKm} km`)}
          ${row('XP Earned',     `+${s.totalXP}`,      `+${a.totalXP}`)}
          ${row('Accuracy',      this.sessionAccuracy, '—')}
          ${row('Time Played',   this.sessionTimePlayed, _fmtTotalTime(a.secondsPlayed))}
          ${s.bestRunSec ? row('Best Run', _fmtTime(s.bestRunSec), _fmtTime(a.bestRunSec)) : ''}
        </tbody>
      </table>
    `;
  }

  // ── Mini live stat bar (in-game HUD) ──────────────────────────────────────

  renderMiniHUD() {
    const s = this.session;
    return [
      { label: 'K/D',  value: this.sessionKD },
      { label: 'MAPS', value: s.mapsCompleted },
      { label: 'TOP',  value: `${s.topSpeed|0}` },
      { label: 'XP',   value: `+${s.totalXP}` },
    ];
  }

  // ── Persistence ───────────────────────────────────────────────────────────

  tickTimePlayed(dt) {
    this.allTime.secondsPlayed = (this.allTime.secondsPlayed ?? 0) + dt;
  }

  _load() {
    try {
      return {
        kills: 0, deaths: 0, mapsCompleted: 0, topSpeed: 0,
        distanceSurfed: 0, totalXP: 0, secondsPlayed: 0,
        bestRunSec: null, shotsFired: 0, shotsHit: 0,
        ...JSON.parse(localStorage.getItem(LS_KEY) || '{}')
      };
    } catch {
      return { kills:0, deaths:0, mapsCompleted:0, topSpeed:0,
               distanceSurfed:0, totalXP:0, secondsPlayed:0,
               bestRunSec:null, shotsFired:0, shotsHit:0 };
    }
  }

  _save() {
    try { localStorage.setItem(LS_KEY, JSON.stringify(this.allTime)); } catch {}
  }
}

function _fmtTime(sec) {
  if (!sec) return '—';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  const ms = Math.round((sec % 1) * 1000);
  return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}.${String(ms).padStart(3,'0')}`;
}

function _fmtTotalTime(seconds) {
  if (!seconds) return '0m';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}
