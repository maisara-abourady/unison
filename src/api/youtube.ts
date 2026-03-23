// YouTube Data API v3 client — search endpoint (API key auth, no OAuth).

interface YouTubeSearchItem {
  id: { videoId: string };
  snippet: {
    title: string;
    channelTitle: string;
    thumbnails: {
      high: { url: string };
    };
  };
}

interface YouTubeSearchResponse {
  items: YouTubeSearchItem[];
}

export async function searchYouTubeVideos(query: string): Promise<YouTubeSearchItem[]> {
  const API_KEY = process.env.EXPO_PUBLIC_YOUTUBE_API_KEY ?? '';
  if (!API_KEY) throw new Error('YouTube API key not configured');

  const params = new URLSearchParams({
    part: 'snippet',
    q: query,
    type: 'video',
    // Why: videoCategoryId=10 filters to Music category, reducing noise in results.
    videoCategoryId: '10',
    maxResults: '10',
    key: API_KEY,
  });

  const response = await fetch(`https://www.googleapis.com/youtube/v3/search?${params}`);

  if (response.status === 403) {
    throw new Error('YouTube API quota exceeded — try again tomorrow');
  }

  if (response.status === 429) {
    throw new Error('Too many requests — try again shortly');
  }

  if (!response.ok) {
    throw new Error(`YouTube search failed (${response.status})`);
  }

  const data: YouTubeSearchResponse = await response.json();
  return data.items;
}

export function isYouTubeConfigured(): boolean {
  const API_KEY = process.env.EXPO_PUBLIC_YOUTUBE_API_KEY ?? '';
  return API_KEY.length > 0;
}

export type { YouTubeSearchItem };
