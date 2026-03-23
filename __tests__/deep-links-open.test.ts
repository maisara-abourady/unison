// Tests for the openTrack function — 3 branches: deep link, fallback, and error.
// Uses the built-in react-native Linking mock from jest-expo preset.
import { Linking } from 'react-native';
import { makeTrackFixture } from './helpers/fixtures';
import { openTrack } from '../src/utils/deep-links';

const mockCanOpenURL = Linking.canOpenURL as jest.Mock;
const mockOpenURL = Linking.openURL as jest.Mock;

describe('openTrack', () => {
  const track = makeTrackFixture({
    deepLinkUri: 'spotify:track:abc',
    webFallbackUrl: 'https://open.spotify.com/track/abc',
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockOpenURL.mockResolvedValue(undefined);
  });

  it('opens deep link URI when canOpenURL returns true', async () => {
    mockCanOpenURL.mockResolvedValue(true);

    await openTrack(track);
    expect(mockOpenURL).toHaveBeenCalledWith('spotify:track:abc');
  });

  it('opens web fallback URL when canOpenURL returns false', async () => {
    mockCanOpenURL.mockResolvedValue(false);

    await openTrack(track);
    expect(mockOpenURL).toHaveBeenCalledWith('https://open.spotify.com/track/abc');
  });

  it('falls back to web URL when openURL throws', async () => {
    mockCanOpenURL.mockResolvedValue(true);
    mockOpenURL
      .mockRejectedValueOnce(new Error('Cannot open URI'))
      .mockResolvedValueOnce(undefined);

    await openTrack(track);
    expect(mockOpenURL).toHaveBeenCalledTimes(2);
    expect(mockOpenURL).toHaveBeenLastCalledWith('https://open.spotify.com/track/abc');
  });
});
