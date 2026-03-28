# SurfGame Project — Build State Memory

## Project Identity

- **Game Title:** CuunSurf (renamed from SURF)
- **package.json:** name="cuunsurf", version="1.0.0"
- **Repository:** E:\SurfGame (git, branch: master)

---

## Architecture Overview

- **Stack:** Node.js + Express backend, vanilla JS frontend (no framework)
- **Multiplayer:** Socket.io online lobby system
- **Rendering:** Canvas 2D
- **Audio:** Web Audio API + streaming radio

---

## N Games Network Integration

- **SDK file:** `public/ngames.js` — N Games Network SDK (external)
- **Wrapper:** `src/client/NGamesIntegration.js` — safely wraps NGame SDK
- **Profile selection screen** shown every launch; profiles: Keshawn, Sean, Dart, Amari
- `NGame.init()` called on profile select
- Presence pings sent every 45 seconds and on screen changes
- `NGame.submitSession()` called on every run finish
  - Score formula: `10000 / time * diff_multiplier`
- All 18 achievements mirrored to N Games with `cuunsurf_` prefix

---

## Game Features

### Player & Input
- **Q key** = quick reset mid-run (teleport to spawn, reset timer)

### XP / Progression
- Level-up notification changed to small bottom-right toast
- XP report screen (rewardScr) skipped in solo mode

### Radio System
- `RadioSystem.js` added with 8 stations:
  - Lofi, Groove Salad, Drone Zone, Beat Blender, Lush, Space Station, Suburbs of Goa, Off
- Radio tab added to Pause Menu

### Online Multiplayer
- Lobby: 10-minute rounds
- `roundTimes` tracked per player
- Winner broadcast on rotation end

### Map System
- `MapFactory._buildCurvedSection` added
- Curves present on maps: 01, 09, 17

---

## Completed Build Phases

- Phase 1: Core surf mechanics, player movement, basic map rendering
- Phase 2: Combat system, weapons, hit detection
- Phase 3: Multiplayer lobby, Socket.io integration
- AAA Polish pass: EffectsSystem, PlayerTrail, KillStreaks, CrosshairSystem, StatTracker, WeaponBob, sounds, loading splash, speed HUD
- Pause menu redesign: ESC pointer-lock fix, Change Map, Main Menu options
- Quick respawn + death hint system
- Pointer-lock capture fix: separate menu/game states, player spawns only on map select
- Radio stations, toast level-up, solo XP guard, respawn fix, curved maps, round-end winner, debug fixes
- N Games Network integration + CuunSurf rename + profile selection screen

---

## Key File Locations

| File | Purpose |
|------|---------|
| `public/ngames.js` | N Games Network SDK |
| `src/client/NGamesIntegration.js` | NGame SDK wrapper |
| `src/client/RadioSystem.js` | 8-station radio system |
| `package.json` | name=cuunsurf, version=1.0.0 |

---

## Deployment Config

- Dev server: `npm run dev` (nodemon)
- Production: `npm start`
- Default port: configured in server entry point
