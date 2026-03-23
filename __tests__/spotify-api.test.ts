// Tests for Spotify API client — focuses on 401 retry and error handling.
import { setupFetchMock, mockFetchResponse } from './helpers/mock-fetch';
import { spotifyApiResponse } from './helpers/fixtures';

jest.mock('../src/auth/spotify-auth', () => ({
  getSpotifyToken: jest.fn(),
}));

const { getSpotifyToken } = require('../src/auth/spotify-auth') as { getSpotifyToken: jest.Mock };
const fetchMock = setupFetchMock();

import { searchSpotifyTracks } from '../src/api/spotify';

describe('spotify API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns parsed track items on success', async () => {
    getSpotifyToken.mockResolvedValue('valid-token');
    fetchMock.mockResolvedValue(mockFetchResponse({ json: spotifyApiResponse }));

    const items = await searchSpotifyTracks('test');
    expect(items).toEqual(spotifyApiResponse.tracks.items);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('throws when no token available', async () => {
    getSpotifyToken.mockResolvedValue(null);

    await expect(searchSpotifyTracks('test')).rejects.toThrow('Not connected to Spotify');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('refreshes token and retries on 401', async () => {
    getSpotifyToken
      .mockResolvedValueOnce('expired-token')
      .mockResolvedValueOnce('fresh-token');
    fetchMock
      .mockResolvedValueOnce(mockFetchResponse({ status: 401 }))
      .mockResolvedValueOnce(mockFetchResponse({ json: spotifyApiResponse }));

    const items = await searchSpotifyTracks('test');
    expect(items).toEqual(spotifyApiResponse.tracks.items);
    expect(getSpotifyToken).toHaveBeenCalledTimes(2);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('throws session expired when retry also gets no token', async () => {
    getSpotifyToken
      .mockResolvedValueOnce('expired-token')
      .mockResolvedValueOnce(null);
    fetchMock.mockResolvedValue(mockFetchResponse({ status: 401 }));

    await expect(searchSpotifyTracks('test')).rejects.toThrow('session expired');
  });

  it('throws on 429 rate limit', async () => {
    getSpotifyToken.mockResolvedValue('token');
    fetchMock.mockResolvedValue(mockFetchResponse({ status: 429 }));

    await expect(searchSpotifyTracks('test')).rejects.toThrow('Too many requests');
  });

  it('throws generic error with status code on 500', async () => {
    getSpotifyToken.mockResolvedValue('token');
    fetchMock.mockResolvedValue(mockFetchResponse({ status: 500 }));

    await expect(searchSpotifyTracks('test')).rejects.toThrow('Spotify search failed (500)');
  });

  it('propagates network failure', async () => {
    getSpotifyToken.mockResolvedValue('token');
    fetchMock.mockRejectedValue(new Error('Network error'));

    await expect(searchSpotifyTracks('test')).rejects.toThrow('Network error');
  });
});
