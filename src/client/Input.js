// Input handler — pointer lock, WASD, mouse look, shoot, chat, scoreboard

export class InputManager {
  constructor() {
    this.keys        = {};
    this.yaw         = 0;
    this.pitch       = 0;
    this.sensitivity = 0.002;
    this.locked      = false;

    // Combat
    this.shootPressed  = false; // true for one frame when LMB fires
    this._lmbDown      = false;

    // UI toggles
    this.scoreboardOpen = false;
    this.chatOpen       = false;

    this._bind();
  }

  _bind() {
    document.addEventListener('keydown',          e => this._onKeyDown(e));
    document.addEventListener('keyup',            e => this._onKeyUp(e));
    document.addEventListener('mousemove',        e => this._onMouseMove(e));
    document.addEventListener('mousedown',        e => this._onMouseDown(e));
    document.addEventListener('mouseup',          e => this._onMouseUp(e));
    document.addEventListener('click',            e => this._onClick(e));
    document.addEventListener('pointerlockchange', () => this._onPointerLockChange());
  }

  _onKeyDown(e) {
    this.keys[e.code] = true;

    // Tab: scoreboard
    if (e.code === 'Tab') {
      e.preventDefault();
      this.scoreboardOpen = true;
    }

    // Enter: chat
    if (e.code === 'Enter' && !this.chatOpen) {
      this.chatOpen = true;
      e.preventDefault();
    }

    if (this.chatOpen) return; // swallow keys while chat is open
    e.preventDefault();
  }

  _onKeyUp(e) {
    this.keys[e.code] = false;
    if (e.code === 'Tab') this.scoreboardOpen = false;
  }

  _onMouseMove(e) {
    if (!this.locked || this.chatOpen) return;
    this.yaw   -= e.movementX * this.sensitivity;
    this.pitch -= e.movementY * this.sensitivity;
    this.pitch  = Math.max(-Math.PI / 2 + 0.01, Math.min(Math.PI / 2 - 0.01, this.pitch));
  }

  _onMouseDown(e) {
    if (!this.locked || this.chatOpen) return;
    if (e.button === 0) this._lmbDown = true;
  }

  _onMouseUp(e) {
    if (e.button === 0) this._lmbDown = false;
  }

  _onClick() {
    if (!this.locked) document.body.requestPointerLock();
  }

  _onPointerLockChange() {
    this.locked = document.pointerLockElement === document.body;
    const el = document.getElementById('instructions');
    if (el) el.classList.toggle('hidden', this.locked);
  }

  /**
   * Sample current input for one physics tick.
   * shootPressed is true only on the first sample where LMB is down.
   */
  sample() {
    const forward = (this.keys['KeyW'] || this.keys['ArrowUp']    ? 1 : 0)
                  - (this.keys['KeyS'] || this.keys['ArrowDown']  ? 1 : 0);
    const right   = (this.keys['KeyD'] || this.keys['ArrowRight'] ? 1 : 0)
                  - (this.keys['KeyA'] || this.keys['ArrowLeft']  ? 1 : 0);

    // Edge-detect LMB so auto-fire needs the weapon system to re-arm
    const shoot = this._lmbDown && !this._prevLmb;
    this._prevLmb = this._lmbDown;

    return {
      forward,
      right,
      jump:  !!(this.keys['Space']),
      shoot,
      yaw:   this.yaw,
      pitch: this.pitch,
      tick:  0,
    };
  }

  /** Auto-fire: returns true every call while LMB is held (weapon controls rate) */
  isFireHeld() { return this._lmbDown; }

  destroy() {
    // cleanup omitted for brevity
  }
}
