/**
 * KillStreakSystem — Kill streak detection + dramatic announcer
 * Streaks: Double → Triple → Quad → Rampage → Unstoppable → Godlike → BEYOND GODLIKE
 * Also handles: First Blood, Comeback, Domination, Ace
 */

const STREAK_WINDOW_MS = 10_000; // 10 seconds between kills to continue streak

const STREAK_NAMES = [
  null,               // 0
  null,               // 1 - normal kill
  { name: 'DOUBLE KILL',       color: '#22c55e', scale: 1.1, xpBonus: 15, sound: 0 },
  { name: 'TRIPLE KILL',       color: '#3b82f6', scale: 1.2, xpBonus: 25, sound: 1 },
  { name: 'QUAD KILL',         color: '#a855f7', scale: 1.3, xpBonus: 40, sound: 2 },
  { name: 'RAMPAGE',           color: '#f97316', scale: 1.5, xpBonus: 60, sound: 3 },
  { name: 'UNSTOPPABLE',       color: '#ef4444', scale: 1.7, xpBonus: 90, sound: 4 },
  { name: 'GODLIKE',           color: '#ffd700', scale: 2.0, xpBonus: 130, sound: 5 },
];

const BEYOND_GODLIKE = { name: 'BEYOND GODLIKE', color: '#ff00ff', scale: 2.4, xpBonus: 200, sound: 6 };

export class KillStreakSystem {
  /**
   * @param {function} onAnnouncement  — (text, color, xpBonus) callback
   * @param {function} onXPBonus       — (amount, source) callback
   * @param {SoundManager} sound
   */
  constructor(onAnnouncement, onXPBonus, sound = null) {
    this._announce  = onAnnouncement;
    this._onXP      = onXPBonus;
    this._sound     = sound;

    this._kills        = [];   // timestamps of kills in current streak
    this._streakCount  = 0;
    this._totalKills   = 0;
    this._firstBlood   = false;
    this._dominated    = false;
    this._el           = null;
    this._queue        = [];   // queued announcements
    this._showing      = false;

    this._buildEl();
  }

  // ── Kill event ─────────────────────────────────────────────────────────────

  onKill() {
    const now = Date.now();
    this._totalKills++;

    // Prune old kills from window
    this._kills = this._kills.filter(t => now - t < STREAK_WINDOW_MS);
    this._kills.push(now);
    this._streakCount = this._kills.length;

    // First blood
    if (!this._firstBlood && this._totalKills === 1) {
      this._firstBlood = true;
      this._queueAnnouncement('FIRST BLOOD', '#ff4444', 20);
      this._onXP?.(20, 'kill_streak');
    }

    // Streak announcement
    if (this._streakCount >= 2) {
      const def = this._streakCount >= STREAK_NAMES.length
        ? BEYOND_GODLIKE
        : STREAK_NAMES[this._streakCount];
      if (def) {
        this._queueAnnouncement(def.name, def.color, def.xpBonus, def.scale ?? 1);
        this._onXP?.(def.xpBonus, 'kill_streak');
        this._playStreakSound(def.sound);
      }
    }

    // Domination
    if (this._totalKills >= 10 && !this._dominated) {
      this._dominated = true;
      this._queueAnnouncement('DOMINATION', '#ffd700', 100);
    }
  }

  // ── Death reset ────────────────────────────────────────────────────────────

  onDeath() {
    const prevStreak = this._streakCount;
    this._kills = [];
    this._streakCount = 0;

    // Comeback announcement when enemy had a big streak
    if (prevStreak >= 4) {
      this._queueAnnouncement('REVENGE', '#ff8800', 30);
    }
  }

  // ── Speed-based announcements ─────────────────────────────────────────────

  onSpeedMilestone(speed) {
    if (speed >= 1200 && !this._announced1200) {
      this._announced1200 = true;
      this._queueAnnouncement('MACH 1', '#00cfff', 0);
      setTimeout(() => { this._announced1200 = false; }, 60000);
    }
  }

  onPersonalBest(timeSec, mapName) {
    this._queueAnnouncement('PERSONAL BEST!', '#ffd700', 0, 1.3);
  }

  // ── Internal ───────────────────────────────────────────────────────────────

  _queueAnnouncement(text, color, xpBonus = 0, scale = 1.0) {
    this._queue.push({ text, color, xpBonus, scale });
    if (!this._showing) this._showNext();
    if (this._announce) this._announce(text, color, xpBonus);
  }

  _showNext() {
    if (!this._queue.length) { this._showing = false; return; }
    this._showing = true;
    const { text, color, scale } = this._queue.shift();
    this._display(text, color, scale);
    setTimeout(() => this._showNext(), 900);
  }

  _display(text, color, scale = 1.0) {
    if (!this._el) return;
    this._el.style.transition = 'none';
    this._el.style.opacity    = '0';
    this._el.style.transform  = `translateX(-50%) scale(${scale * 0.6})`;
    this._el.textContent      = text;
    this._el.style.color      = color;
    this._el.style.textShadow = `0 0 20px ${color}88, 0 2px 8px rgba(0,0,0,0.9)`;

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        this._el.style.transition = 'opacity 0.12s ease, transform 0.18s cubic-bezier(0.34,1.56,0.64,1)';
        this._el.style.opacity    = '1';
        this._el.style.transform  = `translateX(-50%) scale(${scale})`;
        setTimeout(() => {
          this._el.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
          this._el.style.opacity    = '0';
          this._el.style.transform  = `translateX(-50%) scale(${scale * 1.1})`;
        }, 650);
      });
    });
  }

  _buildEl() {
    const el = document.createElement('div');
    el.id = 'streak-announcer';
    el.style.cssText = `
      position:fixed; top:22%; left:50%; transform:translateX(-50%);
      font-family:monospace; font-weight:900; font-size:28px;
      letter-spacing:4px; pointer-events:none; z-index:7500;
      opacity:0; will-change:transform,opacity;
    `;
    document.body.appendChild(el);
    this._el = el;
  }

  _playStreakSound(level) {
    if (!this._sound) return;
    // Reuse existing sounds, escalate pitch manually
    this._sound.playKill();
    if (level >= 2) setTimeout(() => this._sound.playKill(), 120);
    if (level >= 3) setTimeout(() => this._sound.playKill(), 240);
  }
}
