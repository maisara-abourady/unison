// Tests for the unified search store — focuses on Promise.allSettled partial failure paths.
import { useSearchStore } from '../src/store/search';

jest.mock('../src/api/spotify', () => ({
  searchSpotifyTracks: jest.fn(),
}));

jest.mock('../src/api/youtube', () => ({
  searchYouTubeVideos: jest.fn(),
}));

jest.mock('../src/utils/normalize-track', () => ({
  mapSpotifyTrack: jest.fn((item: { name: string }) => ({
    platform: 'spotify',
    platformTrackId: item.name,
    title: item.name,
    artist: 'Artist',
    deepLinkUri: 'spotify:track:1',
    webFallbackUrl: 'https://spotify.com/1',
  })),
  mapYouTubeVideo: jest.fn((item: { snippet: { title: string } }) => ({
    platform: 'youtube',
    platformTrackId: item.snippet.title,
    title: item.snippet.title,
    artist: 'Channel',
    deepLinkUri: 'youtube://1',
    webFallbackUrl: 'https://youtube.com/1',
  })),
}));

const { searchSpotifyTracks } = require('../src/api/spotify') as { searchSpotifyTracks: jest.Mock };
const { searchYouTubeVideos } = require('../src/api/youtube') as { searchYouTubeVideos: jest.Mock };

describe('search store', () => {
  beforeEach(() => {
    useSearchStore.setState({
      query: '',
      spotifyResults: [],
      youtubeResults: [],
      isLoading: false,
      errors: {},
    });
    jest.clearAllMocks();
  });

  it('clears results and makes no API calls for empty query', async () => {
    await useSearchStore.getState().search('   ');
    const state = useSearchStore.getState();
    expect(state.spotifyResults).toEqual([]);
    expect(state.youtubeResults).toEqual([]);
    expect(searchSpotifyTracks).not.toHaveBeenCalled();
    expect(searchYouTubeVideos).not.toHaveBeenCalled();
  });

  it('populates both result arrays when both platforms succeed', async () => {
    searchSpotifyTracks.mockResolvedValue([{ name: 'Track A' }]);
    searchYouTubeVideos.mockResolvedValue([{ snippet: { title: 'Video B' } }]);

    await useSearchStore.getState().search('test');
    const state = useSearchStore.getState();
    expect(state.spotifyResults.length).toBe(1);
    expect(state.youtubeResults.length).toBe(1);
    expect(state.errors).toEqual({});
    expect(state.isLoading).toBe(false);
  });

  it('handles Spotify failure with YouTube success', async () => {
    searchSpotifyTracks.mockRejectedValue(new Error('Spotify down'));
    searchYouTubeVideos.mockResolvedValue([{ snippet: { title: 'Video' } }]);

    await useSearchStore.getState().search('test');
    const state = useSearchStore.getState();
    expect(state.spotifyResults).toEqual([]);
    expect(state.youtubeResults.length).toBe(1);
    expect(state.errors.spotify).toBe('Spotify down');
  });

  it('handles YouTube failure with Spotify success', async () => {
    searchSpotifyTracks.mockResolvedValue([{ name: 'Track' }]);
    searchYouTubeVideos.mockRejectedValue(new Error('YT quota exceeded'));

    await useSearchStore.getState().search('test');
    const state = useSearchStore.getState();
    expect(state.spotifyResults.length).toBe(1);
    expect(state.youtubeResults).toEqual([]);
    expect(state.errors.youtube).toBe('YT quota exceeded');
  });

  it('sets both error fields when both fail', async () => {
    searchSpotifyTracks.mockRejectedValue(new Error('Spotify error'));
    searchYouTubeVideos.mockRejectedValue(new Error('YouTube error'));

    await useSearchStore.getState().search('test');
    const state = useSearchStore.getState();
    expect(state.spotifyResults).toEqual([]);
    expect(state.youtubeResults).toEqual([]);
    expect(state.errors.spotify).toBe('Spotify error');
    expect(state.errors.youtube).toBe('YouTube error');
  });

  it('clear() resets all state', () => {
    useSearchStore.setState({
      query: 'something',
      spotifyResults: [{ track: {} as any }],
      youtubeResults: [{ track: {} as any }],
      errors: { spotify: 'err' },
    });

    useSearchStore.getState().clear();
    const state = useSearchStore.getState();
    expect(state.query).toBe('');
    expect(state.spotifyResults).toEqual([]);
    expect(state.youtubeResults).toEqual([]);
    expect(state.errors).toEqual({});
  });

  it('setQuery() updates query field', () => {
    useSearchStore.getState().setQuery('new query');
    expect(useSearchStore.getState().query).toBe('new query');
  });
});
