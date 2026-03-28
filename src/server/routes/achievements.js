/**
 * routes/achievements.js — Achievement endpoints
 * GET  /api/achievements              → { achievements: [{ key, unlocked_at }] }
 * POST /api/achievements  { key }     → { unlocked: bool }
 */
import { Router } from 'express';
import { requireAuth } from '../auth.js';
import { stmts } from '../db.js';

const router = Router();

// All defined achievement keys — server authoritative
export const ACHIEVEMENT_DEFS = {
  // Speed milestones
  speed_500:    { name: 'Subsonic',     desc: 'Reach 500 u/s',                  icon: '⚡' },
  speed_800:    { name: 'Supersonic',   desc: 'Reach 800 u/s',                  icon: '🚀' },
  speed_1200:   { name: 'Hypersonic',   desc: 'Reach 1200 u/s',                 icon: '🌠' },
  // Map completions
  first_finish: { name: 'First Run',    desc: 'Complete any map',                icon: '🏁' },
  sub_60:       { name: 'Sub-60',       desc: 'Complete a map in under 60s',     icon: '⏱️' },
  sub_30:       { name: 'Sub-30',       desc: 'Complete a map in under 30s',     icon: '🕐' },
  // Social
  first_kill:   { name: 'First Blood',  desc: 'Get your first kill',             icon: '🔫' },
  kills_10:     { name: 'Sharpshooter', desc: 'Get 10 kills in any session',     icon: '🎯' },
  // Exploration
  beginner_all: { name: 'Beginner\'s Luck', desc: 'Complete all beginner maps', icon: '🌱' },
  inter_all:    { name: 'Intermediate', desc: 'Complete all intermediate maps',  icon: '🌿' },
  advanced_all: { name: 'Advanced',     desc: 'Complete all advanced maps',      icon: '🌲' },
  expert_all:   { name: 'Expert',       desc: 'Complete all expert maps',        icon: '🌳' },
  // Ghost
  ghost_top:    { name: 'Ghost Buster', desc: 'Beat the world record ghost',     icon: '👻' },
  // Daily/Weekly
  daily_done:   { name: 'Daily Grind',  desc: 'Complete a daily challenge',      icon: '📅' },
  weekly_done:  { name: 'Weekender',    desc: 'Complete a weekly challenge',     icon: '📆' },
  // Knife collection
  knife_5:      { name: 'Collector',    desc: 'Unlock 5 knives',                 icon: '🗡️' },
  knife_16:     { name: 'Arsenal',      desc: 'Unlock 16 knives',                icon: '⚔️' },
  knife_all:    { name: 'Cutlery Set',  desc: 'Unlock all 32 completion knives', icon: '🏆' },
};

router.get('/achievements', requireAuth, (req, res) => {
  const rows = stmts.getAchievements.all(req.player.id);
  const map  = Object.fromEntries(rows.map(r => [r.key, r.unlocked_at]));

  const achievements = Object.entries(ACHIEVEMENT_DEFS).map(([key, def]) => ({
    key,
    ...def,
    unlocked:    key in map,
    unlocked_at: map[key] ?? null,
  }));

  res.json({ achievements });
});

router.post('/achievements', requireAuth, (req, res) => {
  try {
    const { key } = req.body;
    if (!key || !(key in ACHIEVEMENT_DEFS))
      return res.status(400).json({ error: 'Unknown achievement key' });

    const result = stmts.insertAchievement.run(req.player.id, key);
    res.json({ unlocked: result.changes > 0 });
  } catch (e) {
    console.error('[achievements POST]', e.message);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
