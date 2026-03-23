// Core type definitions for the Unison app.
export type Platform = 'spotify' | 'youtube' | 'soundcloud';

export interface Track {
  id: string;
  platform: Platform;
  platformTrackId: string;
  title: string;
  artist: string;
  album?: string;
  thumbnailUrl?: string;
  durationSeconds?: number;
  deepLinkUri: string;
  webFallbackUrl: string;
  addedAt: number;
  updatedAt: number;
}

export interface TagPreset {
  id: string;
  category: string;
  value: string;
  createdAt: number;
}

export interface Tag {
  id: string;
  trackId: string;
  category: string;
  value: string;
}

/**
 * A single tag filter criterion (category + value).
 * When used in a Playlist's filterTags array, AND semantics apply:
 * a track must match ALL tags in the array to appear in the playlist.
 */
export interface TagFilter {
  category: string;
  value: string;
}

/** Validates that a parsed JSON value is a valid TagFilter. */
export function isTagFilter(obj: unknown): obj is TagFilter {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    typeof (obj as TagFilter).category === 'string' &&
    typeof (obj as TagFilter).value === 'string'
  );
}

export interface Playlist {
  id: string;
  name: string;
  description?: string;
  /**
   * AND semantics — a track must match ALL tags in this array to appear
   * in the playlist. An empty array matches all tracks.
   */
  filterTags: TagFilter[];
  createdAt: number;
  updatedAt: number;
  trackCount?: number;
}

/** Search result wrapping a partial track (no id/addedAt until saved to library). */
export interface SearchResult {
  track: Omit<Track, 'id' | 'addedAt' | 'updatedAt'>;
  score?: number;
}

export interface UnifiedSearchResults {
  spotify: SearchResult[];
  youtube: SearchResult[];
  soundcloud: SearchResult[];
  isLoading: boolean;
  errors: Partial<Record<Platform, string>>;
}

export interface UpsertResult {
  track: Track;
  wasInserted: boolean;
}
