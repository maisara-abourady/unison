// CRUD operations for the tag_presets table (user's tag vocabulary).
import { getDb, generateId } from './schema';
import type { TagPreset } from '../types';

function rowToPreset(row: Record<string, unknown>): TagPreset {
  return {
    id: row.id as string,
    category: row.category as string,
    value: row.value as string,
    createdAt: row.created_at as number,
  };
}

export function getAllPresets(): TagPreset[] {
  const db = getDb();
  const rows = db.getAllSync<Record<string, unknown>>(
    'SELECT * FROM tag_presets ORDER BY category, created_at'
  );
  return rows.map(rowToPreset);
}

export function getPresetsGrouped(): Record<string, string[]> {
  const presets = getAllPresets();
  const grouped: Record<string, string[]> = {};

  for (const preset of presets) {
    if (!grouped[preset.category]) {
      grouped[preset.category] = [];
    }
    grouped[preset.category].push(preset.value);
  }

  return grouped;
}

export function addPreset(category: string, value: string): TagPreset | null {
  const db = getDb();
  const id = generateId();
  const now = Date.now();
  const normalizedCategory = category.toLowerCase().trim();
  const normalizedValue = value.toLowerCase().trim();

  if (!normalizedCategory || !normalizedValue) return null;

  try {
    db.runSync(
      'INSERT INTO tag_presets (id, category, value, created_at) VALUES (?, ?, ?, ?)',
      [id, normalizedCategory, normalizedValue, now]
    );
    return { id, category: normalizedCategory, value: normalizedValue, createdAt: now };
  } catch {
    // Why: unique constraint violation means this category+value already exists — idempotent, not an error.
    return null;
  }
}

export function deletePreset(id: string): void {
  const db = getDb();
  try {
    db.runSync('DELETE FROM tag_presets WHERE id = ?', [id]);
  } catch (e) {
    console.error('[DB_ERROR] Failed to delete preset:', e);
    throw e;
  }
}

export function deleteCategory(category: string): void {
  const db = getDb();
  try {
    db.runSync('DELETE FROM tag_presets WHERE category = ?', [category]);
  } catch (e) {
    console.error('[DB_ERROR] Failed to delete category:', e);
    throw e;
  }
}

export function getPresetsByCategory(category: string): TagPreset[] {
  const db = getDb();
  const rows = db.getAllSync<Record<string, unknown>>(
    'SELECT * FROM tag_presets WHERE category = ? ORDER BY created_at',
    [category]
  );
  return rows.map(rowToPreset);
}
