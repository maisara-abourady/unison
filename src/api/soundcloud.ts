// SoundCloud oEmbed API client — resolves track metadata from a URL.
interface SoundCloudOEmbedResponse {
  title: string;
  author_name: string;
  thumbnail_url: string;
  html: string;
}

export async function resolveSoundCloudTrack(url: string): Promise<SoundCloudOEmbedResponse> {
  const params = new URLSearchParams({
    url,
    format: 'json',
  });

  const response = await fetch(`https://soundcloud.com/oembed?${params}`);

  if (!response.ok) {
    throw new Error(`SoundCloud resolution failed (${response.status})`);
  }

  return response.json();
}

/**
 * Extract SoundCloud numeric track ID. Tries the original URL path first (preferred),
 * then falls back to parsing the oEmbed HTML iframe (fragile).
 */
export function extractSoundCloudTrackId(originalUrl: string, embedHtml: string): string | null {
  // Why: prefer extracting from URL path — stable and not dependent on embed HTML format.
  // SoundCloud URLs follow: soundcloud.com/{user}/{track-slug}
  // The numeric ID is not in the URL path, so we must fall back to oEmbed HTML.
  // This is a known fragility; the fallback to originalUrl as platformTrackId handles failure.

  // Try oEmbed HTML: iframe URL contains api.soundcloud.com/tracks/{ID}
  const encodedMatch = embedHtml.match(/api\.soundcloud\.com%2Ftracks%2F(\d+)/);
  if (encodedMatch) return encodedMatch[1];

  const plainMatch = embedHtml.match(/api\.soundcloud\.com\/tracks\/(\d+)/);
  if (plainMatch) return plainMatch[1];

  return null;
}

export function parseSoundCloudTitle(title: string, authorName: string): { artist: string; trackTitle: string } {
  // Why: SoundCloud oEmbed titles often include artist prefix: "ArtistName - TrackTitle".
  // Only split if the delimiter exists; do not assume it always does.
  const dashIndex = title.indexOf(' - ');
  if (dashIndex > 0) {
    return {
      artist: title.substring(0, dashIndex).trim(),
      trackTitle: title.substring(dashIndex + 3).trim(),
    };
  }

  return {
    artist: authorName,
    trackTitle: title,
  };
}

export type { SoundCloudOEmbedResponse };
