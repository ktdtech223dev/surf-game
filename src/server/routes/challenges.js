/**
 * routes/challenges.js — Daily & weekly challenge endpoints
 * GET  /api/challenges/daily            → { challenge, completed }
 * GET  /api/challenges/weekly           → { challenge, completed }
 * POST /api/challenges/:id/complete     → { completed: bool }
 */
import { Router } from 'express';
import { requireAuth } from '../auth.js';
import { stmts } from '../db.js';

const router = Router();

// ── Seeded deterministic RNG (mulberry32) ─────────────────────────────────────
function mulberry32(seed) {
  return function () {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

function todaySeed() {
  const d = new Date();
  return parseInt(`${d.getUTCFullYear()}${String(d.getUTCMonth()+1).padStart(2,'0')}${String(d.getUTCDate()).padStart(2,'0')}`, 10);
}

function weekSeed() {
  const now  = Date.now();
  const ms   = now - (now % (7 * 86400000)); // floor to week
  return Math.floor(ms / 1000);
}

// Challenge templates
const CHALLENGE_TYPES = [
  { type: 'speed',    label: 'Reach {val} u/s on any map',      vals: [400, 500, 600, 700, 800] },
  { type: 'time',     label: 'Complete {map} in under {val}s',  vals: [90, 80, 70, 60] },
  { type: 'kills',    label: 'Get {val} kills in combat mode',   vals: [3, 5, 10] },
  { type: 'combo',    label: 'Complete {map} without touching ground for {val}s', vals: [5, 10, 15] },
  { type: 'map',      label: 'Complete map {map}',               vals: [1] },
];

const MAP_NAMES = [
  'Shoreline','Coastal','Basin','Inlet','Cove','Bay','Delta','Lagoon',
  'Gorge','Canyon','Ravine','Chasm','Abyss','Ridge','Summit','Peak',
  'Storm','Tempest','Gale','Squall','Cyclone','Vortex','Maelstrom','Typhoon',
  'Void','Null','Zenith','Apex','Omega','Sigma','Prime','Absolute',
];

function generateChallenge(seed, prefix) {
  const rng   = mulberry32(seed);
  const tIdx  = Math.floor(rng() * CHALLENGE_TYPES.length);
  const tmpl  = CHALLENGE_TYPES[tIdx];
  const val   = tmpl.vals[Math.floor(rng() * tmpl.vals.length)];
  const mapN  = MAP_NAMES[Math.floor(rng() * MAP_NAMES.length)];
  const mapId = `map_${String(MAP_NAMES.indexOf(mapN) + 1).padStart(2, '0')}`;

  const label = tmpl.label
    .replace('{val}', val)
    .replace('{map}', mapN);

  const id = `${prefix}_${seed}`;

  return { id, type: tmpl.type, label, val, map_id: mapId, map_name: mapN };
}

router.get('/challenges/daily', requireAuth, (req, res) => {
  const seed      = todaySeed();
  const challenge = generateChallenge(seed, 'daily');
  const done      = !!stmts.getChallengeCompleted.get(req.player.id, challenge.id);
  res.json({ challenge, completed: done });
});

router.get('/challenges/weekly', requireAuth, (req, res) => {
  const seed      = weekSeed();
  const challenge = generateChallenge(seed, 'weekly');
  const done      = !!stmts.getChallengeCompleted.get(req.player.id, challenge.id);
  res.json({ challenge, completed: done });
});

router.get('/challenges/all', requireAuth, (req, res) => {
  const rows = stmts.getCompletedChallenges.all(req.player.id);
  res.json({ completed: rows });
});

router.post('/challenges/:id/complete', requireAuth, (req, res) => {
  try {
    const challengeId = String(req.params.id).slice(0, 80);
    // Validate challenge id matches current daily or weekly
    const dailySeed  = todaySeed();
    const weeklySeed = weekSeed();
    const validIds   = [
      `daily_${dailySeed}`,
      `weekly_${weeklySeed}`,
    ];

    if (!validIds.includes(challengeId))
      return res.status(400).json({ error: 'Unknown or expired challenge' });

    const result = stmts.insertChallenge.run(req.player.id, challengeId);
    res.json({ completed: result.changes > 0 });
  } catch (e) {
    console.error('[challenges complete]', e.message);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
