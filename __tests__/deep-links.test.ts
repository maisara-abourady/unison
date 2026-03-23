// Tests for deep link URI generation across all platforms.
import { getDeepLinkUri } from '../src/utils/normalize-track';
import type { Platform } from '../src/types';

jest.mock('react-native', () => ({
  Platform: { OS: 'ios' },
}));

describe('deep link URI generation', () => {
  const platforms: { platform: Platform; id: string; expected: string }[] = [
    { platform: 'spotify', id: 'abc123', expected: 'spotify:track:abc123' },
    { platform: 'youtube', id: 'dQw4w9WgXcQ', expected: 'youtube://www.youtube.com/watch?v=dQw4w9WgXcQ' },
    { platform: 'soundcloud', id: '987654321', expected: 'soundcloud://sounds:987654321' },
  ];

  it.each(platforms)('generates correct URI for $platform', ({ platform, id, expected }) => {
    expect(getDeepLinkUri(platform, id)).toBe(expected);
  });

  it('is exhaustive — throws on unhandled platform', () => {
    // Why: ensures compile-time safety via the `never` type — adding a new Platform
    // without handling it in the switch will cause a TypeScript error.
    expect(() => getDeepLinkUri('newplatform' as Platform, 'x')).toThrow('Unhandled platform');
  });

  it('handles empty string IDs', () => {
    expect(getDeepLinkUri('spotify', '')).toBe('spotify:track:');
  });

  it('handles IDs with special characters', () => {
    expect(getDeepLinkUri('spotify', 'a-b_c.123')).toBe('spotify:track:a-b_c.123');
  });
});
