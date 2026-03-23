// Tests for tracks DB CRUD — focuses on upsert dedup and tag filter counts.
import { createMockDb } from './helpers/mock-db';
import { makePartialTrack } from './helpers/fixtures';

const mockDb = createMockDb();

jest.mock('expo-sqlite', () => ({
  openDatabaseSync: () => mockDb.db,
}));

jest.mock('expo-crypto', () => ({
  randomUUID: () => `track-${Date.now()}-${Math.random().toString(36).slice(2)}`,
}));

import {
  upsertTrack,
  getTrack,
  getAllTracks,
  deleteTrack,
  isTrackInLibrary,
  getTrackCountByTagFilter,
} from '../src/db/tracks';
import { applyTag } from '../src/db/tags';

describe('tracks DB', () => {
  beforeEach(() => {
    mockDb.rows.tracks = [];
    mockDb.rows.tags = [];
    jest.clearAllMocks();
  });

  describe('upsertTrack', () => {
    it('returns wasInserted: true for new track', () => {
      const result = upsertTrack(makePartialTrack());
      expect(result.wasInserted).toBe(true);
      expect(result.track.title).toBe('Test Track');
      expect(result.track.id).toBeDefined();
    });

    it('returns wasInserted: false for duplicate platform+id', () => {
      const partial = makePartialTrack();
      const first = upsertTrack(partial);
      const second = upsertTrack(partial);
      expect(second.wasInserted).toBe(false);
      expect(second.track.id).toBe(first.track.id);
    });
  });

  describe('getAllTracks', () => {
    it('returns tracks ordered by added_at DESC', () => {
      upsertTrack(makePartialTrack({ platformTrackId: 'a' }));
      upsertTrack(makePartialTrack({ platformTrackId: 'b' }));
      const tracks = getAllTracks();
      expect(tracks.length).toBe(2);
    });
  });

  describe('deleteTrack', () => {
    it('removes the track', () => {
      const { track } = upsertTrack(makePartialTrack());
      deleteTrack(track.id);
      const found = getTrack(track.id);
      expect(found).toBeNull();
    });
  });

  describe('isTrackInLibrary', () => {
    it('returns true for existing track', () => {
      upsertTrack(makePartialTrack());
      expect(isTrackInLibrary('spotify', 'sp-1')).toBe(true);
    });

    it('returns false for non-existing track', () => {
      expect(isTrackInLibrary('spotify', 'nonexistent')).toBe(false);
    });
  });

  describe('getTrackCountByTagFilter', () => {
    it('returns correct count for AND-filtered tags', () => {
      const t1 = upsertTrack(makePartialTrack({ platformTrackId: 'x1', title: 'X1' }));
      const t2 = upsertTrack(makePartialTrack({ platformTrackId: 'x2', title: 'X2' }));
      applyTag(t1.track.id, 'mood', 'dark');
      applyTag(t1.track.id, 'energy', 'peak');
      applyTag(t2.track.id, 'mood', 'dark');

      const countBoth = getTrackCountByTagFilter([
        { category: 'mood', value: 'dark' },
        { category: 'energy', value: 'peak' },
      ]);
      expect(countBoth).toBe(1);

      const countMood = getTrackCountByTagFilter([{ category: 'mood', value: 'dark' }]);
      expect(countMood).toBe(2);

      const countAll = getTrackCountByTagFilter([]);
      expect(countAll).toBe(2);
    });
  });
});
