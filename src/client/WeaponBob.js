/**
 * WeaponBob — Speed & movement reactive weapon camera bob
 * Applies subtle positional and rotational offsets to the camera
 * based on horizontal speed, air state, and mouse movement.
 *
 * Usage:
 *   const bob = new WeaponBob();
 *   // each frame:
 *   bob.tick(dt, hSpeed, onGround, mouseDx, mouseDy);
 *   const { x, y, z, rx, ry } = bob.offset;
 *   camera.position.x += x; camera.position.y += y; camera.position.z += z;
 *   camera.rotation.x += rx; camera.rotation.y += ry;
 */

export class WeaponBob {
  constructor() {
    // Bob phase accumulators
    this._phase   = 0;   // walk cycle phase
    this._airTime = 0;   // seconds in air (for landing squish)

    // Smoothed values
    this._bobAmt  = 0;   // smoothed bob intensity 0-1
    this._swayX   = 0;   // smoothed horizontal sway
    this._swayY   = 0;   // smoothed vertical sway
    this._rollVal = 0;   // smoothed roll

    // Mouse lag sway (inertia)
    this._lagX    = 0;
    this._lagY    = 0;

    // Landing squish
    this._squish  = 0;

    // Output
    this.offset = { x: 0, y: 0, z: 0, rx: 0, ry: 0, rz: 0 };
  }

  /**
   * @param {number}  dt        delta time in seconds
   * @param {number}  hSpeed    horizontal speed in u/s
   * @param {boolean} onGround  whether player is on ground/ramp
   * @param {number}  mouseDx   raw mouse delta x this frame (pixels)
   * @param {number}  mouseDy   raw mouse delta y this frame (pixels)
   */
  tick(dt, hSpeed, onGround, mouseDx = 0, mouseDy = 0) {
    // ── Bob intensity (speed-driven) ─────────────────────────────────────────
    const speedT   = Math.max(0, Math.min(1, (hSpeed - 100) / 700));
    const targetBob = onGround ? speedT * 0.85 : 0;
    this._bobAmt  += (targetBob - this._bobAmt)  * Math.min(1, dt * 6);

    // Advance walk phase (faster at higher speeds)
    const bobFreq  = 2.8 + speedT * 3.0;
    this._phase   += dt * bobFreq * (this._bobAmt > 0.05 ? 1 : 0);

    const bobX = Math.sin(this._phase)             * this._bobAmt * 0.018;
    const bobY = Math.sin(this._phase * 2) * 0.5   * this._bobAmt * 0.012;

    // ── Mouse lag / inertia sway ──────────────────────────────────────────────
    const lagDecay = Math.min(1, dt * 10);
    this._lagX += -mouseDx * 0.00015;
    this._lagY += -mouseDy * 0.00015;
    this._lagX *= (1 - lagDecay);
    this._lagY *= (1 - lagDecay);
    const clampLag = 0.025;
    const lagX = Math.max(-clampLag, Math.min(clampLag, this._lagX));
    const lagY = Math.max(-clampLag, Math.min(clampLag, this._lagY));

    // ── Air sway (gentle drift when airborne) ────────────────────────────────
    if (!onGround) {
      this._airTime += dt;
    } else {
      if (this._airTime > 0.3) this._squish = 0.025; // landing squish
      this._airTime = 0;
    }
    this._squish += (0 - this._squish) * Math.min(1, dt * 18);

    // ── Speed roll (lean into turns) ─────────────────────────────────────────
    const rollTarget = -mouseDx * 0.000025 * Math.min(1, hSpeed / 400);
    this._rollVal += (rollTarget - this._rollVal) * Math.min(1, dt * 8);

    // ── Combine ──────────────────────────────────────────────────────────────
    this.offset.x  = bobX  + lagX  * 1.2;
    this.offset.y  = bobY  + lagY  * 0.8 - this._squish;
    this.offset.z  = 0;
    this.offset.rx = lagY  * 0.5;
    this.offset.ry = lagX  * 0.3;
    this.offset.rz = this._rollVal + bobX * 0.4;
  }
}
