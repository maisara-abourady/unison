// Zustand store for the track library — all saved tracks.
import { create } from 'zustand';
import * as trackDb from '../db/tracks';
import type { Track, UpsertResult } from '../types';

interface LibraryState {
  tracks: Track[];
  loadTracks: () => void;
  saveTrack: (track: Omit<Track, 'id' | 'addedAt' | 'updatedAt'>) => UpsertResult;
  removeTrack: (id: string) => void;
  getTrack: (id: string) => Track | null;
  isInLibrary: (platform: string, platformTrackId: string) => boolean;
}

export const useLibraryStore = create<LibraryState>((set) => ({
  tracks: [],

  loadTracks: () => {
    const tracks = trackDb.getAllTracks();
    set({ tracks });
  },

  saveTrack: (track) => {
    const result = trackDb.upsertTrack(track);
    set({ tracks: trackDb.getAllTracks() });
    return result;
  },

  removeTrack: (id) => {
    trackDb.deleteTrack(id);
    set({ tracks: trackDb.getAllTracks() });
  },

  getTrack: (id) => {
    return trackDb.getTrack(id);
  },

  isInLibrary: (platform, platformTrackId) => {
    return trackDb.isTrackInLibrary(platform, platformTrackId);
  },
}));
