// Tests for platform API response → Track normalization functions.
import { mapSpotifyTrack, mapYouTubeVideo, mapSoundCloudOEmbed, getDeepLinkUri } from '../src/utils/normalize-track';
import type { Platform } from '../src/types';

jest.mock('react-native', () => ({
  Platform: { OS: 'ios' },
}));

describe('mapSpotifyTrack', () => {
  const spotifyItem = {
    id: 'abc123',
    name: 'Bohemian Rhapsody',
    artists: [{ name: 'Queen' }],
    album: { name: 'A Night at the Opera', images: [{ url: 'https://img.spotify.com/cover.jpg', width: 300 }] },
    duration_ms: 354000,
    external_urls: { spotify: 'https://open.spotify.com/track/abc123' },
  };

  it('maps all fields correctly', () => {
    const result = mapSpotifyTrack(spotifyItem);
    expect(result.platform).toBe('spotify');
    expect(result.platformTrackId).toBe('abc123');
    expect(result.title).toBe('Bohemian Rhapsody');
    expect(result.artist).toBe('Queen');
    expect(result.album).toBe('A Night at the Opera');
    expect(result.thumbnailUrl).toBe('https://img.spotify.com/cover.jpg');
    expect(result.durationSeconds).toBe(354);
    expect(result.deepLinkUri).toBe('spotify:track:abc123');
    expect(result.webFallbackUrl).toBe('https://open.spotify.com/track/abc123');
  });

  it('joins multiple artists', () => {
    const multiArtist = { ...spotifyItem, artists: [{ name: 'Queen' }, { name: 'David Bowie' }] };
    const result = mapSpotifyTrack(multiArtist);
    expect(result.artist).toBe('Queen, David Bowie');
  });

  it('handles missing album images', () => {
    const noImage = { ...spotifyItem, album: { ...spotifyItem.album, images: [] } };
    const result = mapSpotifyTrack(noImage);
    expect(result.thumbnailUrl).toBeUndefined();
  });
});

describe('mapYouTubeVideo', () => {
  const youtubeItem = {
    id: { videoId: 'dQw4w9WgXcQ' },
    snippet: {
      title: 'Never Gonna Give You Up',
      channelTitle: 'Rick Astley',
      thumbnails: { high: { url: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg' } },
    },
  };

  it('maps all fields correctly', () => {
    const result = mapYouTubeVideo(youtubeItem);
    expect(result.platform).toBe('youtube');
    expect(result.platformTrackId).toBe('dQw4w9WgXcQ');
    expect(result.title).toBe('Never Gonna Give You Up');
    expect(result.artist).toBe('Rick Astley');
    expect(result.durationSeconds).toBeUndefined();
    expect(result.webFallbackUrl).toBe('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
  });
});

describe('mapSoundCloudOEmbed', () => {
  const oembed = {
    title: 'ArtistName - Track Title',
    author_name: 'ArtistName',
    thumbnail_url: 'https://i1.sndcdn.com/artworks.jpg',
    html: '<iframe src="https://w.soundcloud.com/player/?url=https%3A//api.soundcloud.com%2Ftracks%2F123456789"></iframe>',
  };

  it('extracts track ID from embed HTML', () => {
    const result = mapSoundCloudOEmbed(oembed, 'https://soundcloud.com/artist/track');
    expect(result.platformTrackId).toBe('123456789');
    expect(result.deepLinkUri).toBe('soundcloud://sounds:123456789');
  });

  it('parses artist from title delimiter', () => {
    const result = mapSoundCloudOEmbed(oembed, 'https://soundcloud.com/artist/track');
    expect(result.artist).toBe('ArtistName');
    expect(result.title).toBe('Track Title');
  });

  it('falls back to author_name when no delimiter', () => {
    const noDelim = { ...oembed, title: 'Just A Title' };
    const result = mapSoundCloudOEmbed(noDelim, 'https://soundcloud.com/artist/track');
    expect(result.artist).toBe('ArtistName');
    expect(result.title).toBe('Just A Title');
  });

  it('falls back to original URL when ID cannot be extracted', () => {
    const noId = { ...oembed, html: '<iframe src="https://example.com"></iframe>' };
    const url = 'https://soundcloud.com/artist/track';
    const result = mapSoundCloudOEmbed(noId, url);
    expect(result.platformTrackId).toBe(url);
    expect(result.deepLinkUri).toBe(url);
    expect(result.webFallbackUrl).toBe(url);
  });
});

describe('getDeepLinkUri', () => {
  it('returns correct URI for spotify', () => {
    expect(getDeepLinkUri('spotify', 'abc')).toBe('spotify:track:abc');
  });

  it('returns correct URI for youtube (iOS)', () => {
    expect(getDeepLinkUri('youtube', 'xyz')).toBe('youtube://www.youtube.com/watch?v=xyz');
  });

  it('returns correct URI for soundcloud', () => {
    expect(getDeepLinkUri('soundcloud', '123')).toBe('soundcloud://sounds:123');
  });

  it('throws on unknown platform', () => {
    expect(() => getDeepLinkUri('tidal' as Platform, 'x')).toThrow('Unhandled platform');
  });
});
