// Reusable test data fixtures.
import type { Track } from '../../src/types';

export const spotifyApiResponse = {
  tracks: {
    items: [
      {
        id: 'sp-track-1',
        name: 'Test Track',
        artists: [{ name: 'Artist A' }, { name: 'Artist B' }],
        album: { name: 'Test Album', images: [{ url: 'https://img.spotify.com/1.jpg', width: 300 }] },
        duration_ms: 210000,
        external_urls: { spotify: 'https://open.spotify.com/track/sp-track-1' },
      },
    ],
  },
};

export const youtubeApiResponse = {
  items: [
    {
      id: { videoId: 'yt-video-1' },
      snippet: {
        title: 'YouTube Test Video',
        channelTitle: 'Test Channel',
        thumbnails: { high: { url: 'https://i.ytimg.com/vi/yt-video-1/hqdefault.jpg' } },
      },
    },
  ],
};

export function makeTrackFixture(overrides: Partial<Track> = {}): Track {
  return {
    id: 'track-1',
    platform: 'spotify',
    platformTrackId: 'sp-1',
    title: 'Test Track',
    artist: 'Test Artist',
    album: 'Test Album',
    thumbnailUrl: 'https://example.com/thumb.jpg',
    durationSeconds: 210,
    deepLinkUri: 'spotify:track:sp-1',
    webFallbackUrl: 'https://open.spotify.com/track/sp-1',
    addedAt: 1000000,
    updatedAt: 1000000,
    ...overrides,
  };
}

export function makePartialTrack(overrides: Partial<Omit<Track, 'id' | 'addedAt' | 'updatedAt'>> = {}) {
  return {
    platform: 'spotify' as const,
    platformTrackId: 'sp-1',
    title: 'Test Track',
    artist: 'Test Artist',
    deepLinkUri: 'spotify:track:sp-1',
    webFallbackUrl: 'https://open.spotify.com/track/sp-1',
    ...overrides,
  };
}
