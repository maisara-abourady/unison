// Spotify Web API client — search endpoint.
import { getSpotifyToken, connectSpotify } from '../auth/spotify-auth';

interface SpotifyTrackItem {
  id: string;
  name: string;
  artists: { name: string }[];
  album: { name: string; images: { url: string; width: number }[] };
  duration_ms: number;
  external_urls: { spotify: string };
}

interface SpotifySearchResponse {
  tracks: {
    items: SpotifyTrackItem[];
  };
}

export async function searchSpotifyTracks(query: string): Promise<SpotifyTrackItem[]> {
  let token = await getSpotifyToken();
  if (!token) throw new Error('Not connected to Spotify');

  const params = new URLSearchParams({
    q: query,
    type: 'track',
    limit: '10',
  });

  let response = await fetch(`https://api.spotify.com/v1/search?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  // Why: 401 may occur due to clock skew even if we checked expiry. Attempt one silent refresh.
  if (response.status === 401) {
    token = await getSpotifyToken();
    if (!token) throw new Error('Spotify session expired — please reconnect');

    response = await fetch(`https://api.spotify.com/v1/search?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  if (response.status === 429) {
    throw new Error('Too many requests — try again shortly');
  }

  if (!response.ok) {
    throw new Error(`Spotify search failed (${response.status})`);
  }

  const data: SpotifySearchResponse = await response.json();
  return data.tracks.items;
}

export type { SpotifyTrackItem };
