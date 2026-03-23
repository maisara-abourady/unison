// Database schema, migration runner, and seed data for Unison.
import * as SQLite from 'expo-sqlite';
import * as Crypto from 'expo-crypto';
import type { AppError } from '../types/errors';

const CURRENT_SCHEMA_VERSION = 1;

let db: SQLite.SQLiteDatabase | null = null;

export function getDb(): SQLite.SQLiteDatabase {
  if (!db) {
    db = SQLite.openDatabaseSync('unison.db');
  }
  return db;
}

export function generateId(): string {
  return Crypto.randomUUID();
}

/**
 * Run all pending migrations sequentially.
 * Must be called and awaited before any screen renders.
 */
export async function runMigrations(): Promise<void> {
  const database = getDb();

  const result = database.getFirstSync<{ user_version: number }>('PRAGMA user_version');
  let version = result?.user_version ?? 0;

  if (version < 1) {
    await applyMigration1(database);
    version = 1;
  }

  // if (version < 2) { await applyMigration2(database); version = 2; }

  database.runSync(`PRAGMA user_version = ${CURRENT_SCHEMA_VERSION}`);
}

/** Migration 1: Initial schema — all four tables + indexes. */
async function applyMigration1(database: SQLite.SQLiteDatabase): Promise<void> {
  await database.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS tracks (
      id                 TEXT PRIMARY KEY,
      platform           TEXT NOT NULL,
      platform_track_id  TEXT NOT NULL,
      title              TEXT NOT NULL,
      artist             TEXT NOT NULL DEFAULT '',
      album              TEXT,
      thumbnail_url      TEXT,
      duration_seconds   INTEGER,
      deep_link_uri      TEXT NOT NULL,
      web_fallback_url   TEXT NOT NULL,
      added_at           INTEGER NOT NULL,
      updated_at         INTEGER NOT NULL,
      UNIQUE(platform, platform_track_id)
    );

    CREATE TABLE IF NOT EXISTS tag_presets (
      id          TEXT PRIMARY KEY,
      category    TEXT NOT NULL,
      value       TEXT NOT NULL,
      created_at  INTEGER NOT NULL,
      UNIQUE(category, value)
    );

    -- Why: tags has no FK to tag_presets by design. Deleting a preset leaves
    -- applied tags intact so tracks retain their tags and playlist membership.
    -- Orphaned tags still match playlist filters. The preset UI won't show them
    -- as selectable, but they remain visible on the track detail screen.
    CREATE TABLE IF NOT EXISTS tags (
      id        TEXT PRIMARY KEY,
      track_id  TEXT NOT NULL REFERENCES tracks(id) ON DELETE CASCADE,
      category  TEXT NOT NULL,
      value     TEXT NOT NULL,
      UNIQUE(track_id, category, value)
    );

    CREATE TABLE IF NOT EXISTS playlists (
      id           TEXT PRIMARY KEY,
      name         TEXT NOT NULL,
      description  TEXT,
      filter_tags  TEXT NOT NULL DEFAULT '[]',
      created_at   INTEGER NOT NULL,
      updated_at   INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_tags_track_id ON tags(track_id);
    CREATE INDEX IF NOT EXISTS idx_tags_category_value ON tags(category, value);
    CREATE INDEX IF NOT EXISTS idx_tracks_platform ON tracks(platform);
    CREATE INDEX IF NOT EXISTS idx_tracks_added_at ON tracks(added_at);
  `);
}

const DEFAULT_TAG_PRESETS: Record<string, string[]> = {
  energy: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'low', 'medium', 'high', 'peak'],
  mood: ['dark', 'melancholic', 'uplifting', 'euphoric', 'hypnotic', 'driving', 'dreamy', 'aggressive', 'chill', 'emotional', 'mysterious', 'joyful'],
  position: ['opener', 'warmup', 'builder', 'journey', 'peak', 'cooldown', 'closer'],
  vocals: ['none', 'male', 'female', 'chopped', 'spoken', 'ethereal', 'powerful'],
  elements: ['arp', 'piano', 'strings', 'pads', 'acid', 'ethnic', 'guitar', 'brass', 'synth', 'bass', 'percussion'],
  breakdown: ['minimal', 'melodic', 'dramatic', 'building', 'drop', 'none'],
  context: ['beach', 'club', 'festival', 'afters', 'sunset', 'sunrise', 'underground', 'mainstage'],
  genre: ['melodic-techno', 'melodic-house', 'progressive', 'afro-house', 'indie-dance', 'organic', 'deep', 'tech-house'],
};

/** Seed default tag presets on first launch. Idempotent — skips if presets exist. */
export function seedDefaultTagPresets(): void {
  const database = getDb();
  const now = Date.now();

  const existingCount = database.getFirstSync<{ count: number }>(
    'SELECT COUNT(*) as count FROM tag_presets'
  );

  if (existingCount && existingCount.count > 0) {
    return;
  }

  for (const [category, values] of Object.entries(DEFAULT_TAG_PRESETS)) {
    for (const value of values) {
      database.runSync(
        'INSERT OR IGNORE INTO tag_presets (id, category, value, created_at) VALUES (?, ?, ?, ?)',
        [generateId(), category, value, now]
      );
    }
  }
}
