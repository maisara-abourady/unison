// Pure functions to map platform API responses to the internal Track shape.
import { Platform as RNPlatform } from 'react-native';
import type { Track, Platform } from '../types';
import type { SpotifyTrackItem } from '../api/spotify';
import type { YouTubeSearchItem } from '../api/youtube';
import type { SoundCloudOEmbedResponse } from '../api/soundcloud';
import { extractSoundCloudTrackId, parseSoundCloudTitle } from '../api/soundcloud';

type PartialTrack = Omit<Track, 'id' | 'addedAt' | 'updatedAt'>;

/** Build platform-specific deep link URI with exhaustive platform check. */
export function getDeepLinkUri(platform: Platform, id: string): string {
  switch (platform) {
    case 'spotify':
      return `spotify:track:${id}`;
    case 'youtube':
      // Why: iOS and Android use different URI schemes for YouTube deep links.
      return RNPlatform.OS === 'ios'
        ? `youtube://www.youtube.com/watch?v=${id}`
        : `vnd.youtube:${id}`;
    case 'soundcloud':
      return `soundcloud://sounds:${id}`;
    default: {
      const _exhaustive: never = platform;
      throw new Error(`Unhandled platform: ${platform}`);
    }
  }
}

export function mapSpotifyTrack(item: SpotifyTrackItem): PartialTrack {
  return {
    platform: 'spotify',
    platformTrackId: item.id,
    title: item.name,
    artist: item.artists.map((a) => a.name).join(', '),
    album: item.album.name,
    thumbnailUrl: item.album.images[0]?.url,
    durationSeconds: Math.round(item.duration_ms / 1000),
    deepLinkUri: getDeepLinkUri('spotify', item.id),
    webFallbackUrl: `https://open.spotify.com/track/${item.id}`,
  };
}

export function mapYouTubeVideo(item: YouTubeSearchItem): PartialTrack {
  const videoId = item.id.videoId;

  return {
    platform: 'youtube',
    platformTrackId: videoId,
    title: item.snippet.title,
    artist: item.snippet.channelTitle,
    thumbnailUrl: item.snippet.thumbnails.high.url,
    durationSeconds: undefined,
    deepLinkUri: getDeepLinkUri('youtube', videoId),
    webFallbackUrl: `https://www.youtube.com/watch?v=${videoId}`,
  };
}

export function mapSoundCloudOEmbed(
  oembed: SoundCloudOEmbedResponse,
  originalUrl: string
): PartialTrack {
  const trackId = extractSoundCloudTrackId(originalUrl, oembed.html);
  const { artist, trackTitle } = parseSoundCloudTitle(oembed.title, oembed.author_name);

  return {
    platform: 'soundcloud',
    platformTrackId: trackId ?? originalUrl,
    title: trackTitle,
    artist,
    thumbnailUrl: oembed.thumbnail_url,
    durationSeconds: undefined,
    deepLinkUri: trackId ? getDeepLinkUri('soundcloud', trackId) : originalUrl,
    webFallbackUrl: originalUrl,
  };
}
