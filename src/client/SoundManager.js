/**
 * SoundManager — Phase 4
 * Procedural Web Audio API sounds. No external files required.
 *
 * All sounds are synthesized in-browser:
 *  - Shoot: filtered noise burst
 *  - Hit confirm: sharp metallic tick
 *  - Kill: ascending two-tone ding
 *  - Reload: mechanical click
 *  - Empty: dry dry click
 *  - Hurt: low impact thud
 *  - Chat: soft ping
 *  - Wind loop: continuous filtered noise, volume+pitch scale with speed
 *  - Footstep: soft ground thump
 */

export class SoundManager {
  constructor() {
    this._ctx      = null;
    this._master   = null;  // master GainNode
    this._wind     = null;  // { src, gain, filter } for continuous loop
    this._windSpeed = 0;
    this.volume    = 0.7;
    this._ready    = false;
  }

  /** Must be called from a user gesture (click). Safe to call multiple times. */
  init() {
    if (this._ready) return;
    try {
      this._ctx    = new (window.AudioContext || window.webkitAudioContext)();
      this._master = this._ctx.createGain();
      this._master.gain.value = this.volume;
      this._master.connect(this._ctx.destination);
      this._startWind();
      this._ready = true;
    } catch { /* audio not supported */ }
  }

  setVolume(v) {
    this.volume = Math.max(0, Math.min(1, v));
    if (this._master) this._master.gain.value = this.volume;
  }

  // ── Wind loop ──────────────────────────────────────────────────────────────

  _startWind() {
    const ctx = this._ctx;
    const bufSize = ctx.sampleRate * 2; // 2 seconds of noise
    const buf  = ctx.createBuffer(1, bufSize, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;

    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.loop   = true;

    const filter = ctx.createBiquadFilter();
    filter.type            = 'bandpass';
    filter.frequency.value = 400;
    filter.Q.value         = 0.8;

    const gain = ctx.createGain();
    gain.gain.value = 0;

    src.connect(filter);
    filter.connect(gain);
    gain.connect(this._master);
    src.start();

    this._wind = { src, gain, filter };
  }

  /**
   * Call every frame with horizontal speed in u/s.
   * Wind audible above 200 u/s, max at 1200 u/s.
   */
  setWindSpeed(speed) {
    if (!this._wind) return;
    const t   = Math.max(0, Math.min(1, (speed - 200) / 1000));
    const vol = t * t * 0.28;
    const hz  = 300 + t * 900; // 300–1200 Hz band center
    const now = this._ctx.currentTime;
    this._wind.gain.gain.linearRampToValueAtTime(vol, now + 0.12);
    this._wind.filter.frequency.linearRampToValueAtTime(hz, now + 0.12);
  }

  // ── One-shot sounds ────────────────────────────────────────────────────────

  playShoot() {
    if (!this._ready) return;
    const ctx = this._ctx;
    const now = ctx.currentTime;

    // Body: noise burst
    const buf  = ctx.createBuffer(1, ctx.sampleRate * 0.08, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      const env = Math.exp(-i / (data.length * 0.15));
      data[i] = (Math.random() * 2 - 1) * env;
    }
    const src = ctx.createBufferSource();
    src.buffer = buf;

    const filter = ctx.createBiquadFilter();
    filter.type            = 'highpass';
    filter.frequency.value = 800;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.6, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(this._master);
    src.start(now);

    // Click transient
    const osc = ctx.createOscillator();
    osc.type            = 'sawtooth';
    osc.frequency.setValueAtTime(200, now);
    osc.frequency.exponentialRampToValueAtTime(40, now + 0.04);

    const g2 = ctx.createGain();
    g2.gain.setValueAtTime(0.3, now);
    g2.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

    osc.connect(g2);
    g2.connect(this._master);
    osc.start(now);
    osc.stop(now + 0.04);
  }

  playHit() {
    // Metallic tick — confirms you hit someone
    if (!this._ready) return;
    const ctx = this._ctx;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    osc.type            = 'square';
    osc.frequency.value = 1800;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

    osc.connect(gain);
    gain.connect(this._master);
    osc.start(now);
    osc.stop(now + 0.06);
  }

  playKill() {
    // Ascending two-tone ding
    if (!this._ready) return;
    const ctx  = this._ctx;
    const now  = ctx.currentTime;
    const freqs = [880, 1320];

    freqs.forEach((f, i) => {
      const t   = now + i * 0.12;
      const osc = ctx.createOscillator();
      osc.type            = 'sine';
      osc.frequency.value = f;

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.5, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);

      osc.connect(gain);
      gain.connect(this._master);
      osc.start(t);
      osc.stop(t + 0.35);
    });
  }

  playReload() {
    if (!this._ready) return;
    const ctx = this._ctx;
    const now = ctx.currentTime;

    // Two mechanical clicks (start + seat)
    [0, 0.12].forEach(delay => {
      const osc = ctx.createOscillator();
      osc.type            = 'sawtooth';
      osc.frequency.value = 120;

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.25, now + delay);
      gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.05);

      osc.connect(gain);
      gain.connect(this._master);
      osc.start(now + delay);
      osc.stop(now + delay + 0.05);
    });
  }

  playEmpty() {
    // Dry click — no ammo
    if (!this._ready) return;
    const ctx = this._ctx;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    osc.type            = 'square';
    osc.frequency.value = 80;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);

    osc.connect(gain);
    gain.connect(this._master);
    osc.start(now);
    osc.stop(now + 0.03);
  }

  playHurt() {
    // Low-frequency thud when local player takes damage
    if (!this._ready) return;
    const ctx = this._ctx;
    const now = ctx.currentTime;

    const buf  = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.15), ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      const env = Math.exp(-i / (data.length * 0.3));
      data[i] = (Math.random() * 2 - 1) * env;
    }

    const src = ctx.createBufferSource();
    src.buffer = buf;

    const filter = ctx.createBiquadFilter();
    filter.type            = 'lowpass';
    filter.frequency.value = 200;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.7, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(this._master);
    src.start(now);
  }

  playChat() {
    // Soft ping for incoming chat
    if (!this._ready) return;
    const ctx = this._ctx;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    osc.type            = 'sine';
    osc.frequency.value = 660;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

    osc.connect(gain);
    gain.connect(this._master);
    osc.start(now);
    osc.stop(now + 0.3);
  }

  playFootstep() {
    if (!this._ready) return;
    const ctx = this._ctx;
    const now = ctx.currentTime;

    const buf  = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.05), ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (data.length * 0.2));
    }

    const src = ctx.createBufferSource();
    src.buffer = buf;

    const filter = ctx.createBiquadFilter();
    filter.type            = 'lowpass';
    filter.frequency.value = 400;

    const gain = ctx.createGain();
    gain.gain.value = 0.12;

    src.connect(filter);
    filter.connect(gain);
    gain.connect(this._master);
    src.start(now);
  }

  playLand() {
    // Louder thump on landing from air
    if (!this._ready) return;
    const ctx = this._ctx;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(120, now);
    osc.frequency.exponentialRampToValueAtTime(40, now + 0.1);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

    osc.connect(gain);
    gain.connect(this._master);
    osc.start(now);
    osc.stop(now + 0.12);
  }
}
