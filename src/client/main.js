// SurfGame — main entry point
// Fixed 128 Hz physics, variable-rate rendering, WebSocket multiplayer + combat + audio

import { Renderer }        from './Renderer.js';
import { InputManager }    from './Input.js';
import { DebugOverlay }    from './DebugOverlay.js';
import { NetworkClient }   from './NetworkClient.js';
import { GhostRenderer }   from './GhostRenderer.js';
import { WeaponSystem }    from './WeaponSystem.js';
import { KillFeed }        from './KillFeed.js';
import { Scoreboard }      from './Scoreboard.js';
import { SoundManager }    from './SoundManager.js';
import { SettingsManager } from './SettingsManager.js';
import { buildTestMap, getSpawnPosition } from './MapBuilder.js';
import { createPlayerState, simulateTick } from '../shared/physics/MovementEngine.js';
import { TICK_RATE, TICK_INTERVAL } from '../shared/physics/constants.js';
import * as Vec3 from '../shared/physics/vec3.js';

// ── Init ───────────────────────────────────────────────────────────────────────
const renderer  = new Renderer();
const input     = new InputManager();
const debug     = new DebugOverlay();
const net       = new NetworkClient();
const ghosts    = new GhostRenderer(renderer.scene);
const killFeed  = new KillFeed();
const scoreboard = new Scoreboard();
const sound     = new SoundManager();
const settings  = new SettingsManager();

const playerState = createPlayerState();

// Spawn
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

// Weapon system
const weapon = new WeaponSystem(net);

// ── Apply saved settings ───────────────────────────────────────────────────────
input.sensitivity = settings.sensitivity;
renderer.setFOV?.(settings.fov);

// Settings live-update callback
settings.onChange((key, value) => {
  if (key === 'sensitivity') input.sensitivity = value;
  if (key === 'fov')         renderer.setFOV?.(value);
  if (key === 'volume')      sound.setVolume(value);
  if (key === 'name')        net.sendMeta(value);
});

// Settings gear button
document.getElementById('settings-btn')?.addEventListener('click', () => {
  if (!input.locked) return; // only while playing
  settings.openPanel();
});

// Escape key: open/close settings (when locked and not in chat)
document.addEventListener('keydown', (e) => {
  if (e.code === 'Escape' && input.locked && !input.chatOpen) {
    if (settings.isPanelOpen()) settings.closePanel();
    else settings.openPanel();
  }
});

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
    hpFill.style.width      = `${frac * 100}%`;
    hpFill.style.background = frac > 0.5 ? '#0f0' : frac > 0.25 ? '#fa0' : '#f44';
  }
  if (hpValue) {
    hpValue.textContent = localHp;
    hpValue.style.color = localHp > 50 ? '#0f0' : localHp > 25 ? '#fa0' : '#f44';
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
  net.sendMeta(settings.name);
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
  ghosts.setHp(targetId, hp);
  ghosts.flashHit(targetId);
  scoreboard.upsert(targetId, { hp });
};

net.onHurt = (damage, hp) => {
  _setHp(hp);
  _flashDamage();
  sound.playHurt();
};

net.onKill = (kill) => {
  killFeed.addKill(kill, net.id);
  if (kill.killerId === net.id) sound.playKill();
  if (kill.victimId !== net.id) {
    ghosts.setHp(kill.victimId, 0);
    scoreboard.upsert(kill.victimId, { hp: 0, alive: false });
  }
  scoreboard.upsert(kill.killerId, {
    kills: (scoreboard._players.get(kill.killerId)?.kills ?? 0) + 1,
  });
};

net.onRespawn = (hp) => {
  localAlive = true;
  _setHp(hp);
  playerState.position.x = spawn.x;
  playerState.position.y = spawn.y;
  playerState.position.z = spawn.z;
  Vec3.set(playerState.velocity, 0, 0, 0);
};

net.onHitConfirm = () => {
  weapon.onHitConfirm();
  sound.playHit();
};

net.onPlayerList = (list) => {
  scoreboard.setLocalId(net.id);
  scoreboard.updateFromList(list);
};

net.onChat = (id, name, text) => {
  _addChatLine(name, text);
  sound.playChat();
};

net.onMetaUpdate = (id, name) => {
  ghosts.setName(id, name);
  scoreboard.upsert(id, { name });
};

net.connect();

// ── Chat UI ────────────────────────────────────────────────────────────────────
const chatWrap   = document.getElementById('chat-input-wrap');
const chatInput  = document.getElementById('chat-input');
const chatMsgsEl = document.getElementById('chat-messages');
const chatLines  = [];

function _addChatLine(name, text) {
  if (!chatMsgsEl) return;
  const div = document.createElement('div');
  div.className = 'chat-line';
  div.innerHTML = `<span class="chat-name">${_esc(name)}:</span> ${_esc(text)}`;
  chatMsgsEl.prepend(div);
  chatLines.unshift(div);
  setTimeout(() => { div.style.opacity = '0'; div.style.transition = 'opacity 0.6s'; }, 8000);
  setTimeout(() => { div.remove(); }, 8700);
  while (chatLines.length > 12) chatLines.pop().remove();
}

if (chatInput) {
  chatInput.addEventListener('keydown', (e) => {
    e.stopPropagation();
    if (e.code === 'Enter') {
      const text = chatInput.value.trim();
      if (text) { net.sendChat(text); _addChatLine(settings.name, text); }
      chatInput.value = '';
      _closeChat();
    }
    if (e.code === 'Escape') { chatInput.value = ''; _closeChat(); }
  });
}

function _openChat() {
  input.chatOpen = true;
  chatWrap?.classList.add('open');
  setTimeout(() => chatInput?.focus(), 0);
}

function _closeChat() {
  input.chatOpen = false;
  chatWrap?.classList.remove('open');
  chatInput?.blur();
}

let _prevChatOpen  = false;
let _prevScoreOpen = false;

// ── Reload key ────────────────────────────────────────────────────────────────
document.addEventListener('keydown', (e) => {
  if (e.code === 'KeyR' && !input.chatOpen && input.locked && !settings.isPanelOpen()) {
    weapon.reload();
    sound.playReload();
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
    runActive = true; runStartTime = performance.now(); currentRunSec = 0;
  }
  if (runActive) {
    currentRunSec = (performance.now() - runStartTime) / 1000;
    if (pos.z > TIMER_FINISH_Z && pos.y < TIMER_FINISH_Y) {
      const t = currentRunSec;
      if (bestRunSec === null || t < bestRunSec) bestRunSec = t;
      runActive = false; runStartTime = null;
    }
  }
  if (pos.z < 100) { runActive = false; runStartTime = null; currentRunSec = null; }
}

// ── Footstep timing ───────────────────────────────────────────────────────────
let _lastStepTime   = 0;
let _wasOnGround    = false;
let _wasInAir       = false;

function _handleFootsteps(state) {
  const now       = performance.now();
  const onGround  = state.onGround;
  const hSpeed    = Vec3.lengthXZ(state.velocity);

  // Land sound
  if (onGround && _wasInAir && hSpeed > 100) {
    sound.playLand();
    _lastStepTime = now;
  }
  _wasInAir    = !onGround && !state.onRamp;

  // Footsteps while walking
  if (onGround && hSpeed > 30 && now - _lastStepTime > 380) {
    sound.playFootstep();
    _lastStepTime = now;
  }
}

// ── Game init sequence ─────────────────────────────────────────────────────────
// Show name prompt if first launch, then proceed to game
async function initGame() {
  if (settings.isFirstLaunch) {
    await settings.promptName();
  }
  // Kick off game loop after name is set
  requestAnimationFrame(gameLoop);
}

initGame();

// ── Game loop ──────────────────────────────────────────────────────────────────
let accumulator  = 0;
let lastTime     = performance.now();
let tickCount    = 0;
let netTickCount = 0;
let cameraRoll   = 0;

const NET_SEND_EVERY = 8;

function gameLoop(now) {
  requestAnimationFrame(gameLoop);

  // Init audio on first frame (after user gesture via name prompt or click)
  sound.init();

  const rawDt = (now - lastTime) / 1000;
  lastTime    = now;
  const dt    = Math.min(rawDt, 0.05);
  accumulator += dt;

  while (accumulator >= TICK_INTERVAL) {
    const currentInput = input.sample();
    currentInput.tick  = tickCount++;
    simulateTick(playerState, currentInput, collisionWorld, TICK_INTERVAL);
    accumulator -= TICK_INTERVAL;

    _handleFootsteps(playerState);

    // Shoot
    const canShoot = input.locked && !input.chatOpen && localAlive && !settings.isPanelOpen();
    if (canShoot && currentInput.shoot) {
      weapon.tryFire(null, playerState.position, currentInput.yaw, currentInput.pitch);
    }
    if (canShoot && input.isFireHeld()) {
      weapon.tryFire(null, playerState.position, currentInput.yaw, currentInput.pitch);
    }

    netTickCount++;
    if (netTickCount % NET_SEND_EVERY === 0) {
      net.sendSnapshot(playerState.position, playerState.velocity, currentInput.yaw, playerState.onRamp);
    }
  }

  _updateRunTimer();

  // Chat sync
  if (input.chatOpen && !_prevChatOpen) _openChat();
  if (!input.chatOpen && _prevChatOpen) _closeChat();
  _prevChatOpen = input.chatOpen;

  // Scoreboard sync
  if (input.scoreboardOpen && !_prevScoreOpen) scoreboard.show();
  if (!input.scoreboardOpen && _prevScoreOpen) scoreboard.hide();
  _prevScoreOpen = input.scoreboardOpen;

  // Ticks
  ghosts.tick();
  killFeed.tick();
  weapon.tick();

  // Wind sound
  const hSpeedNow = Vec3.lengthXZ(playerState.velocity);
  sound.setWindSpeed(hSpeedNow);

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

// Dev handle
window.__surf = { playerState, input, collisionWorld, net, weapon, sound, settings };

console.log(`[SurfGame] ${TICK_RATE} Hz physics | Click to lock mouse`);
console.log('[SurfGame] LMB: shoot · R: reload · Tab: scoreboard · Enter: chat · Esc: settings');

function _esc(str) {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
