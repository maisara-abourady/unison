# Project Manifest: Universal Playlist Aggregator
**Codename:** `unison`
**Type:** Personal-use mobile app (React Native + Expo)
**Target Platforms:** iOS (primary), Android (secondary)
**Author:** Personal project — not intended for App Store distribution

---

## 1. Vision

A personal playlist manager that aggregates tracks from Spotify, YouTube, and SoundCloud into unified playlists. The app owns the **data layer** (playlists, search, organization) but delegates **playback** to native streaming apps via deep links. The user never streams inside the app.

---

## 2. Core User Stories

1. **Search** — I can search across Spotify and YouTube simultaneously from a single search bar; results are displayed in a merged list with platform badges.
2. **SoundCloud add (manual)** — I can paste a SoundCloud track URL; the app resolves its metadata and stores it alongside other tracks.
3. **Playlist creation** — I can create named playlists and add tracks from any source to them.
4. **Playback delegation** — Tapping a track opens it in its native app (Spotify / YouTube / SoundCloud). If the native app isn't installed, it falls back to the web URL.
5. **Playlist management** — I can reorder tracks, remove tracks, delete playlists, and rename playlists.
6. **Offline metadata** — All track metadata and playlists are stored locally; the app works without internet for browsing saved playlists (playback still requires connectivity and native app).

---

## 3. Tech Stack

| Layer | Choice | Reason |
|---|---|---|
| Framework | React Native + Expo SDK 51+ | Fast iteration, no native build tools needed for dev, personal sideloading via Expo Go or EAS Build |
| Navigation | Expo Router (file-based) | Clean routing, deep link support built-in |
| Local DB | Expo SQLite (via `expo-sqlite`) | Persistent local storage, no backend needed |
| State management | Zustand | Lightweight, no boilerplate |
| Auth (OAuth) | `expo-auth-session` + `expo-web-browser` | PKCE OAuth2 for Spotify and YouTube, handles redirect URIs cleanly |
| HTTP client | `axios` or native `fetch` | Simple REST calls to platform APIs |
| Deep links | `expo-linking` | Open native apps by URI scheme |
| UI components | Custom only — no UI kit | Full control over aesthetics |
| Styling | StyleSheet + custom design tokens | Consistent design language |
| Icons | `@expo/vector-icons` (Ionicons) | Built into Expo |
| Environment vars | `expo-constants` + `.env` via `dotenv` | API keys handled safely |

---

## 4. Project Structure

```
unison/
├── app/                          # Expo Router pages
│   ├── (tabs)/
│   │   ├── index.tsx             # Home — recent playlists
│   │   ├── search.tsx            # Unified search screen
│   │   └── library.tsx           # All playlists view
│   ├── playlist/
│   │   ├── [id].tsx              # Playlist detail view
│   │   └── create.tsx            # New playlist screen
│   ├── track/
│   │   └── add-soundcloud.tsx    # SoundCloud manual URL paste screen
│   └── _layout.tsx               # Root layout + auth initialization
│
├── src/
│   ├── api/
│   │   ├── spotify.ts            # Spotify Web API client
│   │   ├── youtube.ts            # YouTube Data API v3 client
│   │   └── soundcloud.ts         # SoundCloud oEmbed resolver
│   │
│   ├── auth/
│   │   ├── spotify-auth.ts       # Spotify OAuth2 PKCE flow
│   │   └── youtube-auth.ts       # Google OAuth2 PKCE flow
│   │
│   ├── db/
│   │   ├── schema.ts             # SQLite schema definitions + migrations
│   │   ├── playlists.ts          # Playlist CRUD operations
│   │   └── tracks.ts             # Track CRUD operations
│   │
│   ├── store/
│   │   ├── auth.ts               # Zustand: OAuth tokens for all platforms
│   │   ├── playlists.ts          # Zustand: playlist state
│   │   └── search.ts             # Zustand: search state + results
│   │
│   ├── hooks/
│   │   ├── useUnifiedSearch.ts   # Parallel search across platforms
│   │   ├── usePlaylists.ts       # Playlist data hook
│   │   └── useDeepLink.ts        # Platform deep link builder
│   │
│   ├── components/
│   │   ├── TrackRow.tsx          # Unified track row component (all platforms)
│   │   ├── PlatformBadge.tsx     # Spotify / YouTube / SoundCloud badge
│   │   ├── PlaylistCard.tsx      # Playlist summary card
│   │   ├── SearchBar.tsx         # Unified search input
│   │   └── EmptyState.tsx        # Empty state UI component
│   │
│   ├── constants/
│   │   ├── colors.ts             # Design tokens
│   │   ├── typography.ts         # Font scale
│   │   └── platforms.ts          # Platform metadata (names, colors, URI schemes)
│   │
│   └── utils/
│       ├── deepLinks.ts          # URI scheme builders per platform
│       ├── normalizeTrack.ts     # Map platform responses → internal Track type
│       └── tokenStorage.ts       # Secure token persistence (expo-secure-store)
│
├── assets/
│   └── fonts/                    # Custom fonts if used
│
├── .env                          # API keys (gitignored)
├── .env.example                  # Template for env vars
├── app.json                      # Expo config
├── babel.config.js
├── tsconfig.json
└── README.md
```

---

## 5. Data Model (SQLite)

```sql
-- Playlists
CREATE TABLE playlists (
  id          TEXT PRIMARY KEY,       -- UUID
  name        TEXT NOT NULL,
  description TEXT,
  created_at  INTEGER NOT NULL,       -- Unix timestamp
  updated_at  INTEGER NOT NULL
);

-- Tracks (canonical store — deduped by platform + platform_id)
CREATE TABLE tracks (
  id                 TEXT PRIMARY KEY, -- UUID
  platform           TEXT NOT NULL,    -- 'spotify' | 'youtube' | 'soundcloud'
  platform_track_id  TEXT NOT NULL,
  title              TEXT NOT NULL,
  artist             TEXT,
  album              TEXT,
  thumbnail_url      TEXT,
  duration_seconds   INTEGER,
  deep_link_uri      TEXT NOT NULL,    -- e.g. spotify:track:xxx
  web_fallback_url   TEXT NOT NULL,    -- HTTPS fallback
  added_at           INTEGER NOT NULL,
  UNIQUE(platform, platform_track_id)
);

-- Junction table: playlist membership + ordering
CREATE TABLE playlist_tracks (
  playlist_id  TEXT NOT NULL REFERENCES playlists(id) ON DELETE CASCADE,
  track_id     TEXT NOT NULL REFERENCES tracks(id) ON DELETE CASCADE,
  position     INTEGER NOT NULL,
  added_at     INTEGER NOT NULL,
  PRIMARY KEY (playlist_id, track_id)
);
```

---

## 6. Internal Type Definitions

```typescript
// src/types/index.ts

export type Platform = 'spotify' | 'youtube' | 'soundcloud';

export interface Track {
  id: string;
  platform: Platform;
  platformTrackId: string;
  title: string;
  artist: string;
  album?: string;
  thumbnailUrl?: string;
  durationSeconds?: number;
  deepLinkUri: string;       // Open in native app
  webFallbackUrl: string;    // Open in browser if app not installed
  addedAt: number;
}

export interface Playlist {
  id: string;
  name: string;
  description?: string;
  tracks: Track[];
  createdAt: number;
  updatedAt: number;
}

export interface SearchResult {
  track: Track;
  score?: number;            // For future relevance sorting
}

export interface UnifiedSearchResults {
  spotify: SearchResult[];
  youtube: SearchResult[];
  soundcloud: SearchResult[];
  isLoading: boolean;
  errors: Partial<Record<Platform, string>>;
}
```

---

## 7. Platform API Details

### 7.1 Spotify
- **API base:** `https://api.spotify.com/v1`
- **Auth:** OAuth2 PKCE — scopes: `user-read-private`
- **Search endpoint:** `GET /search?q={query}&type=track&limit=10`
- **Deep link:** `spotify:track:{id}`
- **Web fallback:** `https://open.spotify.com/track/{id}`
- **Credentials needed:** `EXPO_PUBLIC_SPOTIFY_CLIENT_ID` (from developer.spotify.com)

### 7.2 YouTube
- **API base:** `https://www.googleapis.com/youtube/v3`
- **Auth:** Google OAuth2 PKCE — scopes: `https://www.googleapis.com/auth/youtube.readonly`
- **Search endpoint:** `GET /search?part=snippet&q={query}&type=video&videoCategoryId=10&maxResults=10`
  - `videoCategoryId=10` = Music — reduces noise
- **Deep link (iOS):** `youtube://www.youtube.com/watch?v={id}`
- **Deep link (Android):** `vnd.youtube:{id}`
- **Web fallback:** `https://www.youtube.com/watch?v={id}`
- **Credentials needed:** `EXPO_PUBLIC_GOOGLE_CLIENT_ID` + `EXPO_PUBLIC_YOUTUBE_API_KEY` (from console.cloud.google.com)
- **Quota note:** 10,000 units/day free; each search costs 100 units → ~100 searches/day cap

### 7.3 SoundCloud (manual paste flow)
- **No API registration available** — using oEmbed only
- **oEmbed endpoint:** `https://soundcloud.com/oembed?url={encoded_track_url}&format=json`
  - Returns: `title`, `author_name`, `thumbnail_url`, `html` (embed code)
  - No auth required
- **Deep link (iOS):** `soundcloud://sounds/{id}` — ID must be extracted from oEmbed response HTML
- **Web fallback:** the original URL the user pasted
- **User flow:** user pastes SoundCloud URL → app calls oEmbed → shows preview → user taps "Add to playlist"

---

## 8. Auth Flow

Each platform authenticates independently at first launch or on demand. Tokens are stored in `expo-secure-store`.

```
App launch
  └─ Check stored tokens for each platform
       ├─ Spotify token valid? → ready
       │    └─ No → show "Connect Spotify" button → OAuth PKCE → store tokens
       ├─ YouTube token valid? → ready
       │    └─ No → show "Connect YouTube" button → OAuth PKCE → store tokens
       └─ SoundCloud → no auth needed (oEmbed only)

Token refresh:
  - Spotify: refresh_token flow (Spotify tokens expire in 1hr)
  - YouTube: Google handles refresh automatically via expo-auth-session
```

The app should be usable with only one platform connected. Search degrades gracefully — if Spotify is not connected, Spotify results are omitted without breaking the UI.

---

## 9. Unified Search Logic

```typescript
// src/hooks/useUnifiedSearch.ts (pseudocode)

async function searchAll(query: string): Promise<UnifiedSearchResults> {
  const [spotifyResults, youtubeResults] = await Promise.allSettled([
    searchSpotify(query),   // returns Track[]
    searchYouTube(query),   // returns Track[]
  ]);

  return {
    spotify: spotifyResults.status === 'fulfilled' ? spotifyResults.value : [],
    youtube: youtubeResults.status === 'fulfilled' ? youtubeResults.value : [],
    soundcloud: [],  // SoundCloud is always manual paste
    isLoading: false,
    errors: {
      spotify: spotifyResults.status === 'rejected' ? spotifyResults.reason : undefined,
      youtube: youtubeResults.status === 'rejected' ? youtubeResults.reason : undefined,
    }
  };
}
```

Results display: interleaved list sorted by platform grouping (Spotify → YouTube) OR a toggle for flat/grouped view.

---

## 10. Playback Delegation

```typescript
// src/utils/deepLinks.ts

import { Linking } from 'react-native';

export async function openTrack(track: Track): Promise<void> {
  const canOpen = await Linking.canOpenURL(track.deepLinkUri);
  if (canOpen) {
    await Linking.openURL(track.deepLinkUri);
  } else {
    await Linking.openURL(track.webFallbackUrl);
  }
}
```

No custom player. No streaming. No audio session management. This keeps the app out of licensing territory and means the native app (with its queue, casting, etc.) handles everything.

---

## 11. Design Language

**Aesthetic:** Dark, editorial, high-contrast. Inspired by DJ/production software. Not a music streaming app — feels more like a power tool.

**Color tokens:**
```typescript
export const colors = {
  background:     '#0C0C0F',   // Near-black
  surface:        '#16161C',   // Card/panel background
  surfaceAlt:     '#1E1E28',   // Elevated surface
  border:         '#2A2A38',   // Subtle dividers
  text:           '#F0EEF8',   // Primary text
  textMuted:      '#6B6880',   // Secondary text
  accent:         '#7B6CFF',   // Primary accent (violet)
  accentAlt:      '#00D4AA',   // Secondary accent (teal)
  spotify:        '#1DB954',
  youtube:        '#FF0000',
  soundcloud:     '#FF5500',
  error:          '#FF4D6A',
};
```

**Typography:** Use system font (`-apple-system` / `Roboto`) with clear hierarchy — no custom font needed initially to keep build simple.

**Track row anatomy:**
```
[Thumbnail 48x48] [Title / Artist]  [Duration]  [Platform Badge]  [⋮ menu]
```

**Platform badge:** small colored dot + platform name abbreviation (SPO / YT / SC).

---

## 12. Environment Variables

Create `.env` at project root (gitignored):

```env
EXPO_PUBLIC_SPOTIFY_CLIENT_ID=your_spotify_client_id
EXPO_PUBLIC_GOOGLE_CLIENT_ID=your_google_client_id
EXPO_PUBLIC_YOUTUBE_API_KEY=your_youtube_api_key
```

Create `.env.example` with same keys but empty values — commit this.

Spotify redirect URI to register: `exp://localhost:8081/--/spotify-auth-callback`
Google redirect URI to register: `exp://localhost:8081/--/google-auth-callback`

---

## 13. Build & Run Instructions (for README)

```bash
# Install dependencies
npx create-expo-app unison --template blank-typescript
cd unison
npx expo install expo-sqlite expo-auth-session expo-web-browser \
  expo-secure-store expo-linking expo-router zustand axios

# Copy .env.example to .env and fill in your API keys

# Run in development
npx expo start

# Run on physical device
# Install Expo Go on device, scan QR code

# Build for personal device (no App Store)
npx eas build --profile preview --platform ios
```

---

## 14. Out of Scope (v1)

- In-app audio playback or streaming
- Track preview audio
- Social / sharing features
- Cloud sync or backup (local only)
- Collaborative playlists
- Import from existing Spotify/YouTube playlists (v2 candidate)
- SoundCloud search (blocked by API access — manual paste only)
- Last.fm scrobbling

---

## 15. v2 Candidates

- Import existing Spotify playlists into Unison
- YouTube playlist import
- SoundCloud search (if API access becomes available)
- iCloud backup of playlist database
- Share playlist as JSON or link
- Cross-platform track matching (find same song on another platform)
