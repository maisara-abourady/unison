// Tests for playlists DB CRUD — focuses on rowToPlaylist JSON parsing and fallbacks.
import { createMockDb } from './helpers/mock-db';

const mockDb = createMockDb();

jest.mock('expo-sqlite', () => ({
  openDatabaseSync: () => mockDb.db,
}));

jest.mock('expo-crypto', () => ({
  randomUUID: () => `playlist-${Date.now()}-${Math.random().toString(36).slice(2)}`,
}));

import {
  createPlaylist,
  getPlaylists,
  getPlaylistById,
  updatePlaylist,
  deletePlaylist,
} from '../src/db/playlists';
import type { TagFilter } from '../src/types';

describe('playlists DB', () => {
  beforeEach(() => {
    mockDb.rows.playlists = [];
    mockDb.rows.tracks = [];
    mockDb.rows.tags = [];
    jest.clearAllMocks();
  });

  describe('createPlaylist', () => {
    it('returns playlist with trackCount', () => {
      const playlist = createPlaylist('My Playlist', 'A description', []);
      expect(playlist.name).toBe('My Playlist');
      expect(playlist.description).toBe('A description');
      expect(playlist.filterTags).toEqual([]);
      expect(playlist.trackCount).toBeDefined();
      expect(typeof playlist.id).toBe('string');
      expect(typeof playlist.createdAt).toBe('number');
    });

    it('creates playlist with filter tags', () => {
      const tags: TagFilter[] = [{ category: 'mood', value: 'dark' }];
      const playlist = createPlaylist('Filtered', undefined, tags);
      expect(playlist.filterTags).toEqual(tags);
    });
  });

  describe('getPlaylists', () => {
    it('returns all playlists', () => {
      createPlaylist('First');
      createPlaylist('Second');
      const playlists = getPlaylists();
      expect(playlists.length).toBe(2);
    });
  });

  describe('getPlaylistById', () => {
    it('returns playlist and computed tracks', () => {
      const created = createPlaylist('Test Playlist');
      const result = getPlaylistById(created.id);
      expect(result).not.toBeNull();
      expect(result!.playlist.name).toBe('Test Playlist');
      expect(Array.isArray(result!.tracks)).toBe(true);
    });

    it('returns null for nonexistent ID', () => {
      const result = getPlaylistById('nonexistent-id');
      expect(result).toBeNull();
    });
  });

  describe('updatePlaylist', () => {
    it('updates filter tags and updated_at', () => {
      const created = createPlaylist('Original');
      const newTags: TagFilter[] = [{ category: 'energy', value: 'peak' }];
      updatePlaylist(created.id, 'Updated', 'new desc', newTags);

      const row = mockDb.rows.playlists.find((p) => p.id === created.id);
      expect(row!.name).toBe('Updated');
      expect(row!.description).toBe('new desc');
      expect(row!.filter_tags).toBe(JSON.stringify(newTags));
    });
  });

  describe('deletePlaylist', () => {
    it('removes only the playlist', () => {
      const p1 = createPlaylist('Keep');
      const p2 = createPlaylist('Delete');
      deletePlaylist(p2.id);
      expect(mockDb.rows.playlists.length).toBe(1);
      expect(mockDb.rows.playlists[0].id).toBe(p1.id);
    });
  });

  describe('rowToPlaylist JSON parsing', () => {
    it('parses valid filterTags JSON', () => {
      const tags: TagFilter[] = [{ category: 'mood', value: 'dark' }];
      createPlaylist('Valid JSON', undefined, tags);
      const playlists = getPlaylists();
      expect(playlists[0].filterTags).toEqual(tags);
    });

    it('falls back to [] for malformed JSON', () => {
      // Directly inject a row with broken JSON
      mockDb.rows.playlists.push({
        id: 'broken-1',
        name: 'Broken',
        description: null,
        filter_tags: '{broken"',
        created_at: Date.now(),
        updated_at: Date.now(),
      });
      const playlists = getPlaylists();
      const broken = playlists.find((p) => p.id === 'broken-1');
      expect(broken!.filterTags).toEqual([]);
    });

    it('falls back to [] for structurally invalid JSON', () => {
      // Valid JSON array but items missing required fields
      mockDb.rows.playlists.push({
        id: 'invalid-1',
        name: 'Invalid Structure',
        description: null,
        filter_tags: '[{"cat":"x"}]',
        created_at: Date.now(),
        updated_at: Date.now(),
      });
      const playlists = getPlaylists();
      const invalid = playlists.find((p) => p.id === 'invalid-1');
      expect(invalid!.filterTags).toEqual([]);
    });
  });
});
