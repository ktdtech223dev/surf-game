/**
 * routes/scores.js — Leaderboard & personal best endpoints
 * GET  /api/scores?map_id=...               → { scores: [...], personal_best }
 * POST /api/scores  { map_id, time_ms }     → { rank, personal_best }
 */
import { Router } from 'express';
import { requireAuth } from '../auth.js';
import { stmts } from '../db.js';

const router = Router();

// Minimum valid run time per map category
const MIN_TIME_MS = 5_000; // 5 seconds

router.get('/scores', requireAuth, (req, res) => {
  const mapId = String(req.query.map_id || '').slice(0, 64);
  if (!mapId) return res.status(400).json({ error: 'map_id required' });

  const scores = stmts.topScores.all(mapId).map((row, i) => ({
    rank: i + 1,
    name: row.name,
    color: row.color,
    time_ms: row.time_ms,
    date: new Date(row.created_at * 1000).toISOString().slice(0, 10),
  }));

  const pb = stmts.personalBest.get(req.player.id, mapId);
  res.json({ scores, personal_best: pb?.time_ms ?? null });
});

router.post('/scores', requireAuth, (req, res) => {
  try {
    const mapId  = String(req.body.map_id  || '').slice(0, 64);
    const timeMs = parseInt(req.body.time_ms, 10);

    if (!mapId)               return res.status(400).json({ error: 'map_id required' });
    if (!isFinite(timeMs) || timeMs < MIN_TIME_MS)
      return res.status(400).json({ error: 'Invalid time' });

    stmts.insertScore.run(req.player.id, mapId, timeMs);

    // Compute rank
    const allBests = stmts.topScores.all(mapId);
    const rank = allBests.findIndex(r => r.name === req.player.name) + 1 || null;
    const pb   = stmts.personalBest.get(req.player.id, mapId);

    res.json({ rank, personal_best: pb?.time_ms ?? null });
  } catch (e) {
    console.error('[scores POST]', e.message);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
