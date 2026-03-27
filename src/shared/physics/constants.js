// Source engine-inspired physics constants
// Tuned to match CS 1.6 / CS:S surf feel

export const TICK_RATE = 128;
export const TICK_INTERVAL = 1 / TICK_RATE;

export const GRAVITY = 800;           // units/s^2 (Source uses 800)
export const MAX_SPEED = 320;         // ground max speed (units/s)
export const AIR_SPEED_CAP = 30;      // wishspeed cap in air (critical for strafing)
export const GROUND_ACCELERATE = 10;  // ground accel factor
export const AIR_ACCELERATE = 150;    // air accel factor (high for surf)
export const FRICTION = 4;            // ground friction
export const STOP_SPEED = 100;        // minimum speed for friction calc
export const JUMP_FORCE = 301.993377; // Source jump velocity
export const PLAYER_HEIGHT = 72;      // units
export const PLAYER_RADIUS = 16;      // collision radius
export const STEP_HEIGHT = 18;        // max step-up height
export const MAX_VELOCITY = 3500;     // hard velocity cap (safety)

// Surf-specific
export const SURF_RAMP_MIN_ANGLE = 0.7; // min surface normal Y to count as ground (cos ~45°)
