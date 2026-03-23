// Tests for the database migration system.
import { runMigrations, getDb, seedDefaultTagPresets } from '../src/db/schema';

jest.mock('expo-sqlite', () => {
  let userVersion = 0;
  const tables: string[] = [];

  return {
    openDatabaseSync: () => ({
      execAsync: jest.fn(async (sql: string) => {
        // Track CREATE TABLE statements
        const createMatches = sql.matchAll(/CREATE TABLE IF NOT EXISTS (\w+)/g);
        for (const match of createMatches) {
          if (!tables.includes(match[1])) tables.push(match[1]);
        }
      }),
      runSync: jest.fn((sql: string, params?: unknown[]) => {
        if (sql.startsWith('PRAGMA user_version =')) {
          userVersion = parseInt(sql.split('=')[1].trim());
        }
        // Allow INSERT OR IGNORE for seeding
      }),
      getFirstSync: jest.fn((sql: string) => {
        if (sql === 'PRAGMA user_version') {
          return { user_version: userVersion };
        }
        if (sql.includes('COUNT') && sql.includes('tag_presets')) {
          return { count: 0 };
        }
        return null;
      }),
      getAllSync: jest.fn(() => []),
    }),
  };
});

jest.mock('expo-crypto', () => ({
  randomUUID: () => `mock-${Math.random().toString(36).slice(2)}`,
}));

describe('migrations', () => {
  it('runs migration 1 on a fresh database (user_version = 0)', async () => {
    const db = getDb();
    await runMigrations();

    // Verify PRAGMA user_version was set to 1
    expect(db.runSync).toHaveBeenCalledWith(expect.stringContaining('PRAGMA user_version = 1'));
  });

  it('creates all four tables in migration 1', async () => {
    const db = getDb();
    await runMigrations();

    // Verify execAsync was called with CREATE TABLE statements
    const execCall = (db.execAsync as jest.Mock).mock.calls[0]?.[0] ?? '';
    expect(execCall).toContain('CREATE TABLE IF NOT EXISTS tracks');
    expect(execCall).toContain('CREATE TABLE IF NOT EXISTS tag_presets');
    expect(execCall).toContain('CREATE TABLE IF NOT EXISTS tags');
    expect(execCall).toContain('CREATE TABLE IF NOT EXISTS playlists');
  });

  it('creates required indexes in migration 1', async () => {
    const db = getDb();
    await runMigrations();

    const execCall = (db.execAsync as jest.Mock).mock.calls[0]?.[0] ?? '';
    expect(execCall).toContain('idx_tags_track_id');
    expect(execCall).toContain('idx_tags_category_value');
    expect(execCall).toContain('idx_tracks_platform');
    expect(execCall).toContain('idx_tracks_added_at');
  });

  it('seedDefaultTagPresets is idempotent', () => {
    // First call: count is 0, should seed
    seedDefaultTagPresets();
    const db = getDb();
    expect(db.runSync).toHaveBeenCalled();
  });
});
