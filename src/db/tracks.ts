// CRUD operations for the tracks table.
import { getDb, generateId } from './schema';
import type { Track, TagFilter, UpsertResult } from '../types';

function rowToTrack(row: Record<string, unknown>): Track {
  return {
    id: row.id as string,
    platform: row.platform as Track['platform'],
    platformTrackId: row.platform_track_id as string,
    title: row.title as string,
    artist: (row.artist as string) ?? '',
    album: row.album as string | undefined,
    thumbnailUrl: row.thumbnail_url as string | undefined,
    durationSeconds: row.duration_seconds as number | undefined,
    deepLinkUri: row.deep_link_uri as string,
    webFallbackUrl: row.web_fallback_url as string,
    addedAt: row.added_at as number,
    updatedAt: row.updated_at as number,
  };
}

/** Insert a track or return the existing one. Uses INSERT OR IGNORE for atomicity. */
export function upsertTrack(track: Omit<Track, 'id' | 'addedAt' | 'updatedAt'>): UpsertResult {
  const db = getDb();
  const now = Date.now();
  const id = generateId();

  try {
    db.runSync(
      `INSERT OR IGNORE INTO tracks (id, platform, platform_track_id, title, artist, album, thumbnail_url, duration_seconds, deep_link_uri, web_fallback_url, added_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, track.platform, track.platformTrackId, track.title, track.artist, track.album ?? null, track.thumbnailUrl ?? null, track.durationSeconds ?? null, track.deepLinkUri, track.webFallbackUrl, now, now]
    );
  } catch (e) {
    console.error('[DB_ERROR] Failed to upsert track:', e);
    throw e;
  }

  // Why: INSERT OR IGNORE silently skips on conflict. Check if our ID was actually inserted
  // or if the track already existed with a different ID.
  const existing = db.getFirstSync<Record<string, unknown>>(
    'SELECT * FROM tracks WHERE platform = ? AND platform_track_id = ?',
    [track.platform, track.platformTrackId]
  );

  if (!existing) {
    // Should not happen — either our insert succeeded or a prior row exists.
    throw new Error(`Track not found after upsert: ${track.platform}:${track.platformTrackId}`);
  }

  const wasInserted = (existing.id as string) === id;
  return { track: rowToTrack(existing), wasInserted };
}

export function getTrack(id: string): Track | null {
  const db = getDb();
  const row = db.getFirstSync<Record<string, unknown>>(
    'SELECT * FROM tracks WHERE id = ?',
    [id]
  );
  return row ? rowToTrack(row) : null;
}

export function getAllTracks(): Track[] {
  const db = getDb();
  const rows = db.getAllSync<Record<string, unknown>>(
    'SELECT * FROM tracks ORDER BY added_at DESC'
  );
  return rows.map(rowToTrack);
}

export function deleteTrack(id: string): void {
  const db = getDb();
  try {
    db.runSync('DELETE FROM tracks WHERE id = ?', [id]);
  } catch (e) {
    console.error('[DB_ERROR] Failed to delete track:', e);
    throw e;
  }
}

/** Check if a track with this platform+platformTrackId already exists in the library. */
export function isTrackInLibrary(platform: string, platformTrackId: string): boolean {
  const db = getDb();
  const row = db.getFirstSync<{ count: number }>(
    'SELECT COUNT(*) as count FROM tracks WHERE platform = ? AND platform_track_id = ?',
    [platform, platformTrackId]
  );
  return (row?.count ?? 0) > 0;
}

/**
 * Query tracks matching ALL filter tags (AND semantics).
 * A track must have every tag in filterTags to be included.
 * Empty filterTags returns all tracks.
 */
export function getTracksByTagFilter(filterTags: TagFilter[]): Track[] {
  const db = getDb();

  if (filterTags.length === 0) {
    return getAllTracks();
  }

  let query = 'SELECT DISTINCT t.* FROM tracks t WHERE 1=1';
  const params: string[] = [];

  for (const tag of filterTags) {
    query += ' AND t.id IN (SELECT track_id FROM tags WHERE category = ? AND value = ?)';
    params.push(tag.category, tag.value);
  }

  query += ' ORDER BY t.artist, t.title';

  const rows = db.getAllSync<Record<string, unknown>>(query, params);
  return rows.map(rowToTrack);
}

export function getTrackCountByTagFilter(filterTags: TagFilter[]): number {
  const db = getDb();

  if (filterTags.length === 0) {
    const result = db.getFirstSync<{ count: number }>('SELECT COUNT(*) as count FROM tracks');
    return result?.count ?? 0;
  }

  let query = 'SELECT COUNT(DISTINCT t.id) as count FROM tracks t WHERE 1=1';
  const params: string[] = [];

  for (const tag of filterTags) {
    query += ' AND t.id IN (SELECT track_id FROM tags WHERE category = ? AND value = ?)';
    params.push(tag.category, tag.value);
  }

  const result = db.getFirstSync<{ count: number }>(query, params);
  return result?.count ?? 0;
}
