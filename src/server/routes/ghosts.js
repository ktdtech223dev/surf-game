/**
 * routes/ghosts.js — Ghost replay endpoints
 * GET  /api/ghosts?map_id=...         → { ghost: { id, player_name, time_ms } | null }
 * POST /api/ghosts  { map_id, time_ms, data: base64 } → { id }
 * GET  /api/ghosts/:id/data           → binary blob (ArrayBuffer)
 */
import { Router } from 'express';
import { requireAuth } from '../auth.js';
import { stmts, transaction } from '../db.js';

const router = Router();

const MAX_GHOST_BYTES = 2 * 1024 * 1024; // 2 MB max ghost

router.get('/ghosts', requireAuth, (req, res) => {
  const mapId = String(req.query.map_id || '').slice(0, 64);
  if (!mapId) return res.status(400).json({ error: 'map_id required' });

  const g = stmts.topGhost.get(mapId);
  if (!g) return res.json({ ghost: null });

  res.json({
    ghost: {
      id:          g.id,
      player_name: g.name,
      player_color:g.color,
      time_ms:     g.time_ms,
    },
  });
});

router.post('/ghosts', requireAuth, (req, res) => {
  try {
    const mapId  = String(req.body.map_id  || '').slice(0, 64);
    const timeMs = parseInt(req.body.time_ms, 10);
    const b64    = req.body.data;

    if (!mapId)              return res.status(400).json({ error: 'map_id required' });
    if (!isFinite(timeMs) || timeMs < 5000)
      return res.status(400).json({ error: 'Invalid time' });
    if (typeof b64 !== 'string')
      return res.status(400).json({ error: 'data required' });

    const buf = Buffer.from(b64, 'base64');
    if (buf.length > MAX_GHOST_BYTES)
      return res.status(413).json({ error: 'Ghost too large' });

    const { id, replaced } = transaction(() => {
      const existing = stmts.playerBestGhost.get(req.player.id, mapId);
      if (existing && existing.time_ms <= timeMs) {
        return { id: existing.id, replaced: false };
      }
      if (existing) stmts.deleteGhost.run(existing.id);
      const result = stmts.insertGhost.run(req.player.id, mapId, timeMs, buf);
      return { id: result.lastInsertRowid, replaced: !!existing };
    });
    res.json({ id, replaced });
  } catch (e) {
    console.error('[ghosts POST]', e.message);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/ghosts/:id/data', (req, res) => {
  try {
    const id  = parseInt(req.params.id, 10);
    const row = stmts.ghostData.get(id);
    if (!row) return res.status(404).json({ error: 'Not found' });

    res.set('Content-Type', 'application/octet-stream');
    res.set('Cache-Control', 'public, max-age=3600');
    res.send(row.data);
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
