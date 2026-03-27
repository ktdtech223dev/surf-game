// SurfGame — main entry point
// Fixed 128 Hz physics, variable-rate rendering, WebSocket multiplayer + combat

import { Renderer }      from './Renderer.js';
import { InputManager }  from './Input.js';
import { DebugOverlay }  from './DebugOverlay.js';
import { NetworkClient } from './NetworkClient.js';
import { GhostRenderer } from './GhostRenderer.js';
import { WeaponSystem }  from './WeaponSystem.js';
import { KillFeed }      from './KillFeed.js';
import { Scoreboard }    from './Scoreboard.js';
import { buildTestMap, getSpawnPosition } from './MapBuilder.js';
import { createPlayerState, simulateTick } from '../shared/physics/MovementEngine.js';
import { TICK_RATE, TICK_INTERVAL } from '../shared/physics/constants.js';
import * as Vec3 from '../shared/physics/vec3.js';

// ── Init ───────────────────────────────────────────────────────────────────────
const renderer   = new Renderer();
const input      = new InputManager();
const debug      = new DebugOverlay();
const net        = new NetworkClient();
const ghosts     = new GhostRenderer(renderer.scene);
const killFeed   = new KillFeed();
const scoreboard = new Scoreboard();

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

// Weapon system (needs net to send shoot events)
const weapon = new WeaponSystem(net);

// ── Local player health ────────────────────────────────────────────────────────
let localHp    = 100;
let localAlive = true;
const hpFill   = document.getElementById('health-bar-fill');
const hpValue  = document.getElementById('health-value');
const dmgVign  = document.getElementById('damage-vignette');

function _setHp(hp) {
  localHp = Math.max(0, Math.min(100, hp));
  if (hpFill) {
    const frac = localHp / 100;
    hpFill.style.width     = `${frac * 100}%`;
    hpFill.style.background = frac > 0.5 ? '#0f0' : frac > 0.25 ? '#fa0' : '#f44';
  }
  if (hpValue) {
    hpValue.textContent  = localHp;
    hpValue.style.color  = localHp > 50 ? '#0f0' : localHp > 25 ? '#fa0' : '#f44';
  }
}

function _flashDamage() {
  if (!dmgVign) return;
  dmgVign.style.opacity    = '1';
  dmgVign.style.transition = 'opacity 0.08s';
  setTimeout(() => {
    dmgVign.style.opacity    = '0';
    dmgVign.style.transition = 'opacity 0.5s';
  }, 120);
}

// ── Network callbacks ──────────────────────────────────────────────────────────
net.onWelcome = (id) => {
  scoreboard.setLocalId(id);
};

net.onPeerUpdate = (id, snap, serverTime) => {
  ghosts.addSnapshot(id, snap, serverTime ?? Date.now());
  scoreboard.upsert(id, { id, name: snap.name, hp: snap.hp });
};

net.onPeerLeave = (id) => {
  ghosts.remove(id);
  scoreboard.remove(id);
};

net.onDmg = (targetId, shooterId, hp) => {
  // A remote player was damaged — update ghost HP bar
  ghosts.setHp(targetId, hp);
  ghosts.flashHit(targetId);
  scoreboard.upsert(targetId, { hp });
};

net.onHurt = (damage, hp) => {
  // Local player was hit
  _setHp(hp);
  _flashDamage();
};

net.onKill = (kill) => {
  killFeed.addKill(kill, net.id);
  if (kill.victimId !== net.id) {
    // Mark victim dead in scoreboard and ghost
    ghosts.setHp(kill.victimId, 0);
    scoreboard.upsert(kill.victimId, { hp: 0, alive: false });
  }
  scoreboard.upsert(kill.killerId, { kills: (scoreboard._players.get(kill.killerId)?.kills ?? 0) + 1 });
};

net.onRespawn = (hp) => {
  localAlive = true;
  _setHp(hp);
  // Respawn local player at spawn
  playerState.position.x = spawn.x;
  playerState.position.y = spawn.y;
  playerState.position.z = spawn.z;
  Vec3.set(playerState.velocity, 0, 0, 0);
};

net.onHitConfirm = (targetId) => {
  weapon.onHitConfirm();
};

net.onPlayerList = (list) => {
  scoreboard.setLocalId(net.id);
  scoreboard.updateFromList(list);
};

net.onChat = (id, name, text) => {
  _addChatLine(name, text);
};

net.onMetaUpdate = (id, name) => {
  ghosts.setName(id, name);
  scoreboard.upsert(id, { name });
};

net.connect();

// ── Chat UI ────────────────────────────────────────────────────────────────────
const chatWrap    = document.getElementById('chat-input-wrap');
const chatInput   = document.getElementById('chat-input');
const chatMsgsEl  = document.getElementById('chat-messages');
const MAX_CHAT    = 12;
const chatLines   = [];

function _addChatLine(name, text) {
  if (!chatMsgsEl) return;
  const div = document.createElement('div');
  div.className = 'chat-line';
  div.innerHTML = `<span class="chat-name">${_esc(name)}:</span> ${_esc(text)}`;
  chatMsgsEl.prepend(div);
  chatLines.unshift(div);
  // Fade after 8 seconds
  setTimeout(() => { div.style.opacity = '0'; div.style.transition = 'opacity 0.6s'; }, 8000);
  setTimeout(() => { div.remove(); }, 8700);
  while (chatLines.length > MAX_CHAT) chatLines.pop().remove();
}

// Chat input event handling (pointer-events: auto on input wrap)
if (chatInput) {
  chatInput.addEventListener('keydown', (e) => {
    e.stopPropagation(); // don't let game grab these
    if (e.code === 'Enter') {
      const text = chatInput.value.trim();
      if (text) {
        net.sendChat(text);
        _addChatLine('You', text);
      }
      chatInput.value = '';
      _closeChat();
    }
    if (e.code === 'Escape') {
      chatInput.value = '';
      _closeChat();
    }
  });
}

function _openChat() {
  input.chatOpen = true;
  if (chatWrap) chatWrap.classList.add('open');
  setTimeout(() => chatInput?.focus(), 0);
}

function _closeChat() {
  input.chatOpen = false;
  if (chatWrap) chatWrap.classList.remove('open');
  chatInput?.blur();
}

// Monitor input.chatOpen to open/close UI
let _prevChatOpen = false;

// ── Scoreboard UI ──────────────────────────────────────────────────────────────
let _prevScoreOpen = false;

// ── Reload key (R) ────────────────────────────────────────────────────────────
document.addEventListener('keydown', (e) => {
  if (e.code === 'KeyR' && !input.chatOpen && input.locked) {
    weapon.reload();
  }
});

// ── Run timer ─────────────────────────────────────────────────────────────────
const TIMER_START_Z  = 360;
const TIMER_FINISH_Z = 3750;
const TIMER_FINISH_Y = -700;

let runStartTime  = null;
let runActive     = false;
let currentRunSec = null;
let bestRunSec    = null;

function _updateRunTimer() {
  const pos = playerState.position;

  if (!runActive && pos.z > TIMER_START_Z && pos.y > -600) {
    runActive     = true;
    runStartTime  = performance.now();
    currentRunSec = 0;
  }

  if (runActive) {
    currentRunSec = (performance.now() - runStartTime) / 1000;
    if (pos.z > TIMER_FINISH_Z && pos.y < TIMER_FINISH_Y) {
      const t = currentRunSec;
      if (bestRunSec === null || t < bestRunSec) bestRunSec = t;
      runActive    = false;
      runStartTime = null;
    }
  }

  if (pos.z < 100) {
    runActive     = false;
    runStartTime  = null;
    currentRunSec = null;
  }
}

// ── Game loop ──────────────────────────────────────────────────────────────────
let accumulator  = 0;
let lastTime     = performance.now();
let tickCount    = 0;
let netTickCount = 0;
let cameraRoll   = 0;

const NET_SEND_EVERY = 8; // ~16 Hz

function gameLoop(now) {
  requestAnimationFrame(gameLoop);

  const rawDt = (now - lastTime) / 1000;
  lastTime    = now;
  const dt    = Math.min(rawDt, 0.05);
  accumulator += dt;

  // Fixed-rate physics
  while (accumulator >= TICK_INTERVAL) {
    const currentInput  = input.sample();
    currentInput.tick   = tickCount++;
    simulateTick(playerState, currentInput, collisionWorld, TICK_INTERVAL);
    accumulator -= TICK_INTERVAL;

    // Shoot (edge-detect from input.sample())
    if (currentInput.shoot && input.locked && !input.chatOpen && localAlive) {
      weapon.tryFire(null, playerState.position, currentInput.yaw, currentInput.pitch);
    }

    // Auto-fire while held
    if (input.isFireHeld() && input.locked && !input.chatOpen && localAlive) {
      weapon.tryFire(null, playerState.position, currentInput.yaw, currentInput.pitch);
    }

    // Network snapshot (throttled)
    netTickCount++;
    if (netTickCount % NET_SEND_EVERY === 0) {
      net.sendSnapshot(playerState.position, playerState.velocity, currentInput.yaw, playerState.onRamp);
    }
  }

  _updateRunTimer();

  // Chat UI sync
  if (input.chatOpen && !_prevChatOpen) _openChat();
  if (!input.chatOpen && _prevChatOpen) _closeChat();
  _prevChatOpen = input.chatOpen;

  // Scoreboard sync
  if (input.scoreboardOpen && !_prevScoreOpen) scoreboard.show();
  if (!input.scoreboardOpen && _prevScoreOpen) scoreboard.hide();
  _prevScoreOpen = input.scoreboardOpen;

  // Ghost interpolation
  ghosts.tick();
  killFeed.tick();
  weapon.tick();

  // Camera
  const currentInput = input.sample();
  const hSpeed       = Vec3.lengthXZ(playerState.velocity);

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
  renderer.setVignetteIntensity(Math.max(0, Math.min(1, (hSpeed - 400) / 800)));
  renderer.render();

  debug.update(playerState, currentInput, {
    playerCount: net.playerCount,
    connected:   net.connected,
    runTime:     currentRunSec,
    bestTime:    bestRunSec,
    hp:          localHp,
    ping:        net.pingMs,
  });
}

requestAnimationFrame(gameLoop);

// Expose for debugging
window.__surf = { playerState, input, collisionWorld, net, weapon };

console.log(`[SurfGame] ${TICK_RATE} Hz physics | Click to lock mouse`);
console.log('[SurfGame] LMB: shoot · R: reload · Tab: scoreboard · Enter: chat');

function _esc(str) {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
