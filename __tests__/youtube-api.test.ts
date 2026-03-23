// Tests for YouTube API client — focuses on error status handling.
import { setupFetchMock, mockFetchResponse } from './helpers/mock-fetch';
import { youtubeApiResponse } from './helpers/fixtures';

const fetchMock = setupFetchMock();

describe('youtube API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
  });

  it('returns parsed video items on success', async () => {
    process.env.EXPO_PUBLIC_YOUTUBE_API_KEY = 'test-key';
    const { searchYouTubeVideos } = require('../src/api/youtube');

    fetchMock.mockResolvedValue(mockFetchResponse({ json: youtubeApiResponse }));

    const items = await searchYouTubeVideos('test');
    expect(items).toEqual(youtubeApiResponse.items);
  });

  it('throws when API key not configured', async () => {
    process.env.EXPO_PUBLIC_YOUTUBE_API_KEY = '';
    const { searchYouTubeVideos } = require('../src/api/youtube');

    await expect(searchYouTubeVideos('test')).rejects.toThrow('not configured');
  });

  it('throws quota exceeded on 403', async () => {
    process.env.EXPO_PUBLIC_YOUTUBE_API_KEY = 'test-key';
    const { searchYouTubeVideos } = require('../src/api/youtube');

    fetchMock.mockResolvedValue(mockFetchResponse({ status: 403 }));

    await expect(searchYouTubeVideos('test')).rejects.toThrow('quota exceeded');
  });

  it('throws on 429 rate limit', async () => {
    process.env.EXPO_PUBLIC_YOUTUBE_API_KEY = 'test-key';
    const { searchYouTubeVideos } = require('../src/api/youtube');

    fetchMock.mockResolvedValue(mockFetchResponse({ status: 429 }));

    await expect(searchYouTubeVideos('test')).rejects.toThrow('Too many requests');
  });

  it('throws generic error on 500', async () => {
    process.env.EXPO_PUBLIC_YOUTUBE_API_KEY = 'test-key';
    const { searchYouTubeVideos } = require('../src/api/youtube');

    fetchMock.mockResolvedValue(mockFetchResponse({ status: 500 }));

    await expect(searchYouTubeVideos('test')).rejects.toThrow('YouTube search failed (500)');
  });
});
