// Tests for the library Zustand store — verifies store state transitions.
import { makePartialTrack, makeTrackFixture } from './helpers/fixtures';

jest.mock('../src/db/tracks', () => ({
  getAllTracks: jest.fn(),
  upsertTrack: jest.fn(),
  deleteTrack: jest.fn(),
  getTrack: jest.fn(),
  isTrackInLibrary: jest.fn(),
  getTracksByTagFilter: jest.fn(() => []),
  getTrackCountByTagFilter: jest.fn(() => 0),
}));

const mockTrackDb = require('../src/db/tracks') as {
  getAllTracks: jest.Mock;
  upsertTrack: jest.Mock;
  deleteTrack: jest.Mock;
  getTrack: jest.Mock;
  isTrackInLibrary: jest.Mock;
};

import { useLibraryStore } from '../src/store/library';

describe('library store', () => {
  beforeEach(() => {
    useLibraryStore.setState({ tracks: [] });
    jest.clearAllMocks();
  });

  it('loadTracks populates tracks from DB', () => {
    const tracks = [makeTrackFixture()];
    mockTrackDb.getAllTracks.mockReturnValue(tracks);

    useLibraryStore.getState().loadTracks();
    expect(useLibraryStore.getState().tracks).toEqual(tracks);
  });

  it('saveTrack returns UpsertResult and updates tracks', () => {
    const result = { track: makeTrackFixture(), wasInserted: true };
    mockTrackDb.upsertTrack.mockReturnValue(result);
    mockTrackDb.getAllTracks.mockReturnValue([makeTrackFixture()]);

    const partial = makePartialTrack();
    const upsertResult = useLibraryStore.getState().saveTrack(partial);
    expect(upsertResult).toEqual(result);
    expect(useLibraryStore.getState().tracks.length).toBe(1);
  });

  it('removeTrack removes track from state', () => {
    mockTrackDb.deleteTrack.mockReturnValue(undefined);
    mockTrackDb.getAllTracks.mockReturnValue([]);

    useLibraryStore.getState().removeTrack('track-1');
    expect(mockTrackDb.deleteTrack).toHaveBeenCalledWith('track-1');
    expect(useLibraryStore.getState().tracks).toEqual([]);
  });

  it('getTrack returns correct track or null', () => {
    const track = makeTrackFixture();
    mockTrackDb.getTrack.mockReturnValueOnce(track).mockReturnValueOnce(null);

    expect(useLibraryStore.getState().getTrack('track-1')).toEqual(track);
    expect(useLibraryStore.getState().getTrack('nonexistent')).toBeNull();
  });

  it('isInLibrary delegates correctly', () => {
    mockTrackDb.isTrackInLibrary.mockReturnValueOnce(true).mockReturnValueOnce(false);

    expect(useLibraryStore.getState().isInLibrary('spotify', 'sp-1')).toBe(true);
    expect(useLibraryStore.getState().isInLibrary('spotify', 'unknown')).toBe(false);
  });
});
