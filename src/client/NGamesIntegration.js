/**
 * NGamesIntegration.js — CuunSurf × N Games Network
 *
 * Wraps window.NGame (loaded from /ngames.js) in safe fire-and-forget calls.
 * All methods are no-ops if the SDK isn't present.
 *
 * Usage:
 *   import { ngames } from './NGamesIntegration.js';
 *   ngames.init('keshawn');
 *   ngames.ping({ screen: 'in_menu' });
 */

const GAME_ID      = 'cuunsurf';
const GAME_VERSION = '1.0.0';
const WALL_SCORE_THRESHOLD = 50_000; // post to wall if score beats this

// Crew profiles — matches N Games server exactly
export const CREW_PROFILES = [
  { id: 'keshawn', name: 'Keshawn', color: '#80e060' },
  { id: 'sean',    name: 'Sean',    color: '#f0c040' },
  { id: 'dart',    name: 'Dart',    color: '#e04040' },
  { id: 'amari',   name: 'Amari',   color: '#40c0e0' },
];

export const PROFILE_BY_ID = Object.fromEntries(CREW_PROFILES.map(p => [p.id, p]));

// Achievement ID map — cuunsurf_ prefix required by N Games server
const ACHIEVEMENT_MAP = {
  speed_500:    'cuunsurf_speed_500',
  speed_800:    'cuunsurf_speed_800',
  speed_1200:   'cuunsurf_speed_1200',
  first_finish: 'cuunsurf_first_run',
  sub_60:       'cuunsurf_sub_60',
  sub_30:       'cuunsurf_sub_30',
  first_kill:   'cuunsurf_first_kill',
  kills_10:     'cuunsurf_kills_10',
  beginner_all: 'cuunsurf_beginner_all',
  inter_all:    'cuunsurf_inter_all',
  advanced_all: 'cuunsurf_advanced_all',
  expert_all:   'cuunsurf_expert_all',
  ghost_top:    'cuunsurf_ghost_buster',
  daily_done:   'cuunsurf_daily_grind',
  weekly_done:  'cuunsurf_weekender',
  knife_5:      'cuunsurf_knife_collector',
  knife_16:     'cuunsurf_knife_arsenal',
  knife_all:    'cuunsurf_knife_all',
};

class NGamesIntegration {
  constructor() {
    this._profileId   = null;
    this._pingInterval= null;
    this._currentState= null;
  }

  // ── Getters ────────────────────────────────────────────────────────────────

  get sdk()       { return typeof NGame !== 'undefined' ? NGame : null; }
  get profileId() { return this._profileId; }
  get profile()   { return PROFILE_BY_ID[this._profileId] ?? null; }

  // ── Init ──────────────────────────────────────────────────────────────────

  /** Call once when the player picks their profile. */
  init(profileId) {
    this._profileId = profileId;
    if (!this.sdk) { console.warn('[NGames] ngames.js not loaded — running offline'); return; }
    try {
      this.sdk.init({ game_id: GAME_ID, profile_id: profileId });
    } catch (e) {
      console.warn('[NGames] init failed:', e.message);
    }
  }

  // ── Presence ──────────────────────────────────────────────────────────────

  /** Immediate presence ping + updates stored state for 45s auto-pings. */
  ping(state) {
    this._currentState = state;
    if (!this.sdk) return;
    try { this.sdk.ping(state); } catch {}
  }

  /** Start 45-second auto-ping timer. Call after init(). */
  startPingLoop() {
    if (this._pingInterval) clearInterval(this._pingInterval);
    this._pingInterval = setInterval(() => {
      try { this.sdk?.ping(this._currentState); } catch {}
    }, 45_000);
  }

  // ── Session submit ────────────────────────────────────────────────────────

  /**
   * Submit a completed run.
   * @param {object} opts
   * @param {number} opts.timeSec      - run time in seconds
   * @param {string} opts.mapId        - map id string
   * @param {string} opts.mapName      - display name
   * @param {string} opts.difficulty   - 'beginner'|'intermediate'|'advanced'|'expert'
   * @param {boolean} opts.isPB        - personal best?
   * @param {number} opts.speed        - top speed reached
   * @param {string} opts.mode         - 'solo'|'online'
   */
  submitRun({ timeSec, mapId, mapName, difficulty, isPB, speed, mode }) {
    if (!this.sdk || !this._profileId) return;
    // Score = inverse of time (faster = higher) * difficulty multiplier
    const diffMult = { beginner: 1, intermediate: 1.5, advanced: 2, expert: 3 }[difficulty] ?? 1;
    const score    = Math.round((10_000 / Math.max(timeSec, 1)) * diffMult * 100);

    try {
      this.sdk.submitSession({
        score,
        outcome:      'win',
        game_mode:    'surf',
        game_version: GAME_VERSION,
        data: {
          map_id:     mapId,
          map_name:   mapName,
          time_sec:   parseFloat(timeSec.toFixed(3)),
          difficulty,
          is_pb:      isPB,
          top_speed:  speed,
          mode,
        },
      });
    } catch {}

    // Wall post for personal bests and exceptional runs
    if (isPB || score >= WALL_SCORE_THRESHOLD) {
      const fmt = t => {
        const m  = Math.floor(t / 60);
        const s  = Math.floor(t % 60);
        const ms = Math.round((t % 1) * 1000);
        return `${m ? m + 'm ' : ''}${String(s).padStart(2,'0')}.${String(ms).padStart(3,'0')}s`;
      };
      const pbTag = isPB ? ' 🏆 PB' : '';
      try {
        this.sdk.postToWall(
          `🏄 ${this.profile?.name ?? 'Player'} ran ${mapName} in ${fmt(timeSec)}${pbTag} on CuunSurf`
        );
      } catch {}
    }
  }

  // ── Achievements ──────────────────────────────────────────────────────────

  /**
   * Mirror an in-game achievement key to N Games.
   * @param {string} gameKey - local key e.g. 'first_finish'
   */
  unlockAchievement(gameKey) {
    if (!this.sdk || !this._profileId) return;
    const ngId = ACHIEVEMENT_MAP[gameKey];
    if (!ngId) return;
    try { this.sdk.unlockAchievement(ngId); } catch {}
  }

  /**
   * Update numeric progress toward an achievement.
   * @param {string} gameKey
   * @param {number} value
   */
  updateProgress(gameKey, value) {
    if (!this.sdk || !this._profileId) return;
    const ngId = ACHIEVEMENT_MAP[gameKey];
    if (!ngId) return;
    try { this.sdk.updateProgress(ngId, value); } catch {}
  }
}

export const ngames = new NGamesIntegration();
