// Source Engine-style movement physics
// This is the AUTHORITATIVE movement code shared by client and server.

import * as Vec3 from './vec3.js';
import {
  GRAVITY, MAX_SPEED, AIR_SPEED_CAP, GROUND_ACCELERATE,
  AIR_ACCELERATE, FRICTION, STOP_SPEED, JUMP_FORCE,
  MAX_VELOCITY, SURF_RAMP_MIN_ANGLE, TICK_INTERVAL,
} from './constants.js';

const JUMP_BUFFER_TIME = 0.1; // 100ms jump buffer
const GROUND_PROBE_DIST = 4;  // units to probe downward for ground

export function createPlayerState() {
  return {
    position: Vec3.create(0, 50, 0),
    velocity: Vec3.create(0, 0, 0),
    onGround: false,
    onRamp: false,
    surfaceNormal: null,
    jumpQueued: false,
    jumpQueueTime: -1,
    time: 0,

    // Respawn destination — overridden by map spawn
    respawnPosition: Vec3.create(0, 50, 0),

    // Debug / stats
    strafeEfficiency: 0,
    speedHistory: [],
    tickTimes: [],
  };
}

export function createInput() {
  return {
    forward: 0,
    right: 0,
    jump: false,
    yaw: 0,
    pitch: 0,
    tick: 0,
  };
}

/**
 * Main movement tick - call at TICK_RATE Hz
 */
export function simulateTick(state, input, world, dt = TICK_INTERVAL) {
  const tickStart = performance.now();

  state.time += dt;

  // 1. Build wish direction
  const wishdir = getWishDir(input);
  const wishspeed = Vec3.length(wishdir) > 0.001 ? MAX_SPEED : 0;
  const normalizedWish = Vec3.length(wishdir) > 0.001 ? Vec3.normalize(wishdir) : Vec3.create();

  // 2. Jump buffering (100ms window)
  if (input.jump) {
    state.jumpQueued = true;
    state.jumpQueueTime = state.time;
  }
  // Expire stale jump buffer
  if (state.jumpQueued && (state.time - state.jumpQueueTime) > JUMP_BUFFER_TIME) {
    state.jumpQueued = false;
  }

  if (state.jumpQueued && state.onGround) {
    state.velocity.y = JUMP_FORCE;
    state.onGround = false;
    state.onRamp = false;
    state.surfaceNormal = null;
    state.jumpQueued = false;
  }

  // 3. Movement
  if (state.onGround) {
    groundMove(state, normalizedWish, wishspeed, dt);
  } else {
    airMove(state, normalizedWish, wishspeed, dt);
  }

  // 4. Gravity (only when not on solid ground)
  if (!state.onGround) {
    state.velocity.y -= GRAVITY * dt;
  }

  // 5. Clamp velocity
  state.velocity = Vec3.clampLength(state.velocity, MAX_VELOCITY);

  // 6. Move + collide
  moveAndCollide(state, world, dt);

  // 7. Strafe efficiency (Source-accurate)
  if (!state.onGround && Vec3.length(normalizedWish) > 0.001) {
    state.strafeEfficiency = calcStrafeEfficiency(state.velocity, normalizedWish);
  } else {
    state.strafeEfficiency = 0;
  }

  // 8. Debug recording
  const hSpeed = Vec3.lengthXZ(state.velocity);
  state.speedHistory.push(hSpeed);
  if (state.speedHistory.length > 300) state.speedHistory.shift();

  const tickEnd = performance.now();
  state.tickTimes.push(tickEnd - tickStart);
  if (state.tickTimes.length > 128) state.tickTimes.shift();
}

function getWishDir(input) {
  const sy = Math.sin(input.yaw);
  const cy = Math.cos(input.yaw);

  // Forward and right vectors (horizontal plane only)
  const fx = -sy, fz = -cy;
  const rx =  cy, rz = -sy;

  return Vec3.create(
    fx * input.forward + rx * input.right,
    0,
    fz * input.forward + rz * input.right,
  );
}

function groundMove(state, wishdir, wishspeed, dt) {
  applyFriction(state, dt);
  accelerate(state, wishdir, wishspeed, GROUND_ACCELERATE, dt);
}

function airMove(state, wishdir, wishspeed, dt) {
  // Cap wishspeed for air accel - critical for strafing math
  const cappedWishspeed = Math.min(wishspeed, AIR_SPEED_CAP);
  accelerate(state, wishdir, cappedWishspeed, AIR_ACCELERATE, dt);
}

function accelerate(state, wishdir, wishspeed, accel, dt) {
  if (wishspeed <= 0) return;

  const currentSpeed = Vec3.dot(state.velocity, wishdir);
  const addSpeed = wishspeed - currentSpeed;

  if (addSpeed <= 0) return;

  let accelSpeed = accel * wishspeed * dt;
  if (accelSpeed > addSpeed) accelSpeed = addSpeed;

  state.velocity.x += wishdir.x * accelSpeed;
  state.velocity.y += wishdir.y * accelSpeed;
  state.velocity.z += wishdir.z * accelSpeed;
}

function applyFriction(state, dt) {
  // Source friction only acts on horizontal velocity
  const hSpeed = Vec3.lengthXZ(state.velocity);
  if (hSpeed < 0.1) {
    state.velocity.x = 0;
    state.velocity.z = 0;
    return;
  }

  const control = Math.max(hSpeed, STOP_SPEED);
  const drop = control * FRICTION * dt;
  let newSpeed = Math.max(hSpeed - drop, 0) / hSpeed;

  state.velocity.x *= newSpeed;
  state.velocity.z *= newSpeed;
  // Y velocity is unaffected by friction
}

/**
 * Source-accurate strafe efficiency.
 * Optimal angle = acos(cappedWishspeed / speed) when speed > cappedWishspeed.
 * Efficiency = how close the player is to that optimal angle.
 */
function calcStrafeEfficiency(velocity, wishdir) {
  const speed = Vec3.lengthXZ(velocity);
  if (speed < 10) return 0;

  const velDirXZ = Vec3.normalizeXZ(velocity);
  const wishDirXZ = Vec3.normalizeXZ(wishdir);
  const cosAngle = Math.max(-1, Math.min(1,
    velDirXZ.x * wishDirXZ.x + velDirXZ.z * wishDirXZ.z
  ));
  const angle = Math.acos(cosAngle);

  // Optimal angle for max speed gain: acos(AIR_SPEED_CAP / speed)
  // Below AIR_SPEED_CAP, any angle adds speed; above it, need specific angle
  let optimalAngle;
  if (speed <= AIR_SPEED_CAP) {
    optimalAngle = 0; // Any forward-ish direction is fine
  } else {
    optimalAngle = Math.acos(Math.min(1, AIR_SPEED_CAP / speed));
  }

  const delta = Math.abs(angle - optimalAngle);
  // Half-radian tolerance window for "good" strafing
  return Math.max(0, 1 - delta / (Math.PI / 8));
}

function handleSurfaceCollision(state, normal) {
  if (normal.y >= SURF_RAMP_MIN_ANGLE) {
    // Ground
    state.onGround = true;
    state.onRamp = false;
    state.surfaceNormal = normal;
    state.velocity.y = 0;
  } else if (normal.y > -0.1) {
    // Surf ramp (angled surface with upward-ish normal)
    state.onGround = false;
    state.onRamp = true;
    state.surfaceNormal = normal;

    // Clip velocity to ramp plane - the core surf mechanic
    const backoff = Vec3.dot(state.velocity, normal);
    if (backoff < 0) {
      state.velocity.x -= normal.x * backoff;
      state.velocity.y -= normal.y * backoff;
      state.velocity.z -= normal.z * backoff;
    }
  } else {
    // Wall or ceiling
    state.onRamp = false;
    const backoff = Vec3.dot(state.velocity, normal);
    if (backoff < 0) {
      state.velocity.x -= normal.x * backoff;
      state.velocity.y -= normal.y * backoff;
      state.velocity.z -= normal.z * backoff;
    }
  }
}

function moveAndCollide(state, world, dt) {
  const newPos = Vec3.add(state.position, Vec3.scale(state.velocity, dt));
  const collision = world.traceMove(state.position, newPos, state.velocity);

  if (collision.killed) {
    state.position = Vec3.copy(state.respawnPosition);
    state.velocity = Vec3.create(0, 0, 0);
    state.onGround = false;
    state.onRamp = false;
    state.surfaceNormal = null;
    return;
  }

  if (collision.hit) {
    state.position = collision.position;
    handleSurfaceCollision(state, collision.normal);
  } else {
    state.position = newPos;

    // Ground probe: small downward sweep to detect ground/ramp contact
    const probeEnd = Vec3.add(state.position, Vec3.create(0, -GROUND_PROBE_DIST, 0));
    const groundCheck = world.traceMove(state.position, probeEnd, Vec3.create(0, -1, 0));

    if (groundCheck.hit && !groundCheck.killed) {
      const n = groundCheck.normal;
      if (n.y >= SURF_RAMP_MIN_ANGLE) {
        // On flat ground
        state.onGround = true;
        state.onRamp = false;
        state.surfaceNormal = n;
        state.velocity.y = Math.max(state.velocity.y, 0);
      } else if (n.y > -0.1) {
        // On ramp slope
        state.onRamp = true;
        state.onGround = false;
        state.surfaceNormal = n;
      } else {
        state.onGround = false;
        state.onRamp = false;
        state.surfaceNormal = null;
      }
    } else {
      state.onGround = false;
      state.onRamp = false;
      state.surfaceNormal = null;
    }
  }

  // World bounds safety net (kill zones catch first, this is a fallback for Section 3)
  if (state.position.y < -2000) {
    state.position = Vec3.copy(state.respawnPosition);
    state.velocity = Vec3.create(0, 0, 0);
    state.onGround = false;
    state.onRamp = false;
    state.surfaceNormal = null;
  }
}
