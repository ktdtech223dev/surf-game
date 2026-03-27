// Input handler with pointer lock support

export class InputManager {
  constructor() {
    this.keys = {};
    this.yaw = 0;
    this.pitch = 0;
    this.sensitivity = 0.002;
    this.locked = false;

    this._onKeyDown = this._onKeyDown.bind(this);
    this._onKeyUp = this._onKeyUp.bind(this);
    this._onMouseMove = this._onMouseMove.bind(this);
    this._onClick = this._onClick.bind(this);
    this._onPointerLockChange = this._onPointerLockChange.bind(this);

    document.addEventListener('keydown', this._onKeyDown);
    document.addEventListener('keyup', this._onKeyUp);
    document.addEventListener('mousemove', this._onMouseMove);
    document.addEventListener('click', this._onClick);
    document.addEventListener('pointerlockchange', this._onPointerLockChange);
  }

  _onKeyDown(e) {
    this.keys[e.code] = true;
    e.preventDefault();
  }

  _onKeyUp(e) {
    this.keys[e.code] = false;
  }

  _onMouseMove(e) {
    if (!this.locked) return;
    this.yaw -= e.movementX * this.sensitivity;
    this.pitch -= e.movementY * this.sensitivity;
    // Clamp pitch to avoid flipping
    this.pitch = Math.max(-Math.PI / 2 + 0.01, Math.min(Math.PI / 2 - 0.01, this.pitch));
  }

  _onClick() {
    if (!this.locked) {
      document.body.requestPointerLock();
    }
  }

  _onPointerLockChange() {
    this.locked = document.pointerLockElement === document.body;
    const instructions = document.getElementById('instructions');
    if (instructions) {
      instructions.classList.toggle('hidden', this.locked);
    }
  }

  /**
   * Sample current input state for a physics tick
   */
  sample() {
    let forward = 0;
    let right = 0;

    if (this.keys['KeyW'] || this.keys['ArrowUp']) forward += 1;
    if (this.keys['KeyS'] || this.keys['ArrowDown']) forward -= 1;
    if (this.keys['KeyD'] || this.keys['ArrowRight']) right += 1;
    if (this.keys['KeyA'] || this.keys['ArrowLeft']) right -= 1;

    return {
      forward,
      right,
      jump: !!(this.keys['Space']),
      yaw: this.yaw,
      pitch: this.pitch,
      tick: 0,
    };
  }

  destroy() {
    document.removeEventListener('keydown', this._onKeyDown);
    document.removeEventListener('keyup', this._onKeyUp);
    document.removeEventListener('mousemove', this._onMouseMove);
    document.removeEventListener('click', this._onClick);
    document.removeEventListener('pointerlockchange', this._onPointerLockChange);
  }
}
