import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";

const DEFAULT_RELATIVE = path.join("data", "curator-reviews.sqlite");

let dbInstance: Database.Database | null = null;

export function getReviewDbPath(): string {
  return (
    process.env.CURATOR_REVIEW_DB_PATH ??
    path.join(process.cwd(), DEFAULT_RELATIVE)
  );
}

export function getReviewDb(): Database.Database {
  if (dbInstance) return dbInstance;

  const dbPath = getReviewDbPath();
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  const db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  migrateReviewDb(db);
  dbInstance = db;
  return db;
}

export function closeReviewDb(): void {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}

/** Use a temporary DB path (tests). Closes any open connection first. */
export function openReviewDbAt(dbPath: string): Database.Database {
  closeReviewDb();
  process.env.CURATOR_REVIEW_DB_PATH = dbPath;
  return getReviewDb();
}

export function migrateReviewDb(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id TEXT PRIMARY KEY,
      applied_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS passage_reviews (
      passage_id TEXT PRIMARY KEY,
      review_status TEXT NOT NULL,
      text_verified INTEGER NOT NULL DEFAULT 0,
      locator_verified INTEGER NOT NULL DEFAULT 0,
      voice_verified INTEGER NOT NULL DEFAULT 0,
      authorial_distance_verified INTEGER NOT NULL DEFAULT 0,
      source_relationship_verified INTEGER NOT NULL DEFAULT 0,
      fragment_meaning_verified INTEGER NOT NULL DEFAULT 0,
      issues_json TEXT NOT NULL DEFAULT '[]',
      reviewer_id TEXT,
      reviewer_name TEXT,
      reviewed_at TEXT,
      notes TEXT,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS fragment_reviews (
      fragment_id TEXT PRIMARY KEY,
      meaning_supported TEXT NOT NULL,
      overclaim_risk TEXT NOT NULL,
      notes TEXT,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS review_events (
      id TEXT PRIMARY KEY,
      target_type TEXT NOT NULL,
      target_id TEXT NOT NULL,
      action TEXT NOT NULL,
      actor_id TEXT NOT NULL,
      actor_name TEXT NOT NULL,
      actor_type TEXT NOT NULL,
      previous_state_json TEXT,
      next_state_json TEXT,
      timestamp TEXT NOT NULL,
      notes TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_review_events_target
      ON review_events(target_type, target_id, timestamp DESC);
  `);

  const applied = db
    .prepare(`SELECT id FROM schema_migrations WHERE id = ?`)
    .get("001_init");
  if (!applied) {
    db.prepare(
      `INSERT INTO schema_migrations (id, applied_at) VALUES (?, ?)`,
    ).run("001_init", new Date().toISOString());
  }
}
