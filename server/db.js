const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', 'data', 'calories.db');

let db;

function getDb() {
  if (!db) {
    const fs = require('fs');
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    initSchema();
  }
  return db;
}

function initSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS goals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      calories INTEGER NOT NULL DEFAULT 2000,
      protein_g REAL NOT NULL DEFAULT 150,
      fat_g REAL NOT NULL DEFAULT 65,
      effective_date TEXT NOT NULL DEFAULT (date('now')),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS foods (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      brand TEXT,
      serving_size TEXT NOT NULL DEFAULT '100g',
      calories_per_serving INTEGER NOT NULL,
      protein_per_serving REAL NOT NULL DEFAULT 0,
      fat_per_serving REAL NOT NULL DEFAULT 0,
      is_custom INTEGER NOT NULL DEFAULT 0,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS daily_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      food_id INTEGER NOT NULL REFERENCES foods(id) ON DELETE CASCADE,
      date TEXT NOT NULL DEFAULT (date('now')),
      servings REAL NOT NULL DEFAULT 1,
      meal_type TEXT NOT NULL DEFAULT 'other'
        CHECK (meal_type IN ('breakfast','lunch','dinner','snack','other')),
      calories INTEGER NOT NULL,
      protein_g REAL NOT NULL,
      fat_g REAL NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_daily_entries_user_date
      ON daily_entries(user_id, date);

    CREATE INDEX IF NOT EXISTS idx_goals_user_date
      ON goals(user_id, effective_date);

    CREATE INDEX IF NOT EXISTS idx_foods_name
      ON foods(name);
  `);
}

function closeDb() {
  if (db) {
    db.close();
    db = null;
  }
}

module.exports = { getDb, closeDb };
