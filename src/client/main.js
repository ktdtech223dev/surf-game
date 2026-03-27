// SurfGame — main entry point (Phase 5)
// 3-section map · combat · audio · settings · checkpoints · leaderboard

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
import { buildTestMap, getSpawnPosition, MAP } from './MapBuilder.js';
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
const sound      = new SoundManager();
const settings   = new SettingsManager();

const playerState = createPlayerState();

const spawn = getSpawnPosition();
['x', 'y', 'z'].forEach(k => {
  playerState.position[k]      = spawn[k];
  playerState.respawnPosition[k] = spawn[k];
});
input.yaw = Math.PI;

const collisionWorld = buildTestMap(renderer);
const weapon = new WeaponSystem(net, sound);

// ── Apply saved settings ───────────────────────────────────────────────────────
input.sensitivity = settings.sensitivity;
renderer.setFOV?.(settings.fov);
sound.setVolume(settings.volume);

settings.onChange((key, value) => {
  if (key === 'sensitivity') input.sensitivity = value;
  if (key === 'fov')         renderer.setFOV?.(value);
  if (key === 'volume')      sound.setVolume(value);
  if (key === 'name' || key === 'color') net.sendMeta(settings.name, settings.color);
});

document.getElementById('settings-btn')?.addEventListener('click', () => {
  if (!input.locked) return;
  settings.openPanel();
});

document.addEventListener('keydown', (e) => {
  if (e.code === 'Escape' && input.locked && !input.chatOpen) {
    if (settings.isPanelOpen()) settings.closePanel();
    else settings.openPanel();
  }
});

// ── Local player health + death state ─────────────────────────────────────────
let localHp      = 100;
let localAlive   = true;
let _deadUntil   = 0; // performance.now() when respawn countdown ends
const hpFill     = document.getElementById('health-bar-fill');
const hpValue    = document.getElementById('health-value');
const dmgVign    = document.getElementById('damage-vignette');
const deathEl    = document.getElementById('death-overlay');
const deathCount = document.getElementById('death-countdown');

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

function _showDeath() {
  localAlive = false;
  _deadUntil = performance.now() + 2000;
  if (deathEl) deathEl.style.display = 'flex';
  _flashDamage(true);
}

function _hideDeath() {
  if (deathEl) deathEl.style.display = 'none';
}

function _tickDeath() {
  if (!deathEl || localAlive) return;
  const rem = Math.max(0, _deadUntil - performance.now()) / 1000;
  if (deathCount) deathCount.textContent = rem > 0 ? `Respawning in ${rem.toFixed(1)}s…` : 'Respawning…';
}

function _flashDamage(hard = false) {
  if (!dmgVign) return;
  dmgVign.style.opacity    = hard ? '1' : '0.7';
  dmgVign.style.transition = `opacity ${hard ? '0.05' : '0.08'}s`;
  setTimeout(() => {
    dmgVign.style.opacity    = '0';
    dmgVign.style.transition = 'opacity 0.6s';
  }, hard ? 200 : 120);
}

// ── Checkpoint splits ──────────────────────────────────────────────────────────
const splitEl   = document.getElementById('split-display');
const splits    = { cp1: null, cp2: null };   // elapsed seconds at each checkpoint
let   splitBest = { cp1: null, cp2: null };   // best run splits (session)

function _updateSplits(pos, elapsed) {
  // CP1: just past end of section 1
  if (!splits.cp1 && pos.z > MAP.S1_END_Z && pos.y < MAP.PAD1_Y + 30) {
    splits.cp1 = elapsed;
    sound.playChat(); // repurpose as checkpoint ping
  }
  // CP2: just past end of section 2
  if (!splits.cp2 && pos.z > MAP.S2_END_Z && pos.y < MAP.PAD2_Y + 30) {
    splits.cp2 = elapsed;
    sound.playChat();
  }
  _renderSplits(elapsed);
}

function _resetSplits() {
  splits.cp1 = null;
  splits.cp2 = null;
}

function _renderSplits(elapsed) {
  if (!splitEl) return;
  const fmt = t => {
    if (t == null) return '--:--.---';
    const ms  = Math.floor((t % 1) * 1000);
    const sec = Math.floor(t % 60);
    const min = Math.floor(t / 60);
    const pad = (n, w = 2) => String(n).padStart(w, '0');
    return `${pad(min)}:${pad(sec)}.${pad(ms, 3)}`;
  };
  const diff = (val, best) => {
    if (val == null || best == null) return '';
    const d = val - best;
    const col = d <= 0 ? '#0f0' : '#f44';
    const sign = d > 0 ? '+' : '';
    return ` <span style="color:${col}">${sign}${d.toFixed(2)}s</span>`;
  };
  splitEl.innerHTML =
    `<div style="color:#3366cc;font-size:11px">CP1 ${fmt(splits.cp1)}${diff(splits.cp1, splitBest.cp1)}</div>` +
    `<div style="color:#00cc88;font-size:11px">CP2 ${fmt(splits.cp2)}${diff(splits.cp2, splitBest.cp2)}</div>` +
    `<div style="color:#ffcc00;font-size:12px;font-weight:bold">RUN ${fmt(elapsed)}</div>`;
}

// ── Finish banner ──────────────────────────────────────────────────────────────
const finishBanner = document.getElementById('finish-banner');
const finishTimeEl = document.getElementById('finish-time');
const finishPbEl   = document.getElementById('finish-pb');
let   bestRunSec   = null;

function _showFinish(timeSec) {
  // Update best splits
  if (splits.cp1 && (splitBest.cp1 == null || splits.cp1 < splitBest.cp1)) splitBest.cp1 = splits.cp1;
  if (splits.cp2 && (splitBest.cp2 == null || splits.cp2 < splitBest.cp2)) splitBest.cp2 = splits.cp2;

  const isPB = bestRunSec == null || timeSec < bestRunSec;
  if (isPB) bestRunSec = timeSec;

  const fmt = t => {
    const ms  = Math.floor((t % 1) * 1000);
    const sec = Math.floor(t % 60);
    const min = Math.floor(t / 60);
    const pad = (n, w = 2) => String(n).padStart(w, '0');
    return `${pad(min)}:${pad(sec)}.${pad(ms, 3)}`;
  };

  if (finishTimeEl) finishTimeEl.textContent = fmt(timeSec);
  if (finishPbEl)   finishPbEl.textContent   = isPB ? '★ NEW PERSONAL BEST' : `Best: ${fmt(bestRunSec)}`;
  if (finishBanner) finishBanner.style.display = 'block';

  sound.playKill(); // triumphant sound
  net.sendFinish(timeSec);

  setTimeout(() => {
    if (finishBanner) finishBanner.style.display = 'none';
  }, 6000);
}

// ── Network callbacks ──────────────────────────────────────────────────────────
net.onWelcome = (id) => {
  scoreboard.setLocalId(id);
  net.sendMeta(settings.name, settings.color);
};

net.onPeerUpdate = (id, snap, serverTime) => {
  ghosts.addSnapshot(id, snap, serverTime ?? Date.now());
  scoreboard.upsert(id, { id, name: snap.name, hp: snap.hp });
};

net.onPeerLeave = (id) => { ghosts.remove(id); scoreboard.remove(id); };

net.onDmg = (targetId, _shooterId, hp) => {
  ghosts.setHp(targetId, hp);
  ghosts.flashHit(targetId);
  scoreboard.upsert(targetId, { hp });
};

net.onHurt = (_damage, hp) => {
  _setHp(hp);
  sound.playHurt();
  if (hp <= 0) _showDeath();
  else _flashDamage();
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
  _hideDeath();
  _setHp(hp);
  playerState.position.x = spawn.x;
  playerState.position.y = spawn.y;
  playerState.position.z = spawn.z;
  Vec3.set(playerState.velocity, 0, 0, 0);
};

net.onHitConfirm = () => { weapon.onHitConfirm(); sound.playHit(); };  // hit confirm tick

net.onPlayerList = (list) => {
  scoreboard.setLocalId(net.id);
  scoreboard.updateFromList(list);
};

net.onChat = (id, name, text) => { _addChatLine(name, text); sound.playChat(); };

net.onMetaUpdate = (id, name, color) => {
  ghosts.setName(id, name);
  if (color) ghosts.setColor?.(id, color);
  scoreboard.upsert(id, { name });
};

net.onFinish = ({ name, time }) => {
  killFeed.addKill({ killerName: name, victimName: `${_fmtTime(time)}`, killerId: -1, victimId: -1 }, net.id);
};

net.onLeaderboard = (list) => {
  scoreboard.updateLeaderboard(list);
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

function _openChat()  { input.chatOpen = true;  chatWrap?.classList.add('open');    setTimeout(() => chatInput?.focus(), 0); }
function _closeChat() { input.chatOpen = false; chatWrap?.classList.remove('open'); chatInput?.blur(); }

let _prevChatOpen  = false;
let _prevScoreOpen = false;

document.addEventListener('keydown', (e) => {
  if (e.code === 'KeyR' && !input.chatOpen && input.locked && !settings.isPanelOpen()) {
    weapon.reload(); sound.playReload();
  }
});

// ── Run timer ─────────────────────────────────────────────────────────────────
const TIMER_START_Z = 360;

let runStartTime  = null;
let runActive     = false;
let currentRunSec = null;
let _finishedThisRun = false;

function _updateRunTimer() {
  const pos = playerState.position;

  if (!runActive && pos.z > TIMER_START_Z && pos.y > -600) {
    runActive       = true;
    runStartTime    = performance.now();
    currentRunSec   = 0;
    _finishedThisRun = false;
    _resetSplits();
    if (splitEl) splitEl.style.display = 'block';
  }

  if (runActive) {
    currentRunSec = (performance.now() - runStartTime) / 1000;
    _updateSplits(pos, currentRunSec);

    // Finish detection: past section 3 end and at finish platform level
    if (!_finishedThisRun && pos.z > MAP.FINISH_Z && pos.y < MAP.PAD3_Y + 60) {
      _finishedThisRun = true;
      _showFinish(currentRunSec);
      runActive = false;
      if (splitEl) splitEl.style.display = 'none';
    }
  }

  // Reset if spawned back at start
  if (pos.z < 100) {
    runActive        = false;
    runStartTime     = null;
    currentRunSec    = null;
    _finishedThisRun = false;
    _resetSplits();
    if (splitEl) splitEl.style.display = 'none';
  }
}

// ── Footstep timing ───────────────────────────────────────────────────────────
let _lastStepTime = 0;
let _wasInAir     = false;

function _handleFootsteps(state) {
  const now      = performance.now();
  const onGround = state.onGround;
  const hSpeed   = Vec3.lengthXZ(state.velocity);
  if (onGround && _wasInAir && hSpeed > 100) { sound.playLand(); _lastStepTime = now; }
  _wasInAir = !onGround && !state.onRamp;
  if (onGround && hSpeed > 30 && now - _lastStepTime > 380) { sound.playFootstep(); _lastStepTime = now; }
}

// ── Game init ─────────────────────────────────────────────────────────────────
async function initGame() {
  if (settings.isFirstLaunch) await settings.promptName();
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
  sound.init();

  const rawDt = (now - lastTime) / 1000;
  lastTime    = now;
  const dt    = Math.min(rawDt, 0.05);
  accumulator += dt;

  while (accumulator >= TICK_INTERVAL) {
    const inp = input.sample();
    inp.tick  = tickCount++;
    simulateTick(playerState, inp, collisionWorld, TICK_INTERVAL);
    accumulator -= TICK_INTERVAL;

    _handleFootsteps(playerState);

    const canShoot = input.locked && !input.chatOpen && localAlive && !settings.isPanelOpen();
    if (canShoot && inp.shoot)        weapon.tryFire(null, playerState.position, inp.yaw, inp.pitch);
    if (canShoot && input.isFireHeld()) weapon.tryFire(null, playerState.position, inp.yaw, inp.pitch);

    netTickCount++;
    if (netTickCount % NET_SEND_EVERY === 0) {
      net.sendSnapshot(playerState.position, playerState.velocity, inp.yaw, playerState.onRamp);
    }
  }

  _updateRunTimer();
  _tickDeath();

  // Chat / scoreboard sync
  const inp2 = input.sample();
  if (input.chatOpen  && !_prevChatOpen)  _openChat();
  if (!input.chatOpen && _prevChatOpen)   _closeChat();
  _prevChatOpen = input.chatOpen;

  if (input.scoreboardOpen  && !_prevScoreOpen) scoreboard.show();
  if (!input.scoreboardOpen &&  _prevScoreOpen) scoreboard.hide();
  _prevScoreOpen = input.scoreboardOpen;

  // Subsystem ticks
  ghosts.tick();
  killFeed.tick();
  weapon.tick();
  sound.setWindSpeed(Vec3.lengthXZ(playerState.velocity));

  // Camera
  const hSpeed     = Vec3.lengthXZ(playerState.velocity);
  const targetRoll = (playerState.onRamp && playerState.surfaceNormal)
    ? -playerState.surfaceNormal.x * (Math.PI / 15) : 0;
  cameraRoll += (targetRoll - cameraRoll) * 0.1;

  renderer.updateCamera(playerState.position, inp2.yaw, inp2.pitch, hSpeed, cameraRoll);
  renderer.updateVelocityArrow(playerState.position, playerState.velocity);
  renderer.setVignetteIntensity(Math.max(0, Math.min(1, (hSpeed - 400) / 800)));
  renderer.render();

  debug.update(playerState, inp2, {
    playerCount: net.playerCount,
    connected:   net.connected,
    runTime:     currentRunSec,
    bestTime:    bestRunSec,
    hp:          localHp,
    ping:        net.pingMs,
  });
}

window.__surf = { playerState, input, collisionWorld, net, weapon, sound, settings };
console.log(`[SurfGame] ${TICK_RATE} Hz physics | 3-section map`);

function _esc(str)   { return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
function _fmtTime(t) {
  const ms=Math.floor((t%1)*1000), sec=Math.floor(t%60), min=Math.floor(t/60);
  const pad=(n,w=2)=>String(n).padStart(w,'0');
  return `${pad(min)}:${pad(sec)}.${pad(ms,3)}`;
}
