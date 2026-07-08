import { app } from 'electron'
import Database from 'better-sqlite3'
import path from 'path'

const DB_VERSION = 1

let db: Database.Database

export function getDb(): Database.Database {
  if (!db) throw new Error('Database not initialized. Call initDatabase() first.')
  return db
}

export function initDatabase(): void {
  const dbPath = path.join(app.getPath('userData'), 'attendguard.db')
  db = new Database(dbPath)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')
  runMigrations(db)
}

function runMigrations(db: Database.Database): void {
  db.exec(`CREATE TABLE IF NOT EXISTS schema_version (version INTEGER NOT NULL);`)
  const row = db.prepare('SELECT version FROM schema_version').get() as { version: number } | undefined
  const current = row?.version ?? 0
  if (current < 1) {
    applyMigration1(db)
    if (current === 0) {
      db.prepare('INSERT INTO schema_version (version) VALUES (?)').run(DB_VERSION)
    } else {
      db.prepare('UPDATE schema_version SET version = ?').run(DB_VERSION)
    }
  }
}

function applyMigration1(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS semesters (
      id                INTEGER PRIMARY KEY AUTOINCREMENT,
      name              TEXT    NOT NULL,
      start_date        TEXT    NOT NULL,
      end_date          TEXT    NOT NULL,
      threshold         REAL    NOT NULL DEFAULT 75.0,
      state_code        TEXT    NOT NULL DEFAULT 'TN',
      is_active         INTEGER NOT NULL DEFAULT 0,
      use_credit_weight INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS courses (
      id                 INTEGER PRIMARY KEY AUTOINCREMENT,
      semester_id        INTEGER NOT NULL REFERENCES semesters(id) ON DELETE CASCADE,
      name               TEXT    NOT NULL,
      code               TEXT,
      credit_hours       REAL    DEFAULT 1.0,
      threshold_override REAL,
      color              TEXT    DEFAULT '#6366f1'
    );

    CREATE TABLE IF NOT EXISTS weekly_schedule (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      course_id   INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
      day_of_week INTEGER NOT NULL,
      start_time  TEXT    NOT NULL,
      end_time    TEXT    NOT NULL
    );

    CREATE TABLE IF NOT EXISTS holidays (
      id                INTEGER PRIMARY KEY AUTOINCREMENT,
      semester_id       INTEGER NOT NULL REFERENCES semesters(id) ON DELETE CASCADE,
      date              TEXT    NOT NULL,
      label             TEXT    NOT NULL,
      type              TEXT    NOT NULL CHECK(type IN ('public','break','university','custom')),
      is_auto_generated INTEGER NOT NULL DEFAULT 0,
      UNIQUE(semester_id, date, label)
    );

    CREATE TABLE IF NOT EXISTS attendance_records (
      id        INTEGER PRIMARY KEY AUTOINCREMENT,
      course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
      date      TEXT    NOT NULL,
      status    TEXT    NOT NULL CHECK(status IN ('attended','bunked','cancelled','holiday')),
      UNIQUE(course_id, date)
    );

    CREATE INDEX IF NOT EXISTS idx_courses_semester   ON courses(semester_id);
    CREATE INDEX IF NOT EXISTS idx_schedule_course    ON weekly_schedule(course_id);
    CREATE INDEX IF NOT EXISTS idx_holidays_semester  ON holidays(semester_id);
    CREATE INDEX IF NOT EXISTS idx_attendance_course  ON attendance_records(course_id);
    CREATE INDEX IF NOT EXISTS idx_attendance_date    ON attendance_records(date);
  `)
}
