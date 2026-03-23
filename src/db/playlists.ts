// CRUD operations for the playlists table (dynamic filter-based playlists).
import { getDb, generateId } from './schema';
import { getTracksByTagFilter, getTrackCountByTagFilter } from './tracks';
import { isTagFilter } from '../types';
import type { Playlist, TagFilter, Track } from '../types';

function rowToPlaylist(row: Record<string, unknown>): Playlist {
  let filterTags: TagFilter[] = [];
  try {
    const parsed = JSON.parse(row.filter_tags as string);
    // Why: validate parsed JSON to guard against corrupted filter_tags producing broken SQL queries.
    if (Array.isArray(parsed) && parsed.every(isTagFilter)) {
      filterTags = parsed;
    }
  } catch {
    // Why: corrupted JSON falls back to empty filter (matches all tracks) rather than crashing.
    filterTags = [];
  }

  return {
    id: row.id as string,
    name: row.name as string,
    description: row.description as string | undefined,
    filterTags,
    createdAt: row.created_at as number,
    updatedAt: row.updated_at as number,
  };
}

export function createPlaylist(name: string, description?: string, filterTags: TagFilter[] = []): Playlist {
  const db = getDb();
  const id = generateId();
  const now = Date.now();

  try {
    db.runSync(
      'INSERT INTO playlists (id, name, description, filter_tags, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
      [id, name, description ?? null, JSON.stringify(filterTags), now, now]
    );
  } catch (e) {
    console.error('[DB_ERROR] Failed to create playlist:', e);
    throw e;
  }

  const trackCount = getTrackCountByTagFilter(filterTags);
  return { id, name, description, filterTags, createdAt: now, updatedAt: now, trackCount };
}

export function getPlaylists(): Playlist[] {
  const db = getDb();
  const rows = db.getAllSync<Record<string, unknown>>(
    'SELECT * FROM playlists ORDER BY updated_at DESC'
  );

  return rows.map((row) => {
    const playlist = rowToPlaylist(row);
    playlist.trackCount = getTrackCountByTagFilter(playlist.filterTags);
    return playlist;
  });
}

export function getPlaylistById(id: string): { playlist: Playlist; tracks: Track[] } | null {
  const db = getDb();
  const row = db.getFirstSync<Record<string, unknown>>(
    'SELECT * FROM playlists WHERE id = ?',
    [id]
  );

  if (!row) return null;

  const playlist = rowToPlaylist(row);
  const tracks = getTracksByTagFilter(playlist.filterTags);
  playlist.trackCount = tracks.length;

  return { playlist, tracks };
}

export function updatePlaylist(
  id: string,
  name: string,
  description?: string,
  filterTags?: TagFilter[]
): void {
  const db = getDb();
  const now = Date.now();

  try {
    if (filterTags !== undefined) {
      db.runSync(
        'UPDATE playlists SET name = ?, description = ?, filter_tags = ?, updated_at = ? WHERE id = ?',
        [name, description ?? null, JSON.stringify(filterTags), now, id]
      );
    } else {
      db.runSync(
        'UPDATE playlists SET name = ?, description = ?, updated_at = ? WHERE id = ?',
        [name, description ?? null, now, id]
      );
    }
  } catch (e) {
    console.error('[DB_ERROR] Failed to update playlist:', e);
    throw e;
  }
}

export function deletePlaylist(id: string): void {
  const db = getDb();
  try {
    db.runSync('DELETE FROM playlists WHERE id = ?', [id]);
  } catch (e) {
    console.error('[DB_ERROR] Failed to delete playlist:', e);
    throw e;
  }
}

export function touchPlaylist(id: string): void {
  const db = getDb();
  try {
    db.runSync('UPDATE playlists SET updated_at = ? WHERE id = ?', [Date.now(), id]);
  } catch (e) {
    console.error('[DB_ERROR] Failed to touch playlist:', e);
    throw e;
  }
}
