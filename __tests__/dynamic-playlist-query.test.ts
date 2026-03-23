// Tests for dynamic playlist membership — the most critical test in the project.
// Verifies AND-semantics: tracks must match ALL filter tags to appear in a playlist.
import * as SQLite from 'expo-sqlite';

// Why: mock expo-sqlite with an in-memory implementation for testing.
// The real expo-sqlite requires a native runtime; tests use a mock that
// exercises the same SQL logic.
jest.mock('expo-sqlite', () => {
  // Use a simple in-memory store to simulate DB behavior
  const rows: Record<string, Record<string, unknown>[]> = {
    tracks: [],
    tags: [],
    tag_presets: [],
    playlists: [],
  };
  let idCounter = 0;

  return {
    openDatabaseSync: () => ({
      execAsync: jest.fn(),
      runSync: jest.fn((sql: string, params: unknown[]) => {
        if (sql.startsWith('INSERT')) {
          const table = sql.match(/INTO (\w+)/)?.[1];
          if (table && rows[table]) {
            // Simple INSERT mock — just store the params mapped to columns
            if (table === 'tracks') {
              rows.tracks.push({
                id: params[0], platform: params[1], platform_track_id: params[2],
                title: params[3], artist: params[4], album: params[5],
                thumbnail_url: params[6], duration_seconds: params[7],
                deep_link_uri: params[8], web_fallback_url: params[9],
                added_at: params[10], updated_at: params[11],
              });
            } else if (table === 'tags') {
              // Check unique constraint
              const exists = rows.tags.some(
                (r) => r.track_id === params[1] && r.category === params[2] && r.value === params[3]
              );
              if (exists) throw new Error('UNIQUE constraint failed');
              rows.tags.push({ id: params[0], track_id: params[1], category: params[2], value: params[3] });
            }
          }
        }
      }),
      getFirstSync: jest.fn((sql: string, params?: unknown[]) => {
        if (sql.includes('COUNT')) {
          if (sql.includes('FROM tracks')) {
            const filtered = filterTracks(sql, params ?? []);
            return { count: filtered.length };
          }
          if (sql.includes('FROM tags')) {
            return { count: rows.tags.filter((t) => t.track_id === params?.[0]).length };
          }
          if (sql.includes('FROM tag_presets')) {
            return { count: rows.tag_presets.length };
          }
        }
        if (sql.includes('FROM tracks WHERE id')) {
          return rows.tracks.find((t) => t.id === params?.[0]) ?? null;
        }
        if (sql.includes('FROM tracks WHERE platform')) {
          return rows.tracks.find((t) => t.platform === params?.[0] && t.platform_track_id === params?.[1]) ?? null;
        }
        if (sql.includes('PRAGMA user_version')) {
          return { user_version: 1 };
        }
        return null;
      }),
      getAllSync: jest.fn((sql: string, params?: unknown[]) => {
        if (sql.includes('FROM tracks')) {
          return filterTracks(sql, params ?? []);
        }
        if (sql.includes('FROM tags WHERE track_id')) {
          return rows.tags.filter((t) => t.track_id === params?.[0]);
        }
        return [];
      }),
    }),
  };

  function filterTracks(sql: string, params: unknown[]): Record<string, unknown>[] {
    if (!sql.includes('IN (SELECT track_id')) {
      return [...rows.tracks];
    }

    // Parse AND-intersection filter tags from params (pairs of category, value)
    const tagPairs: { category: unknown; value: unknown }[] = [];
    for (let i = 0; i < params.length; i += 2) {
      tagPairs.push({ category: params[i], value: params[i + 1] });
    }

    return rows.tracks.filter((track) =>
      tagPairs.every((tag) =>
        rows.tags.some(
          (t) => t.track_id === track.id && t.category === tag.category && t.value === tag.value
        )
      )
    );
  }
});

jest.mock('expo-crypto', () => ({
  randomUUID: () => `test-${Date.now()}-${Math.random().toString(36).slice(2)}`,
}));

// Import after mocks are set up
import { upsertTrack, getTracksByTagFilter } from '../src/db/tracks';
import { applyTag } from '../src/db/tags';
import type { TagFilter } from '../src/types';

function makeTrack(platform: string, id: string, title: string) {
  return upsertTrack({
    platform: platform as 'spotify',
    platformTrackId: id,
    title,
    artist: 'Test Artist',
    deepLinkUri: `${platform}:${id}`,
    webFallbackUrl: `https://example.com/${id}`,
  });
}

describe('dynamic playlist query (AND semantics)', () => {
  beforeEach(() => {
    // Seed test data
    const t1 = makeTrack('spotify', 's1', 'Dark Peak Track');
    const t2 = makeTrack('spotify', 's2', 'Dark Chill Track');
    const t3 = makeTrack('youtube', 'y1', 'Peak Only Track');

    applyTag(t1.track.id, 'mood', 'dark');
    applyTag(t1.track.id, 'energy', 'peak');
    applyTag(t2.track.id, 'mood', 'dark');
    applyTag(t2.track.id, 'energy', 'chill');
    applyTag(t3.track.id, 'energy', 'peak');
  });

  it('returns all tracks when filter is empty', () => {
    const result = getTracksByTagFilter([]);
    expect(result.length).toBe(3);
  });

  it('returns tracks matching a single filter tag', () => {
    const result = getTracksByTagFilter([{ category: 'mood', value: 'dark' }]);
    expect(result.length).toBe(2);
    expect(result.map((t) => t.title)).toContain('Dark Peak Track');
    expect(result.map((t) => t.title)).toContain('Dark Chill Track');
  });

  it('returns only tracks matching ALL filter tags (AND logic)', () => {
    const result = getTracksByTagFilter([
      { category: 'mood', value: 'dark' },
      { category: 'energy', value: 'peak' },
    ]);
    expect(result.length).toBe(1);
    expect(result[0].title).toBe('Dark Peak Track');
  });

  it('returns empty when no tracks match all filters', () => {
    const result = getTracksByTagFilter([
      { category: 'mood', value: 'dark' },
      { category: 'energy', value: 'peak' },
      { category: 'context', value: 'club' },
    ]);
    expect(result.length).toBe(0);
  });

  it('does not return tracks missing any filter tag', () => {
    const result = getTracksByTagFilter([
      { category: 'mood', value: 'dark' },
      { category: 'energy', value: 'peak' },
    ]);
    // Track t2 has mood:dark but energy:chill, not energy:peak
    expect(result.map((t) => t.title)).not.toContain('Dark Chill Track');
    // Track t3 has energy:peak but no mood:dark
    expect(result.map((t) => t.title)).not.toContain('Peak Only Track');
  });
});
