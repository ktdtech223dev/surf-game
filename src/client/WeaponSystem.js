/**
 * WeaponSystem — hitscan pistol
 *
 * - 30 rounds, semi-auto, 200 ms between shots
 * - Auto-reload (1.5 s) when empty or R pressed
 * - Hit marker: brief cyan flash on crosshair
 * - Network: calls net.sendShoot() with ray info
 */

const MAX_AMMO      = 30;
const FIRE_INTERVAL = 200;  // ms between shots
const RELOAD_TIME   = 1500; // ms
const HIT_MARKER_MS = 250;

export class WeaponSystem {
  constructor(net) {
    this.net    = net;
    this.ammo   = MAX_AMMO;
    this.maxAmmo = MAX_AMMO;

    this._reloading    = false;
    this._reloadEnd    = 0;
    this._lastFireTime = 0;
    this._hitMarker    = false;
    this._hitMarkerEnd = 0;

    this._hitMarkEl = null;
    this._ammoEl    = null;
    this._reloadEl  = null;
    this._initHUD();
  }

  // ── HUD setup ─────────────────────────────────────────────────────────────

  _initHUD() {
    this._hitMarkEl = document.getElementById('hit-marker');
    this._ammoEl    = document.getElementById('ammo-display');
    this._reloadEl  = document.getElementById('reload-indicator');
  }

  // ── API ───────────────────────────────────────────────────────────────────

  /** Call when the player pulls trigger (once per frame edge). */
  tryFire(camera, playerPosition, playerYaw, playerPitch) {
    const now = performance.now();

    if (this._reloading) return false;
    if (now - this._lastFireTime < FIRE_INTERVAL) return false;
    if (this.ammo <= 0) {
      this.reload();
      return false;
    }

    this._lastFireTime = now;
    this.ammo--;

    // Build ray from player eye position
    const eyeX = playerPosition.x;
    const eyeY = playerPosition.y + 60; // eye height
    const eyeZ = playerPosition.z;

    // Ray direction from yaw/pitch (same as camera look direction)
    const cosP = Math.cos(playerPitch);
    const dx = -Math.sin(playerYaw) * cosP;
    const dy =  Math.sin(playerPitch);
    const dz =  Math.cos(playerYaw) * cosP;

    this.net.sendShoot(eyeX, eyeY, eyeZ, dx, dy, dz);

    if (this.ammo === 0) {
      this.reload();
    }

    this._updateHUD();
    return true;
  }

  /** Called by NetworkClient.onHitConfirm */
  onHitConfirm() {
    this._hitMarker    = true;
    this._hitMarkerEnd = performance.now() + HIT_MARKER_MS;
  }

  reload() {
    if (this._reloading || this.ammo === this.maxAmmo) return;
    this._reloading = true;
    this._reloadEnd = performance.now() + RELOAD_TIME;
    setTimeout(() => {
      this._reloading = false;
      this.ammo = this.maxAmmo;
      this._updateHUD();
    }, RELOAD_TIME);
    this._updateHUD();
  }

  /** Call each frame to update animated elements (hit marker, reload indicator) */
  tick() {
    const now = performance.now();

    // Hit marker
    if (this._hitMarker && now > this._hitMarkerEnd) {
      this._hitMarker = false;
    }
    if (this._hitMarkEl) {
      this._hitMarkEl.style.opacity = this._hitMarker ? '1' : '0';
    }

    // Reload progress bar
    if (this._reloadEl) {
      if (this._reloading) {
        const frac = Math.min(1, (now - (this._reloadEnd - RELOAD_TIME)) / RELOAD_TIME);
        this._reloadEl.style.display = 'block';
        const bar = document.getElementById('reload-progress');
        if (bar) bar.style.width = `${Math.round(frac * 100)}%`;
      } else {
        this._reloadEl.style.display = 'none';
      }
    }
  }

  _updateHUD() {
    if (!this._ammoEl) return;
    const col = this.ammo === 0 ? '#f44' : this.ammo <= 6 ? '#fa0' : '#0cf';
    this._ammoEl.innerHTML = this._reloading
      ? `<span style="color:#fa0">RELOADING…</span>`
      : `<span style="color:${col};font-weight:bold">${this.ammo}</span>`
        + `<span style="color:#334"> / ${this.maxAmmo}</span>`;
  }

  /** Current reload fraction 0–1 (0 = not reloading) */
  get reloadFraction() {
    if (!this._reloading) return 0;
    return Math.min(1, (performance.now() - (this._reloadEnd - RELOAD_TIME)) / RELOAD_TIME);
  }
}
