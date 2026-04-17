const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'fohi_maxes.db');
let db;

function getDb() {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    initSchema();
  }
  return db;
}

function initSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS pods (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS players (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      last_name TEXT NOT NULL,
      first_name TEXT NOT NULL,
      grade INTEGER,
      student_id TEXT,
      pod_id INTEGER REFERENCES pods(id) ON DELETE SET NULL,
      username TEXT UNIQUE,
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      session_date TEXT NOT NULL,
      notes TEXT,
      created_by TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS lift_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id INTEGER NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
      player_id INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
      lift TEXT NOT NULL CHECK(lift IN ('squat','bench','deadlift','power_clean','military_press','high_pull')),
      weight REAL,
      reps INTEGER,
      one_rm REAL,
      UNIQUE(session_id, player_id, lift)
    );

    CREATE TABLE IF NOT EXISTS speed_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id INTEGER NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
      player_id INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
      dash_40 REAL,
      dash_10 REAL,
      shuttle REAL,
      broad_jump REAL,
      med_ball_throw REAL,
      UNIQUE(session_id, player_id)
    );

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      full_name TEXT,
      role TEXT DEFAULT 'player',
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);
  seedPods();
}

function seedPods() {
  const count = db.prepare('SELECT COUNT(*) as c FROM pods').get();
  if (count.c === 0) {
    const insert = db.prepare('INSERT OR IGNORE INTO pods (name) VALUES (?)');
    ['Able', 'Baker', 'Charlie', 'Delta'].forEach(name => insert.run(name));
  }
}

// Epley 1RM formula: weight * (1 + reps/30), round to nearest whole number
function calc1RM(weight, reps) {
  if (!weight || !reps || reps <= 0) return null;
  if (reps === 1) return Math.round(weight);
  return Math.round(weight * (1 + reps / 30));
}

module.exports = { getDb, calc1RM };
