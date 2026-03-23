// Shared in-memory SQLite mock extracted from dynamic-playlist-query.test.ts.
// Simulates expo-sqlite for testing DB CRUD without native runtime.

interface MockRows {
  tracks: Record<string, unknown>[];
  tags: Record<string, unknown>[];
  tag_presets: Record<string, unknown>[];
  playlists: Record<string, unknown>[];
}

export function createMockDb() {
  const rows: MockRows = {
    tracks: [],
    tags: [],
    tag_presets: [],
    playlists: [],
  };

  const db = {
    execAsync: jest.fn(),
    runSync: jest.fn((sql: string, params?: unknown[]) => {
      const p = params ?? [];
      if (sql.startsWith('INSERT OR IGNORE INTO tracks')) {
        const exists = rows.tracks.some(
          (r) => r.platform === p[1] && r.platform_track_id === p[2]
        );
        if (!exists) {
          rows.tracks.push({
            id: p[0], platform: p[1], platform_track_id: p[2],
            title: p[3], artist: p[4], album: p[5],
            thumbnail_url: p[6], duration_seconds: p[7],
            deep_link_uri: p[8], web_fallback_url: p[9],
            added_at: p[10], updated_at: p[11],
          });
        }
      } else if (sql.startsWith('INSERT INTO playlists')) {
        rows.playlists.push({
          id: p[0], name: p[1], description: p[2],
          filter_tags: p[3], created_at: p[4], updated_at: p[5],
        });
      } else if (sql.startsWith('INSERT') && sql.includes('tags') && !sql.includes('tag_presets')) {
        const exists = rows.tags.some(
          (r) => r.track_id === p[1] && r.category === p[2] && r.value === p[3]
        );
        if (exists) throw new Error('UNIQUE constraint failed');
        rows.tags.push({ id: p[0], track_id: p[1], category: p[2], value: p[3] });
      } else if (sql.startsWith('DELETE FROM tracks')) {
        rows.tracks = rows.tracks.filter((t) => t.id !== p[0]);
      } else if (sql.startsWith('DELETE FROM playlists')) {
        rows.playlists = rows.playlists.filter((pl) => pl.id !== p[0]);
      } else if (sql.startsWith('UPDATE playlists SET name')) {
        const playlist = rows.playlists.find((pl) => pl.id === p[p.length - 1]);
        if (playlist) {
          playlist.name = p[0];
          playlist.description = p[1];
          if (sql.includes('filter_tags')) {
            playlist.filter_tags = p[2];
            playlist.updated_at = p[3];
          } else {
            playlist.updated_at = p[2];
          }
        }
      } else if (sql.startsWith('UPDATE playlists SET updated_at')) {
        const playlist = rows.playlists.find((pl) => pl.id === p[1]);
        if (playlist) playlist.updated_at = p[0];
      }
    }),
    getFirstSync: jest.fn((sql: string, params?: unknown[]) => {
      const p = params ?? [];
      if (sql.includes('COUNT') && sql.includes('FROM tracks')) {
        const filtered = filterTracks(sql, p);
        return { count: filtered.length };
      }
      if (sql.includes('COUNT') && sql.includes('FROM tags')) {
        return { count: rows.tags.filter((t) => t.track_id === p[0]).length };
      }
      if (sql.includes('COUNT') && sql.includes('FROM tag_presets')) {
        return { count: rows.tag_presets.length };
      }
      if (sql.includes('FROM tracks WHERE id')) {
        return rows.tracks.find((t) => t.id === p[0]) ?? null;
      }
      if (sql.includes('FROM tracks WHERE platform')) {
        return rows.tracks.find(
          (t) => t.platform === p[0] && t.platform_track_id === p[1]
        ) ?? null;
      }
      if (sql.includes('FROM playlists WHERE id')) {
        return rows.playlists.find((pl) => pl.id === p[0]) ?? null;
      }
      if (sql.includes('PRAGMA user_version')) {
        return { user_version: 1 };
      }
      return null;
    }),
    getAllSync: jest.fn((sql: string, params?: unknown[]) => {
      const p = params ?? [];
      if (sql.includes('FROM playlists')) {
        return [...rows.playlists];
      }
      if (sql.includes('FROM tracks')) {
        return filterTracks(sql, p);
      }
      if (sql.includes('FROM tags WHERE track_id')) {
        return rows.tags.filter((t) => t.track_id === p[0]);
      }
      return [];
    }),
  };

  function filterTracks(sql: string, params: unknown[]): Record<string, unknown>[] {
    if (!sql.includes('IN (SELECT track_id')) {
      return [...rows.tracks];
    }
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

  return { db, rows };
}
