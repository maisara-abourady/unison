// Zustand store for unified search across platforms.
import { create } from 'zustand';
import { searchSpotifyTracks } from '../api/spotify';
import { searchYouTubeVideos } from '../api/youtube';
import { mapSpotifyTrack, mapYouTubeVideo } from '../utils/normalize-track';
import type { SearchResult, Platform } from '../types';

interface SearchState {
  query: string;
  spotifyResults: SearchResult[];
  youtubeResults: SearchResult[];
  isLoading: boolean;
  errors: Partial<Record<Platform, string>>;

  setQuery: (query: string) => void;
  search: (query: string) => Promise<void>;
  clear: () => void;
}

export const useSearchStore = create<SearchState>((set) => ({
  query: '',
  spotifyResults: [],
  youtubeResults: [],
  isLoading: false,
  errors: {},

  setQuery: (query) => set({ query }),

  search: async (query) => {
    if (!query.trim()) {
      set({ spotifyResults: [], youtubeResults: [], errors: {} });
      return;
    }

    set({ isLoading: true, errors: {} });

    const [spotifyResult, youtubeResult] = await Promise.allSettled([
      searchSpotifyTracks(query).then((items) =>
        items.map((item): SearchResult => ({ track: mapSpotifyTrack(item) }))
      ),
      searchYouTubeVideos(query).then((items) =>
        items.map((item): SearchResult => ({ track: mapYouTubeVideo(item) }))
      ),
    ]);

    const errors: Partial<Record<Platform, string>> = {};

    const spotifyResults = spotifyResult.status === 'fulfilled'
      ? spotifyResult.value
      : (() => { errors.spotify = (spotifyResult.reason as Error).message; return []; })();

    const youtubeResults = youtubeResult.status === 'fulfilled'
      ? youtubeResult.value
      : (() => { errors.youtube = (youtubeResult.reason as Error).message; return []; })();

    set({ spotifyResults, youtubeResults, isLoading: false, errors });
  },

  clear: () => set({ query: '', spotifyResults: [], youtubeResults: [], errors: {} }),
}));
