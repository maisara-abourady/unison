// CRUD operations for the tags table (applied tags on tracks).
import { getDb, generateId } from './schema';
import type { Tag, TagFilter } from '../types';

function rowToTag(row: Record<string, unknown>): Tag {
  return {
    id: row.id as string,
    trackId: row.track_id as string,
    category: row.category as string,
    value: row.value as string,
  };
}

export function applyTag(trackId: string, category: string, value: string): Tag | null {
  const db = getDb();
  const id = generateId();

  try {
    db.runSync(
      'INSERT INTO tags (id, track_id, category, value) VALUES (?, ?, ?, ?)',
      [id, trackId, category, value]
    );
    return { id, trackId, category, value };
  } catch {
    // Why: unique constraint violation means tag already exists — this is expected and not an error.
    return null;
  }
}

export function removeTag(trackId: string, category: string, value: string): void {
  const db = getDb();
  try {
    db.runSync(
      'DELETE FROM tags WHERE track_id = ? AND category = ? AND value = ?',
      [trackId, category, value]
    );
  } catch (e) {
    console.error('[DB_ERROR] Failed to remove tag:', e);
    throw e;
  }
}

export function getTagsForTrack(trackId: string): Tag[] {
  const db = getDb();
  const rows = db.getAllSync<Record<string, unknown>>(
    'SELECT * FROM tags WHERE track_id = ? ORDER BY category, value',
    [trackId]
  );
  return rows.map(rowToTag);
}

export function isTagApplied(trackId: string, category: string, value: string): boolean {
  const db = getDb();
  const row = db.getFirstSync<{ count: number }>(
    'SELECT COUNT(*) as count FROM tags WHERE track_id = ? AND category = ? AND value = ?',
    [trackId, category, value]
  );
  return (row?.count ?? 0) > 0;
}

export function applyFilterTagsToTrack(trackId: string, filterTags: TagFilter[]): void {
  for (const tag of filterTags) {
    applyTag(trackId, tag.category, tag.value);
  }
}

export function removeFilterTagsFromTrack(trackId: string, filterTags: TagFilter[]): void {
  for (const tag of filterTags) {
    removeTag(trackId, tag.category, tag.value);
  }
}

export function getTagCountForTrack(trackId: string): number {
  const db = getDb();
  const row = db.getFirstSync<{ count: number }>(
    'SELECT COUNT(*) as count FROM tags WHERE track_id = ?',
    [trackId]
  );
  return row?.count ?? 0;
}
