/**
 * SurfGame — Main entry point (Production build)
 * Full integration: DataService, MainMenu, MapFactory, GhostSystem,
 * AchievementSystem, KnifeSystem, ChallengeSystem, NetworkClient, etc.
 */

import * as THREE            from 'three';
import { Renderer }          from './Renderer.js';
import { InputManager }      from './Input.js';
import { DebugOverlay }      from './DebugOverlay.js';
import { NetworkClient }     from './NetworkClient.js';
import { GhostRenderer }     from './GhostRenderer.js';
import { WeaponSystem }      from './WeaponSystem.js';
import { KillFeed }          from './KillFeed.js';
import { Scoreboard }        from './Scoreboard.js';
import { SoundManager }      from './SoundManager.js';
import { SettingsManager }   from './SettingsManager.js';
import { ds }                from './DataService.js';
import { MainMenu }          from './MainMenu.js';
import { MapFactory }        from './MapFactory.js';
import { GhostSystem }       from './GhostSystem.js';
import { AchievementSystem } from './AchievementSystem.js';
import { KnifeSystem }       from './KnifeSystem.js';
import { ChallengeSystem }   from './ChallengeSystem.js';
import { PauseMenu }         from './PauseMenu.js';
import { XPSystem, DIFFICULTY_MULT } from './XPSystem.js';
import { RewardScreen }     from './RewardScreen.js';
import { LoadoutMenu }      from './LoadoutMenu.js';
import { MAP_CATALOG, MAP_BY_ID, MAPS_BY_DIFF } from './MapCatalog.js';
import { buildTestMap, getSpawnPosition, MAP as MAP01 } from './MapBuilder.js';
import { createPlayerState, simulateTick } from '../shared/physics/MovementEngine.js';
import { TICK_RATE, TICK_INTERVAL }         from '../shared/physics/constants.js';
import * as Vec3 from '../shared/physics/vec3.js';
import { generateProceduralEntry } from './ProceduralMapGen.js';
import { EffectsSystem }    from './EffectsSystem.js';
import { PlayerTrail }      from './PlayerTrail.js';
import { KillStreakSystem }  from './KillStreakSystem.js';
import { CrosshairSystem }  from './CrosshairSystem.js';
import { StatTracker }      from './StatTracker.js';
import { WeaponBob }        from './WeaponBob.js';
import { RadioSystem }      from './RadioSystem.js';
import { ngames }           from './NGamesIntegration.js';

// ── Clear map geometry from scene (preserves permanent objects) ────────────────
function _clearMap(scene) {
  const toRemove = [];
  scene.children.forEach(child => {
    if (child.userData.permanent) return;
    if (child.isCamera) return;
    toRemove.push(child);
  });
  toRemove.forEach(child => {
    child.traverse(o => {
      o.geometry?.dispose();
      if (Array.isArray(o.material)) o.material.forEach(m => m.dispose());
      else o.material?.dispose();
    });
    scene.remove(child);
  });
}

// Expose catalog for AchievementSystem difficulty checks
window._mapCatalog = { MAP_CATALOG, MAPS_BY_DIFF };

// ── Core subsystems ────────────────────────────────────────────────────────────
const renderer   = new Renderer();
const input      = new InputManager();
const debug      = new DebugOverlay();
const net        = new NetworkClient();
const ghosts     = new GhostRenderer(renderer.scene);
const killFeed   = new KillFeed();
const scoreboard = new Scoreboard();
const sound      = new SoundManager();
const settings   = new SettingsManager();

// New systems
const ghostSys    = new GhostSystem(renderer.scene);
const achieve     = new AchievementSystem();
const knifeInst   = new KnifeSystem(renderer.scene, renderer.camera);
const challenge   = new ChallengeSystem();
const xpSys       = new XPSystem();
const rewardScr   = new RewardScreen();
const loadoutMenu = new LoadoutMenu(knifeInst, xpSys);

// ── AAA Polish systems ──────────────────────────────────────────────────────────
const effects   = new EffectsSystem(renderer.camera, renderer.scene);
const trail     = new PlayerTrail(renderer.scene);
const streakSys = new KillStreakSystem(
  null,
  (amount, src) => { xpSys.add(amount, src).then(() => _updateXPHud()).catch(() => {}); },
  sound
);
const crosshair = new CrosshairSystem();
const statTrack = new StatTracker();
const _shakeOffset = { x: 0, y: 0 };
const weaponBob    = new WeaponBob();
const radio        = new RadioSystem();

// Physics + map state
const playerState = createPlayerState();
let collisionWorld = null;
let activeMap = MAP01;   // MAP descriptor (FINISH_Z, FINISH_Y, etc.)
let activeMapId = 'map_01';

// ── Mode ───────────────────────────────────────────────────────────────────────
let _mode   = 'solo'; // 'solo' | 'online'
let _inGame = false;  // true only after player has chosen a map and entered play

// ── Online lobby state ─────────────────────────────────────────────────────────
let _lobbyState = null;
let _onlineHudEl = null;

// ── Apply local settings (SettingsManager = in-game panel, DS = server-side) ──
input.sensitivity = settings.sensitivity;
renderer.setFOV?.(settings.fov);
sound.setVolume(settings.volume);

settings.onChange((key, value) => {
  if (key === 'sensitivity') input.sensitivity = value;
  if (key === 'fov')         renderer.setFOV?.(value);
  if (key === 'volume')      sound.setVolume(value);
  if (key === 'name' || key === 'color') {
    net.sendMeta(settings.name, settings.color);
    // Sync to server
    ds.updateProfile({ name: settings.name, color: settings.color }).catch(() => {});
  }
});

document.getElementById('settings-btn')?.addEventListener('click', () => {
  if (!input.locked) return;
  settings.openPanel();
});

// ── Pointer lock → auto-show pause menu ───────────────────────────────────────
// The browser releases pointer lock BEFORE keydown fires for Escape, so we can
// never check input.locked in the keydown handler to show the menu.  Instead,
// listen for the native pointerlockchange event.
document.addEventListener('pointerlockchange', () => {
  if (document.pointerLockElement) return; // lock acquired – nothing to do
  // Only open pause when the player has deliberately entered the game.
  // _inGame is false during main menu, loadout, and any other pre-game state.
  if (_inGame && !mainMenu.visible && !loadoutMenu.visible && !pauseMenu.visible) {
    pauseMenu.show();
  }
});

document.addEventListener('keydown', (e) => {
  if (e.code === 'Escape' && !input.chatOpen) {
    if (pauseMenu.visible) {
      pauseMenu.hide();
      renderer.renderer.domElement.requestPointerLock?.();
    }
    // (showing the menu is now handled by pointerlockchange above)
  }
  // F key: knife inspect
  if (e.code === 'KeyF' && input.locked && !input.chatOpen) {
    knifeInst.toggleInspect();
  }
  // M key: open main menu
  if (e.code === 'KeyM' && input.locked && !input.chatOpen && !pauseMenu.visible) {
    mainMenu.show();
  }
  // R key: quick respawn while dead
  if (e.code === 'KeyR' && !localAlive && !input.chatOpen) {
    net.sendRequestRespawn();
  }
  // Q key: reset run to spawn mid-run
  if (e.code === 'KeyQ' && input.locked && !input.chatOpen && !pauseMenu.visible) {
    _quickReset();
  }
});

// ── Local player health + death state ─────────────────────────────────────────
let localHp    = 100;
let localAlive = true;
let _deadUntil = 0;
const hpFill    = document.getElementById('health-bar-fill');
const hpValue   = document.getElementById('health-value');
const dmgVign   = document.getElementById('damage-vignette');
const deathEl   = document.getElementById('death-overlay');
const deathCount= document.getElementById('death-countdown');

function _setHp(hp) {
  localHp = Math.max(0, Math.min(100, hp));
  if (hpFill) {
    hpFill.style.width      = `${(localHp / 100) * 100}%`;
    hpFill.style.background = localHp > 50 ? '#0f0' : localHp > 25 ? '#fa0' : '#f44';
  }
  if (hpValue) {
    hpValue.textContent = localHp;
    hpValue.style.color = localHp > 50 ? '#0f0' : localHp > 25 ? '#fa0' : '#f44';
  }
}
function _showDeath()   { localAlive = false; _deadUntil = performance.now() + 2000; if (deathEl) deathEl.style.display = 'flex'; _flashDamage(true); }
function _hideDeath()   { if (deathEl) deathEl.style.display = 'none'; }
function _tickDeath()   { if (!deathEl || localAlive) return; const rem = Math.max(0, _deadUntil - performance.now()) / 1000; if (deathCount) deathCount.textContent = rem > 0 ? `Respawning in ${rem.toFixed(1)}s… (Press R to respawn now)` : 'Respawning… (Press R to respawn now)'; }
function _flashDamage(hard = false) {
  if (!dmgVign) return;
  dmgVign.style.opacity    = hard ? '1' : '0.7';
  dmgVign.style.transition = `opacity ${hard ? '0.05' : '0.08'}s`;
  setTimeout(() => { dmgVign.style.opacity = '0'; dmgVign.style.transition = 'opacity 0.6s'; }, hard ? 200 : 120);
}

// ── Checkpoint splits ──────────────────────────────────────────────────────────
const splitEl   = document.getElementById('split-display');
const splits    = {};
let   splitBest = {};

function _updateSplits(pos, elapsed) {
  const bounds = activeMap.sectionBounds ?? [];
  for (let i = 0; i < bounds.length; i++) {
    const key = `cp${i+1}`;
    if (!splits[key] && pos.z > bounds[i].endZ && pos.y < bounds[i].endY + 30) {
      splits[key] = elapsed;
      sound.playCheckpoint();
      effects.checkpointRing(playerState.position);
      statTrack.onCheckpoint();
    }
  }
  _renderSplits(elapsed);
}
function _resetSplits() { for (const k in splits) delete splits[k]; }

function _renderSplits(elapsed) {
  if (!splitEl) return;
  const fmt = t => {
    if (t == null) return '--:--.---';
    const ms = Math.floor((t%1)*1000), sec = Math.floor(t%60), min = Math.floor(t/60);
    const p = (n, w=2) => String(n).padStart(w,'0');
    return `${p(min)}:${p(sec)}.${p(ms,3)}`;
  };
  const diff = (val, best) => {
    if (val==null||best==null) return '';
    const d = val-best; const col = d<=0?'#0f0':'#f44'; const sign = d>0?'+':'';
    return ` <span style="color:${col}">${sign}${d.toFixed(2)}s</span>`;
  };
  const bounds = activeMap.sectionBounds ?? [];
  const colors = ['#3366cc','#00cc88','#aa44ff','#ff8800'];
  splitEl.innerHTML = bounds.map((s, i) => {
    const k = `cp${i+1}`;
    return `<div style="color:${colors[i]??'#888'};font-size:11px">CP${i+1} ${fmt(splits[k]??null)}${diff(splits[k]??null, splitBest[k]??null)}</div>`;
  }).join('') + `<div style="color:#ffcc00;font-size:12px;font-weight:bold">RUN ${fmt(elapsed)}</div>`;
}

// ── Finish banner ──────────────────────────────────────────────────────────────
const finishBanner = document.getElementById('finish-banner');
const finishTimeEl = document.getElementById('finish-time');
const finishPbEl   = document.getElementById('finish-pb');
let   bestRunSec   = null;
let   sessionKills = 0;

async function _showFinish(timeSec) {
  // Update split bests
  const bounds = activeMap.sectionBounds ?? [];
  bounds.forEach((_, i) => {
    const k = `cp${i+1}`;
    if (splits[k] && (splitBest[k] == null || splits[k] < splitBest[k])) splitBest[k] = splits[k];
  });

  const isPB = bestRunSec == null || timeSec < bestRunSec;
  if (isPB) bestRunSec = timeSec;

  statTrack.onMapFinish(timeSec);
  if (isPB) streakSys.onPersonalBest(timeSec, activeMapId);

  if (finishTimeEl) finishTimeEl.textContent = _fmtTime(timeSec);
  if (finishPbEl)   finishPbEl.textContent   = isPB ? '★ NEW PERSONAL BEST' : `Best: ${_fmtTime(bestRunSec)}`;
  if (finishBanner) finishBanner.style.display = 'block';

  // N Games — submit run + presence ping
  ngames.submitRun({
    timeSec,
    mapId:      activeMapId,
    mapName:    activeMap?.name ?? activeMapId,
    difficulty: activeMap?.difficulty ?? 'beginner',
    isPB,
    speed:      statTrack._topSpeed ?? 0,
    mode:       _mode,
  });
  ngames.ping({ screen: 'game_over', map: activeMapId, time: timeSec, pb: isPB });

  sound.playKill();

  // Network + server
  net.sendFinish(timeSec, activeMapId);

  // ── XP awards ──────────────────────────────────────────────────────────────
  const oldLevel = xpSys.level;
  const oldXP    = xpSys.xp;
  const xpGains  = [];

  // Get map difficulty
  const mapDef   = MAP_BY_ID?.[activeMapId];
  const diffKey  = mapDef?.difficulty ?? 'beginner';
  const diffMult = DIFFICULTY_MULT[diffKey] ?? 1.0;
  const baseXP   = Math.round(50 * diffMult);

  xpGains.push({ amount: baseXP, source: 'map_finish', label: 'Map Finish' });
  await xpSys.add(baseXP, 'map_finish');

  if (isPB) {
    xpGains.push({ amount: 25, source: 'beat_pb', label: 'Personal Best' });
    await xpSys.add(25, 'beat_pb');
  }

  // Time bonus (if under par time of 90s * difficulty)
  const par = 90 / diffMult;
  if (timeSec < par) {
    const ratio  = Math.max(0, 1 - timeSec / par);
    const bonus  = Math.min(50, Math.round(50 * ratio * diffMult));
    if (bonus > 0) {
      xpGains.push({ amount: bonus, source: 'time_bonus', label: 'Time Bonus' });
      await xpSys.add(bonus, 'time_bonus');
    }
  }

  if (ds.isReady) {
    // Submit score
    ds.submitScore(activeMapId, Math.round(timeSec * 1000)).catch(() => {});

    // Upload ghost
    if (isPB) ghostSys.upload(activeMapId, timeSec).catch(() => {});

    // Grant knife skin
    const knifeId = activeMap.knifeId;
    if (knifeId) {
      const granted = await knifeInst.grant(knifeId);
      if (granted) {
        const owned = await ds.getUnlocks().catch(() => []);
        const knifeCount = owned.filter(u => u.item_type === 'knife').length;
        achieve.onKnifeUnlock(knifeCount);
      }
    }

    // Achievement + challenge
    achieve.onMapFinish(activeMapId, timeSec);
    const chResults = await challenge.checkMapFinish(activeMapId, timeSec);
    if (chResults.daily) {
      achieve.onDailyComplete();
      xpGains.push({ amount: 100, source: 'daily_challenge', label: 'Daily Challenge' });
      await xpSys.awardDailyChallenge();
    }
    if (chResults.weekly) {
      achieve.onWeeklyComplete();
      xpGains.push({ amount: 500, source: 'weekly_challenge', label: 'Weekly Challenge' });
      await xpSys.awardWeeklyChallenge();
    }
  }

  // Show reward screen after 1.5s — solo mode only (online waits for round end)
  if (_mode === 'solo') {
    setTimeout(() => {
      rewardScr.show({
        xpGains, xpSystem: xpSys, oldLevel, oldXP,
        unlocks: _pendingUnlocks.splice(0),
      });
      _pendingUnlocks.length = 0;
    }, 1600);
  } else {
    _pendingUnlocks.length = 0; // clear so they don't pile up
  }

  _updateXPHud();
  setTimeout(() => { if (finishBanner) finishBanner.style.display = 'none'; }, 6000);
}

// Pending unlocks collected by xpSys.onLevelUp before reward screen shows
const _pendingUnlocks = [];

// ── XP HUD ─────────────────────────────────────────────────────────────────────
const xpHudEl     = document.getElementById('xp-hud');
const xpFillEl    = document.getElementById('xp-bar-fill');
const xpLabelEl   = document.getElementById('xp-label');
const xpLevelBadge = document.getElementById('xp-level-badge');
const xpTitleEl   = document.getElementById('xp-title');

// ── Mini stat bar ──────────────────────────────────────────────────────────────
const miniStatsEl = document.getElementById('mini-stats');
const msKdEl      = document.getElementById('ms-kd');
const msMapsEl    = document.getElementById('ms-maps');
const msTopEl     = document.getElementById('ms-top');
const msXpEl      = document.getElementById('ms-xp');
const speedReadEl = document.getElementById('speed-readout');

function _updateMiniStats() {
  if (!miniStatsEl) return;
  miniStatsEl.style.display = 'flex';
  const m = statTrack.renderMiniHUD();
  if (msKdEl   && m[0]) msKdEl.textContent   = m[0].value;
  if (msMapsEl && m[1]) msMapsEl.textContent  = m[1].value;
  if (msTopEl  && m[2]) msTopEl.textContent   = m[2].value;
  if (msXpEl   && m[3]) msXpEl.textContent    = m[3].value;
}

let _lastSpeedUpdate = 0;
function _updateSpeedReadout(hSpeed) {
  if (!speedReadEl) return;
  const now = performance.now();
  if (now - _lastSpeedUpdate < 66) return; // ~15 fps throttle
  _lastSpeedUpdate = now;
  if (hSpeed < 50) { speedReadEl.textContent = ''; return; }
  speedReadEl.textContent = `${hSpeed | 0} u/s`;
  const t = Math.min(1, (hSpeed - 200) / 1200);
  const r = Math.round(0   + t * 255);
  const g = Math.round(207 - t * 150);
  const b = Math.round(255 - t * 200);
  speedReadEl.style.color = `rgb(${r},${g},${b})`;
}

function _updateXPHud() {
  if (!xpHudEl) return;
  xpHudEl.style.display = 'block';
  const pct = Math.min(100, (xpSys.xp / xpSys.xpNeeded) * 100).toFixed(1);
  if (xpFillEl)     xpFillEl.style.width     = `${pct}%`;
  if (xpLabelEl)    xpLabelEl.textContent     = `${xpSys.xp} / ${xpSys.xpNeeded} XP`;
  if (xpLevelBadge) xpLevelBadge.textContent  = `Lv ${xpSys.level}`;
  if (xpTitleEl)    xpTitleEl.textContent      = xpSys.title.toUpperCase();
  _updateMiniStats();
}

function _showLevelUp(oldLevel, newLevel, unlocks) {
  const toastEl  = document.getElementById('levelup-toast');
  const numEl    = document.getElementById('levelup-num');
  const titleEl  = document.getElementById('levelup-title');
  if (!toastEl) return;
  if (numEl)   numEl.textContent  = `${oldLevel} → ${newLevel}`;
  if (titleEl) titleEl.textContent = xpSys.title.toUpperCase();
  toastEl.style.display = 'block';
  toastEl.style.animation = 'none';
  void toastEl.offsetWidth; // reflow
  toastEl.style.animation = 'slideInRight 0.4s ease, fadeOut 0.5s 2.8s forwards';
  setTimeout(() => { toastEl.style.display = 'none'; }, 3400);
  // Queue unlocks for reward screen
  if (unlocks?.length) _pendingUnlocks.push(...unlocks);
  // Grant knife types from level rewards
  for (const u of (unlocks ?? [])) {
    if (u.type === 'knife_type') knifeInst.grantType(u.id);
  }
  sound.playLevelUp();
}

// Hook XP system events
xpSys.onLevelUp = (oldLevel, newLevel, unlocks) => {
  _showLevelUp(oldLevel, newLevel, unlocks);
  _updateXPHud();
};
xpSys.onXPGain = (amount) => { _updateXPHud(); statTrack.onXPEarned(amount ?? 0); };

// ── Map loading ────────────────────────────────────────────────────────────────
async function _loadMap(mapId) {
  activeMapId = mapId;
  bestRunSec  = null;
  _resetSplits();

  // Clear existing map geometry before loading new one
  _clearMap(renderer.scene);

  let world;
  if (mapId === 'map_01') {
    // Use original hand-crafted map for map_01
    collisionWorld = buildTestMap(renderer);
    activeMap = MAP01;
    // Restore default scene
    renderer.scene.background = new THREE.Color(0x0a1020);
    renderer.scene.fog = new THREE.Fog(0x0a1020, 800, 3000);
    world = collisionWorld;
  } else {
    // MapFactory handles both catalog maps and proc_ maps
    const result = MapFactory.build(mapId, renderer.scene);
    collisionWorld = result.collisionWorld;
    activeMap = result.mapDesc;
  }

  // Re-add camera if it was removed during scene clear
  if (!renderer.scene.getObjectById(renderer.camera.id)) {
    renderer.scene.add(renderer.camera);
  }

  // Set spawn position
  const spawnX = (activeMap.sectionBounds?.[0]?.outerX ?? 320) * -0.9;
  const spawnY = (activeMap.SPAWN_Y ?? 0) + 50;
  const spawnZ = 80;
  playerState.position.x = spawnX;
  playerState.position.y = spawnY;
  playerState.position.z = spawnZ;
  playerState.respawnPosition.x = spawnX;
  playerState.respawnPosition.y = spawnY;
  playerState.respawnPosition.z = spawnZ;
  Vec3.set(playerState.velocity, 0, 0, 0);
  input.yaw = Math.PI;

  // Load ghost for this map
  if (ds.isReady) {
    ghostSys.clearGhost();
    ghostSys.loadTopGhost(mapId).catch(() => {});
    ghostSys.startRecording();
  }

  _updateOnlineHud();
}

// ── Online lobby HUD helpers ───────────────────────────────────────────────────
function _createOnlineHud() {
  if (_onlineHudEl) return;
  const el = document.createElement('div');
  el.id = 'online-hud';
  el.style.cssText = `
    position:fixed; bottom:80px; left:50%; transform:translateX(-50%);
    display:none; align-items:center; gap:12px;
    background:rgba(0,0,0,0.75); border:1px solid #00cfff33;
    border-radius:20px; padding:6px 16px;
    font-family:monospace; font-size:11px; color:#888; z-index:500;
    pointer-events:auto;
  `;
  document.body.appendChild(el);
  _onlineHudEl = el;
}

function _updateOnlineHud() {
  if (!_onlineHudEl) return;
  if (_mode !== 'online') { _onlineHudEl.style.display = 'none'; return; }
  _onlineHudEl.style.display = 'flex';
  const s = _lobbyState;
  const secLeft = s ? Math.max(0, Math.ceil((s.nextRotateAt - Date.now()) / 1000)) : 0;
  const min = String(Math.floor(secLeft / 60)).padStart(2,'0');
  const sec = String(secLeft % 60).padStart(2,'0');
  const needed = s ? Math.ceil((s.playerCount || 1) * 0.51) : 1;
  const votes = s?.skipVotes ?? 0;
  _onlineHudEl.innerHTML = `
    <span style="color:#00cfff">ONLINE</span>
    <span>${s?.mapId?.replace('_',' ').toUpperCase() ?? '...'}</span>
    <span style="color:#555">|</span>
    <span>next map <b style="color:#fff">${min}:${sec}</b></span>
    <span style="color:#555">|</span>
    <button onclick="window._voteSkip()" style="
      background:transparent; border:1px solid #555; color:#888;
      padding:2px 8px; cursor:pointer; font-family:monospace; font-size:11px; border-radius:10px;
    ">skip ${votes}/${needed}</button>
  `;
}

window._voteSkip = () => { net.sendVoteSkip(); };

function _showMapChangeNotice(mapId) {
  const el = document.createElement('div');
  el.style.cssText = `
    position:fixed; top:40%; left:50%; transform:translate(-50%,-50%);
    background:rgba(0,0,0,0.9); border:1px solid #00cfff;
    color:#00cfff; font-family:monospace; font-size:18px; font-weight:bold;
    padding:20px 40px; border-radius:8px; z-index:9000; text-align:center;
    animation: fadeOut 0.4s 3s forwards;
  `;
  el.textContent = `MAP CHANGED: ${mapId.replace('_',' ').toUpperCase()}`;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 3500);
}

async function _joinOnline() {
  _mode = 'online';
  const mapId = _lobbyState?.mapId ?? 'map_01';
  await _loadMap(mapId);
  mainMenu.hide();
  _inGame = true;
  _updateOnlineHud();
  ngames.ping({ screen: 'in_game', mode: 'online', map: mapId });
  setTimeout(() => renderer.renderer.domElement.requestPointerLock?.(), 200);
}

// ── Main menu integration ─────────────────────────────────────────────────────
const mainMenu = new MainMenu(async (mapId) => {
  _mode = 'solo';
  await _loadMap(mapId);
  _inGame = true;
  ngames.ping({ screen: 'in_game', mode: 'solo', map: mapId });
  setTimeout(() => renderer.renderer.domElement.requestPointerLock?.(), 200);
}, input, net);
mainMenu.onJoinOnline    = _joinOnline;
mainMenu._xpSystem       = xpSys;
mainMenu._net            = net;   // gives _renderTab access to net.lobbyState
mainMenu.onOpenLoadout   = () => {
  mainMenu._tab = 'play'; // reset so re-show after loadout close doesn't re-trigger loadout
  mainMenu.hide();
  // Keep menuOpen = true so pointer lock cannot be (re)acquired inside loadout
  input.menuOpen = true;
  loadoutMenu.show();
  loadoutMenu.onClose = () => {
    input.menuOpen = false; // restore — mainMenu.show() will set it again immediately
    mainMenu.show();
  };
};

// ── Pause menu ────────────────────────────────────────────────────────────────
const pauseMenu = new PauseMenu(input, settings);
pauseMenu.onResume    = () => { renderer.renderer.domElement.requestPointerLock?.(); };
pauseMenu.onChangeMap = async (mapId) => {
  _mode = 'solo';
  await _loadMap(mapId);
  _inGame = true;
  setTimeout(() => renderer.renderer.domElement.requestPointerLock?.(), 200);
};
pauseMenu.onMainMenu  = () => {
  _inGame = false;
  ngames.ping({ screen: 'in_menu' });
  mainMenu.show();
};
pauseMenu._statTracker = statTrack;
pauseMenu._crosshair   = crosshair;
pauseMenu._radio       = radio;

// ── Network callbacks ──────────────────────────────────────────────────────────
net.onWelcome = (id, name) => {
  scoreboard.setLocalId(id);
  net.sendMeta(settings.name, settings.color);
};

net.onPeerUpdate  = (id, snap, t) => { ghosts.addSnapshot(id, snap, t ?? Date.now()); const _su = { id, hp: snap.hp }; if (snap.name) _su.name = snap.name; scoreboard.upsert(id, _su); };
net.onPeerLeave   = (id) => { ghosts.remove(id); scoreboard.remove(id); };
net.onDmg         = (targetId, _, hp) => { ghosts.setHp(targetId, hp); ghosts.flashHit(targetId); scoreboard.upsert(targetId, { hp }); };
net.onHurt        = (_dmg, hp) => {
  _setHp(hp); sound.playHurt();
  effects.hitFlash(hp <= 30 ? 1.2 : 0.7);
  if (hp <= 0) { _showDeath(); streakSys.onDeath(); statTrack.onDeath(); }
  else _flashDamage();
};
net.onKill        = (kill) => {
  killFeed.addKill(kill, net.id);
  if (kill.killerId === net.id) {
    sound.playKill();
    sessionKills++;
    achieve.onKill();
    challenge.checkKills(sessionKills).catch(() => {});
    xpSys.awardKill().then(() => _updateXPHud()).catch(() => {});
    streakSys.onKill();
    statTrack.onKill();
    effects.killFlash();
  }
  if (kill.victimId !== net.id) { ghosts.setHp(kill.victimId, 0); scoreboard.upsert(kill.victimId, { hp: 0, alive: false }); }
  scoreboard.upsert(kill.killerId, { kills: (scoreboard._players.get(kill.killerId)?.kills ?? 0) + 1 });
};
net.onRespawn = (hp) => {
  localAlive = true; _hideDeath(); _setHp(hp);
  const spawn = playerState.respawnPosition;
  playerState.position.x = spawn.x;
  playerState.position.y = spawn.y;
  playerState.position.z = spawn.z;
  Vec3.set(playerState.velocity, 0, 0, 0);
};
net.onHitConfirm  = () => { weapon.onHitConfirm(); sound.playHit(); statTrack.onHit(); };
net.onPlayerList  = (list) => { scoreboard.setLocalId(net.id); scoreboard.updateFromList(list); };
net.onChat        = (_, name, text) => { _addChatLine(name, text); sound.playChat(); };
net.onMetaUpdate  = (id, name, color) => { ghosts.setName(id, name); if (color) ghosts.setColor?.(id, color); scoreboard.upsert(id, { name }); };
net.onFinish      = ({ name, time }) => { killFeed.addKill({ killerName: name, victimName: _fmtTime(time), killerId: -1, victimId: -1 }, net.id); };
net.onLeaderboard = (list) => { scoreboard.updateLeaderboard(list); };
net.onLobbyState = (state) => {
  _lobbyState = state;
  _updateOnlineHud();
};
net.onMapChange = async (mapId, nextRotateAt) => {
  _lobbyState = { ..._lobbyState, mapId, nextRotateAt, skipVotes: 0 };
  if (_mode === 'online') {
    await _loadMap(mapId);
    setTimeout(() => renderer.renderer.domElement.requestPointerLock?.(), 200);
    _showMapChangeNotice(mapId);
  }
  _updateOnlineHud();
};
net.onRoundEnd = ({ winner, mapId, times }) => {
  if (_mode !== 'online') return;
  const el = document.createElement('div');
  el.style.cssText = `
    position:fixed; top:35%; left:50%; transform:translate(-50%,-50%);
    background:rgba(0,0,0,0.92); border:1px solid #ffd700;
    color:#ffd700; font-family:monospace; font-size:16px; font-weight:bold;
    padding:18px 36px; border-radius:8px; z-index:9100; text-align:center;
    animation: fadeOut 0.4s 5s forwards; min-width:280px;
  `;
  const fmt = t => { const m=Math.floor(t/60),s=Math.floor(t%60),ms=Math.round((t%1)*1000); return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}.${String(ms).padStart(3,'0')}`; };
  const topRows = times.slice(0, 5).map((e, i) =>
    `<div style="font-size:12px;color:${i===0?'#ffd700':'#aaa'};margin-top:4px">${i+1}. ${e.name}  ${fmt(e.time)}</div>`
  ).join('');
  el.innerHTML = `<div>ROUND OVER — ${mapId.replace('_',' ').toUpperCase()}</div>
    <div style="font-size:13px;color:#fff;margin-top:6px">WINNER: ${winner.name} (${fmt(winner.time)})</div>
    ${topRows}`;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 5500);
};
net.connect();

// Weapon (after net connected)
const weapon = new WeaponSystem(net, sound);

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
  setTimeout(() => div.remove(), 8700);
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

document.addEventListener('keydown', (e) => {
  if (e.code === 'KeyR' && !input.chatOpen && input.locked && !settings.isPanelOpen()) {
    weapon.reload(); sound.playReload();
  }
});

// ── Quick reset (mid-run restart) ─────────────────────────────────────────────
function _quickReset() {
  if (!collisionWorld || !_inGame) return;
  const spawnX = (activeMap.sectionBounds?.[0]?.outerX ?? 320) * -0.9;
  const spawnY = (activeMap.SPAWN_Y ?? 0) + 50;
  const spawnZ = 80;
  playerState.position.x = spawnX;
  playerState.position.y = spawnY;
  playerState.position.z = spawnZ;
  Vec3.set(playerState.velocity, 0, 0, 0);
  input.yaw = Math.PI;
  // Reset run timer
  runActive        = false;
  runStartTime     = null;
  currentRunSec    = null;
  _finishedThisRun = false;
  _resetSplits();
  // Restart ghost recording
  if (ds.isReady) ghostSys.startRecording();
  if (_resetHintEl) _resetHintEl.style.display = 'none';
  // Brief flash so the player knows it fired
  effects.hitFlash?.(0.3);
}

// ── Run timer ─────────────────────────────────────────────────────────────────
const TIMER_START_Z = 300;
let runStartTime  = null;
let runActive     = false;
let currentRunSec = null;
let _finishedThisRun = false;
const _resetHintEl = document.getElementById('quick-reset-hint');

function _updateRunTimer() {
  const pos = playerState.position;

  if (!runActive && pos.z > TIMER_START_Z && pos.y > (activeMap.SPAWN_Y ?? 0) - 100) {
    runActive        = true;
    runStartTime     = performance.now();
    currentRunSec    = 0;
    _finishedThisRun = false;
    _resetSplits();
    if (_resetHintEl) _resetHintEl.style.display = 'block';
    if (splitEl) splitEl.style.display = 'block';
    if (ds.isReady && !ghostSys.isRecording) ghostSys.startRecording();
  }

  if (runActive) {
    currentRunSec = (performance.now() - runStartTime) / 1000;
    _updateSplits(pos, currentRunSec);

    if (!_finishedThisRun &&
        pos.z > activeMap.FINISH_Z &&
        pos.y < (activeMap.FINISH_Y ?? -1000) + 80) {
      _finishedThisRun = true;
      ghostSys.stopRecording();
      _showFinish(currentRunSec);
      runActive = false;
      if (splitEl)      splitEl.style.display = 'none';
      if (_resetHintEl) _resetHintEl.style.display = 'none';
    }
  }

  if (pos.z < 100) {
    runActive = false; runStartTime = null; currentRunSec = null; _finishedThisRun = false;
    _resetSplits();
    if (splitEl) splitEl.style.display = 'none';
  }
}

// ── Footstep timing ────────────────────────────────────────────────────────────
let _lastStepTime = 0;
let _wasInAir     = false;

function _handleFootsteps(state) {
  const now = performance.now();
  const onGround = state.onGround;
  const hSpeed   = Vec3.lengthXZ(state.velocity);
  if (onGround && _wasInAir && hSpeed > 100) { sound.playLand(); effects.landStomp(hSpeed); _lastStepTime = now; }
  _wasInAir = !onGround && !state.onRamp;
  if (onGround && hSpeed > 30 && now - _lastStepTime > 380) { sound.playFootstep(); _lastStepTime = now; }
}

// ── Speed achievement check (throttled) ───────────────────────────────────────
let _lastAchieveSpeed = 0;
let _burstThresholds = [600, 900, 1200, 1600];
let _burstFired = new Set();
function _checkSpeedAchieves(hSpeed) {
  if (Math.abs(hSpeed - _lastAchieveSpeed) < 20) return;
  _lastAchieveSpeed = hSpeed;
  achieve.onSpeed(hSpeed);
  challenge.checkSpeed(hSpeed).catch(() => {});
  // Speed burst sound thresholds
  for (const t of _burstThresholds) {
    if (hSpeed >= t && !_burstFired.has(t)) {
      _burstFired.add(t);
      sound.playSpeedBurst();
      setTimeout(() => _burstFired.delete(t), 8000);
    }
  }
}

// ── Game init ─────────────────────────────────────────────────────────────────
// ── Loading splash helpers ─────────────────────────────────────────────────────
const _splashEl  = document.getElementById('loading-splash');
const _splashBar = document.getElementById('loading-bar');
const _splashTxt = document.getElementById('loading-text');
function _splashProgress(pct, text) {
  if (_splashBar) _splashBar.style.width = `${pct}%`;
  if (_splashTxt) _splashTxt.textContent = text;
}
function _hideSplash() {
  if (!_splashEl) return;
  _splashEl.style.opacity = '0';
  setTimeout(() => { _splashEl.style.display = 'none'; }, 650);
}

async function initGame() {
  _splashProgress(10, 'CONNECTING');
  // Register / login via DataService
  // Profile selection — always shown on launch (N Games crew profiles)
  const profileId = await settings.promptName();
  ngames.init(profileId);
  ngames.startPingLoop();
  ngames.ping({ screen: 'in_menu' });
  let playerName = settings.name ?? 'Player';

  // Register with server
  try {
    await ds.register(playerName);
    _splashProgress(30, 'LOADING PROFILE');
    // Load server settings
    const serverSettings = await ds.getSettings().catch(() => null);
    if (serverSettings) {
      if (serverSettings.sensitivity) { input.sensitivity = serverSettings.sensitivity; }
      if (serverSettings.fov)         { renderer.setFOV?.(serverSettings.fov); }
      if (serverSettings.volume)      { sound.setVolume(serverSettings.volume); }
    }
    _splashProgress(55, 'LOADING GAME DATA');
    // Load all game data in parallel
    await Promise.all([
      achieve.load(),
      knifeInst.load(),
      challenge.load(),
      xpSys.load(),
    ]);
    _updateXPHud();
  } catch (e) {
    console.warn('[DataService] Server unavailable, running offline:', e.message);
  }

  _splashProgress(100, 'READY');
  await new Promise(r => setTimeout(r, 300));

  // Show main menu — no map is loaded yet; player spawns only after picking one
  await mainMenu.show();
  _hideSplash();

  _createOnlineHud();
  requestAnimationFrame(gameLoop);
}

initGame();

// ── Game loop ──────────────────────────────────────────────────────────────────
let accumulator  = 0;
let lastTime     = performance.now();
let tickCount    = 0;
let netTickCount = 0;
let cameraRoll   = 0;
let _prevChatOpen  = false;
let _prevScoreOpen = false;

const NET_SEND_EVERY = 8;
function gameLoop(now) {
  requestAnimationFrame(gameLoop);
  sound.init();

  if (!collisionWorld) return;

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
    if (canShoot && inp.shoot) {
      weapon.tryFire(null, playerState.position, inp.yaw, inp.pitch);
      crosshair.onShoot();
      statTrack.onShot();
      effects.muzzleFlash(playerState.position);
    }
    if (canShoot && input.isFireHeld()) weapon.tryFire(null, playerState.position, inp.yaw, inp.pitch);

    // Ghost recording
    ghostSys.tick(TICK_INTERVAL, playerState.position, input.sample().yaw ?? 0);

    netTickCount++;
    if (netTickCount % NET_SEND_EVERY === 0) {
      net.sendSnapshot(playerState.position, playerState.velocity, inp.yaw, playerState.onRamp);
    }
  }

  _updateRunTimer();
  _tickDeath();

  // Speed achievements (every ~60 frames)
  if (tickCount % 60 === 0) {
    const hSpeed = Vec3.lengthXZ(playerState.velocity);
    _checkSpeedAchieves(hSpeed);
  }

  // Update online HUD timer every ~60 frames
  if (tickCount % 60 === 0 && _mode === 'online') _updateOnlineHud();

  // Chat / scoreboard
  const inp2 = input.sample();
  if (input.chatOpen  && !_prevChatOpen)  _openChat();
  if (!input.chatOpen && _prevChatOpen)   _closeChat();
  _prevChatOpen  = input.chatOpen;
  if (input.scoreboardOpen  && !_prevScoreOpen) scoreboard.show();
  if (!input.scoreboardOpen &&  _prevScoreOpen) scoreboard.hide();
  _prevScoreOpen = input.scoreboardOpen;

  // Subsystem ticks
  ghosts.tick();
  ghostSys.tickPlayback(dt);
  killFeed.tick();
  weapon.tick();
  knifeInst.tick(dt);
  sound.setWindSpeed(Vec3.lengthXZ(playerState.velocity));

  // Camera
  const hSpeed   = Vec3.lengthXZ(playerState.velocity);
  const tgtRoll  = (playerState.onRamp && playerState.surfaceNormal)
    ? -playerState.surfaceNormal.x * (Math.PI / 15) : 0;
  cameraRoll += (tgtRoll - cameraRoll) * 0.1;

  renderer.updateCamera(playerState.position, inp2.yaw, inp2.pitch, hSpeed, cameraRoll);
  renderer.updateVelocityArrow(playerState.position, playerState.velocity);
  renderer.setVignetteIntensity(Math.max(0, Math.min(1, (hSpeed - 400) / 800)));
  renderer.render();

  // ── Polish system ticks ─────────────────────────────────────────────────────
  _shakeOffset.x = 0; _shakeOffset.y = 0;
  effects.setSpeed(hSpeed);
  effects.tick(dt, _shakeOffset);

  // Weapon bob + screen shake combined offset
  weaponBob.tick(dt, hSpeed, playerState.onGround || playerState.onRamp, 0, 0);
  renderer.camera.position.x += _shakeOffset.x + weaponBob.offset.x;
  renderer.camera.position.y += _shakeOffset.y + weaponBob.offset.y;
  renderer.camera.rotation.x += weaponBob.offset.rx;
  renderer.camera.rotation.y += weaponBob.offset.ry;
  renderer.camera.rotation.z += weaponBob.offset.rz;

  trail.tick(dt, playerState.position, hSpeed, playerState.onRamp);
  crosshair.tick(dt);
  crosshair.setSpeed(hSpeed);
  statTrack.tickSpeed(hSpeed, dt);
  statTrack.tickTimePlayed(dt);
  if (tickCount % 120 === 0) streakSys.onSpeedMilestone(hSpeed);
  if (tickCount % 12  === 0) { _updateMiniStats(); _updateSpeedReadout(hSpeed); }

  debug.update(playerState, inp2, {
    playerCount: net.playerCount,
    connected:   net.connected,
    runTime:     currentRunSec,
    bestTime:    bestRunSec,
    hp:          localHp,
    ping:        net.pingMs,
    mapName:     activeMap.name ?? activeMapId,
    sectionZBounds: activeMap.sectionZBounds,
  });
}

// ── Expose debug handle ────────────────────────────────────────────────────────
window.__surf = { playerState, input, collisionWorld, net, weapon, sound, settings, ds, xpSys, knifeInst, loadoutMenu, effects, trail, streakSys, crosshair, statTrack };

function _esc(str)   { return String(str ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
function _fmtTime(t) {
  const ms=Math.floor((t%1)*1000), sec=Math.floor(t%60), min=Math.floor(t/60);
  const p=(n,w=2)=>String(n).padStart(w,'0');
  return `${p(min)}:${p(sec)}.${p(ms,3)}`;
}
