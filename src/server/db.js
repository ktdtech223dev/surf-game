/**
 * db.js — SQLite database initialization via Node.js built-in node:sqlite
 * Available in Node 22.5+ (no native compilation required)
 */
import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'url';
import { dirname, join }  from 'path';
import { mkdirSync }      from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH   = join(__dirname, '../../data/surfgame.db');

mkdirSync(join(__dirname, '../../data'), { recursive: true });

export const db = new DatabaseSync(DB_PATH);

// WAL mode + foreign keys
db.exec('PRAGMA journal_mode = WAL');
db.exec('PRAGMA foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS players (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    name       TEXT    NOT NULL UNIQUE COLLATE NOCASE,
    color      TEXT    NOT NULL DEFAULT '#00cfff',
    skin       TEXT    NOT NULL DEFAULT 'default',
    knife      TEXT    NOT NULL DEFAULT 'default',
    weapon     TEXT    NOT NULL DEFAULT 'rifle',
    created_at INTEGER NOT NULL DEFAULT (unixepoch())
  );

  CREATE TABLE IF NOT EXISTS sessions (
    token      TEXT    PRIMARY KEY,
    player_id  INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    created_at INTEGER NOT NULL DEFAULT (unixepoch())
  );

  CREATE TABLE IF NOT EXISTS scores (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    player_id  INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    map_id     TEXT    NOT NULL,
    time_ms    INTEGER NOT NULL,
    created_at INTEGER NOT NULL DEFAULT (unixepoch())
  );

  CREATE INDEX IF NOT EXISTS idx_scores_map    ON scores(map_id, time_ms);
  CREATE INDEX IF NOT EXISTS idx_scores_player ON scores(player_id, map_id, time_ms);

  CREATE TABLE IF NOT EXISTS ghosts (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    player_id  INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    map_id     TEXT    NOT NULL,
    time_ms    INTEGER NOT NULL,
    data       BLOB    NOT NULL,
    created_at INTEGER NOT NULL DEFAULT (unixepoch())
  );

  CREATE INDEX IF NOT EXISTS idx_ghosts_map ON ghosts(map_id, time_ms);

  CREATE TABLE IF NOT EXISTS achievements (
    player_id    INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    key          TEXT    NOT NULL,
    unlocked_at  INTEGER NOT NULL DEFAULT (unixepoch()),
    PRIMARY KEY (player_id, key)
  );

  CREATE TABLE IF NOT EXISTS unlocks (
    player_id   INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    item_type   TEXT    NOT NULL,
    item_id     TEXT    NOT NULL,
    unlocked_at INTEGER NOT NULL DEFAULT (unixepoch()),
    PRIMARY KEY (player_id, item_type, item_id)
  );

  CREATE TABLE IF NOT EXISTS settings (
    player_id   INTEGER PRIMARY KEY REFERENCES players(id) ON DELETE CASCADE,
    sensitivity REAL    NOT NULL DEFAULT 0.002,
    fov         INTEGER NOT NULL DEFAULT 90,
    volume      REAL    NOT NULL DEFAULT 0.7,
    keybinds    TEXT    NOT NULL DEFAULT '{}'
  );

  CREATE TABLE IF NOT EXISTS challenge_completions (
    player_id    INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    challenge_id TEXT    NOT NULL,
    completed_at INTEGER NOT NULL DEFAULT (unixepoch()),
    PRIMARY KEY (player_id, challenge_id)
  );
`);

// ── Prepared statements ────────────────────────────────────────────────────────
export const stmts = {
  // Auth
  getSession:      db.prepare('SELECT player_id FROM sessions WHERE token = ?'),
  createSession:   db.prepare('INSERT INTO sessions (token, player_id) VALUES (?, ?)'),

  // Players
  getPlayer:       db.prepare('SELECT * FROM players WHERE id = ?'),
  getPlayerByName: db.prepare('SELECT * FROM players WHERE name = ? COLLATE NOCASE'),
  createPlayer:    db.prepare('INSERT INTO players (name) VALUES (?) RETURNING *'),
  updatePlayer:    db.prepare(`
    UPDATE players SET
      name   = COALESCE(:name,   name),
      color  = COALESCE(:color,  color),
      skin   = COALESCE(:skin,   skin),
      knife  = COALESCE(:knife,  knife),
      weapon = COALESCE(:weapon, weapon)
    WHERE id = :id
  `),

  // Scores
  insertScore:  db.prepare('INSERT INTO scores (player_id, map_id, time_ms) VALUES (?, ?, ?)'),
  topScores:    db.prepare(`
    SELECT s.time_ms, s.created_at, p.name, p.color
    FROM scores s JOIN players p ON p.id = s.player_id
    WHERE s.map_id = ?
    GROUP BY s.player_id HAVING s.time_ms = MIN(s.time_ms)
    ORDER BY s.time_ms ASC LIMIT 10
  `),
  personalBest: db.prepare(
    'SELECT MIN(time_ms) AS time_ms FROM scores WHERE player_id = ? AND map_id = ?'
  ),

  // Ghosts
  insertGhost:     db.prepare('INSERT INTO ghosts (player_id, map_id, time_ms, data) VALUES (?, ?, ?, ?)'),
  topGhost:        db.prepare(`
    SELECT g.id, g.time_ms, p.name AS name, p.color AS color
    FROM ghosts g JOIN players p ON p.id = g.player_id
    WHERE g.map_id = ? ORDER BY g.time_ms ASC LIMIT 1
  `),
  ghostData:       db.prepare('SELECT data FROM ghosts WHERE id = ?'),
  playerBestGhost: db.prepare(
    'SELECT id, time_ms FROM ghosts WHERE player_id = ? AND map_id = ? ORDER BY time_ms ASC LIMIT 1'
  ),
  deleteGhost:     db.prepare('DELETE FROM ghosts WHERE id = ?'),

  // Achievements
  getAchievements:   db.prepare('SELECT key, unlocked_at FROM achievements WHERE player_id = ?'),
  insertAchievement: db.prepare('INSERT OR IGNORE INTO achievements (player_id, key) VALUES (?, ?)'),

  // Unlocks
  getUnlocks:    db.prepare('SELECT item_type, item_id, unlocked_at FROM unlocks WHERE player_id = ?'),
  insertUnlock:  db.prepare('INSERT OR IGNORE INTO unlocks (player_id, item_type, item_id) VALUES (?, ?, ?)'),

  // Settings
  getSettings:    db.prepare('SELECT * FROM settings WHERE player_id = ?'),
  upsertSettings: db.prepare(`
    INSERT INTO settings (player_id, sensitivity, fov, volume, keybinds)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(player_id) DO UPDATE SET
      sensitivity = excluded.sensitivity,
      fov         = excluded.fov,
      volume      = excluded.volume,
      keybinds    = excluded.keybinds
  `),

  // Challenges
  getChallengeCompleted:  db.prepare(
    'SELECT 1 FROM challenge_completions WHERE player_id = ? AND challenge_id = ?'
  ),
  insertChallenge:        db.prepare(
    'INSERT OR IGNORE INTO challenge_completions (player_id, challenge_id) VALUES (?, ?)'
  ),
  getCompletedChallenges: db.prepare(
    'SELECT challenge_id, completed_at FROM challenge_completions WHERE player_id = ?'
  ),
};

// ── Transaction helper ─────────────────────────────────────────────────────────
export function transaction(fn) {
  db.exec('BEGIN');
  try {
    const result = fn();
    db.exec('COMMIT');
    return result;
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }
}

console.log('[DB] node:sqlite ready:', DB_PATH);
