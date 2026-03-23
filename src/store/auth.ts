// Zustand store for platform authentication state.
import { create } from 'zustand';
import { connectSpotify, disconnectSpotify } from '../auth/spotify-auth';
import { getToken } from '../utils/token-storage';

interface AuthState {
  spotifyConnected: boolean;
  loading: boolean;
  error: string | null;

  hydrate: () => Promise<void>;
  connectSpotify: () => Promise<boolean>;
  disconnectSpotify: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  spotifyConnected: false,
  loading: false,
  error: null,

  hydrate: async () => {
    const token = await getToken('unison.spotify.token');
    set({ spotifyConnected: token !== null });
  },

  connectSpotify: async () => {
    set({ loading: true, error: null });
    try {
      const token = await connectSpotify();
      const connected = token !== null;
      set({ spotifyConnected: connected, loading: false });
      if (!connected) {
        set({ error: 'Spotify authentication was cancelled or failed.' });
      }
      return connected;
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Unknown error connecting to Spotify';
      console.error('[AUTH_FAILED] Spotify connect error:', message);
      set({ loading: false, error: message });
      return false;
    }
  },

  disconnectSpotify: async () => {
    await disconnectSpotify();
    set({ spotifyConnected: false });
  },

  clearError: () => set({ error: null }),
}));
