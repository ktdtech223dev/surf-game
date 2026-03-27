// SurfGame — main entry point
// Fixed 128 Hz physics, variable-rate rendering, WebSocket multiplayer

import { Renderer }      from './Renderer.js';
import { InputManager }  from './Input.js';
import { DebugOverlay }  from './DebugOverlay.js';
import { NetworkClient } from './NetworkClient.js';
import { GhostRenderer } from './GhostRenderer.js';
import { buildTestMap, getSpawnPosition } from './MapBuilder.js';
import { createPlayerState, simulateTick } from '../shared/physics/MovementEngine.js';
import { TICK_RATE, TICK_INTERVAL } from '../shared/physics/constants.js';
import * as Vec3 from '../shared/physics/vec3.js';

// ── Init ───────────────────────────────────────────────────────────────────────
const renderer = new Renderer();
const input    = new InputManager();
const debug    = new DebugOverlay();
const net      = new NetworkClient();

const playerState = createPlayerState();

// Spawn on the left ledge, facing the ramp (+Z = yaw PI)
const spawn = getSpawnPosition();
playerState.position.x = spawn.x;
playerState.position.y = spawn.y;
playerState.position.z = spawn.z;
playerState.respawnPosition.x = spawn.x;
playerState.respawnPosition.y = spawn.y;
playerState.respawnPosition.z = spawn.z;
input.yaw = Math.PI;

// Build map
const collisionWorld = buildTestMap(renderer);

// Ghost renderer for multiplayer peers
const ghosts = new GhostRenderer(renderer.scene);

// Multiplayer hooks
net.onPeerUpdate = (id, snap) => ghosts.update(id, snap);
net.onPeerLeave  = (id)       => ghosts.remove(id);
net.connect(); // graceful no-op in dev mode without a WS server

// Dev console handle
window.__surf = { playerState, input, collisionWorld, net };

// ── Run timer ─────────────────────────────────────────────────────────────────
// Timer starts when the player exits the spawn platform (Z > 350)
// Timer stops when the player reaches the final platform (Z > 3750 && Y < -700)
const TIMER_START_Z  = 360;
const TIMER_FINISH_Z = 3750;
const TIMER_FINISH_Y = -700;

let runStartTime = null;  // performance.now() timestamp
let runActive    = false;
let currentRunSec = null; // seconds elapsed (null = not running)
let bestRunSec   = null;

function _updateRunTimer() {
  const pos = playerState.position;

  if (!runActive && pos.z > TIMER_START_Z && pos.y > -600) {
    // Left spawn platform — start the clock
    runActive    = true;
    runStartTime = performance.now();
    currentRunSec = 0;
  }

  if (runActive) {
    currentRunSec = (performance.now() - runStartTime) / 1000;

    // Finished?
    if (pos.z > TIMER_FINISH_Z && pos.y < TIMER_FINISH_Y) {
      const t = currentRunSec;
      if (bestRunSec === null || t < bestRunSec) bestRunSec = t;
      // Reset for next run
      runActive    = false;
      runStartTime = null;
    }
  }

  // Reset if respawned (Z back near origin)
  if (pos.z < 100) {
    runActive     = false;
    runStartTime  = null;
    currentRunSec = null;
  }
}

// ── Game loop ─────────────────────────────────────────────────────────────────
let accumulator = 0;
let lastTime    = performance.now();
let tickCount   = 0;
let netTickCount = 0;
let cameraRoll  = 0;

const NET_SEND_EVERY = 8; // send snapshot every 8 physics ticks (~16 Hz)

function gameLoop(now) {
  requestAnimationFrame(gameLoop);

  const rawDt = (now - lastTime) / 1000;
  lastTime    = now;
  const dt    = Math.min(rawDt, 0.05); // spiral-of-death guard
  accumulator += dt;

  // Fixed-rate physics
  while (accumulator >= TICK_INTERVAL) {
    const currentInput    = input.sample();
    currentInput.tick     = tickCount++;
    simulateTick(playerState, currentInput, collisionWorld, TICK_INTERVAL);
    accumulator -= TICK_INTERVAL;

    // Network snapshot (throttled)
    netTickCount++;
    if (netTickCount % NET_SEND_EVERY === 0) {
      net.sendSnapshot(playerState.position, playerState.velocity, currentInput.yaw, playerState.onRamp);
    }
  }

  _updateRunTimer();

  // Interpolated render
  const currentInput = input.sample();
  const hSpeed       = Vec3.lengthXZ(playerState.velocity);

  // Camera roll: lean into ramp surface
  const targetRoll = (playerState.onRamp && playerState.surfaceNormal)
    ? -playerState.surfaceNormal.x * (Math.PI / 15)
    : 0;
  cameraRoll += (targetRoll - cameraRoll) * 0.1;

  renderer.updateCamera(
    playerState.position,
    currentInput.yaw,
    currentInput.pitch,
    hSpeed,
    cameraRoll,
  );
  renderer.updateVelocityArrow(playerState.position, playerState.velocity);

  // Speed vignette (0 at <400 u/s, 1 at 1200+ u/s)
  renderer.setVignetteIntensity(Math.max(0, Math.min(1, (hSpeed - 400) / 800)));

  renderer.render();

  debug.update(playerState, currentInput, {
    playerCount: net.playerCount,
    connected:   net.connected,
    runTime:     currentRunSec,
    bestTime:    bestRunSec,
  });
}

requestAnimationFrame(gameLoop);

console.log(`[SurfGame] ${TICK_RATE} Hz physics | Click to lock mouse`);
console.log('[SurfGame] Walk along the left ledge → step right onto ramp → A/D + sweep mouse');
