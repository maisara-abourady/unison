# Unison — Implementation Plan

## Context

Unison is a personal playlist aggregator that unifies tracks from Spotify, YouTube, and SoundCloud into cross-platform playlists. It owns the **data layer** (search, organize, store) but delegates **playback** to native apps via deep links. No streaming, no licensing concerns, no backend.

The manifest in `references/initial-idea.md` provides the technical foundation. The PRDs in `prds/` redefine how playlists work: tracks are organized via a **tagging system**, and playlists are **dynamic filters** over those tags — not static lists. This fundamentally changes the app's core workflow:

**Original workflow:** search → add to playlist
**New workflow:** search → save to library → tag → playlists compute automatically

This means Unison now has a **library** concept — a collection of saved tracks that exist independently of any playlist. Playlists are views into the library, defined by tag filters.

---

## Deviations from the Manifest

| # | Manifest Says | This Plan | Why |
|---|---|---|---|
| 1 | Static `playlist_tracks` junction table | **Dynamic playlists via tag filters** | Playlists are saved tag queries. Membership is computed live. See `prds/dynamic-playlists.md`. |
| 2 | No tagging system | **Full tagging system with presets** | Tags are the foundation that powers dynamic playlists. See `prds/tagging-system.md`. |
| 3 | No library concept (tracks only exist in playlists) | **Library as first-class concept** | Tracks are saved to a library first, then tagged, then playlists auto-populate from tags. |
| 4 | `axios` or `fetch` | **`fetch` only** | One fewer dependency. Expo's runtime supports `fetch` natively. |
| 5 | `expo-constants` + `dotenv` for env vars | **Expo's built-in `.env` loading** | SDK 51+ loads `EXPO_PUBLIC_*` vars from `.env` natively. |
| 6 | YouTube OAuth PKCE | **API key only (no OAuth)** | YouTube search is a public endpoint. OAuth is only needed for private user data. |
| 7 | Hardcoded redirect URIs (`exp://localhost:8081/--/...`) | **`makeRedirectUri({ scheme: 'unison' })`** | The hardcoded URIs break on physical devices. |
| 8 | No `(tabs)/_layout.tsx` in project tree | **Add it** | Expo Router requires a layout file inside `(tabs)/` to define the tab navigator. |
| 9 | No `src/types/` in project tree | **Add it** | The manifest defines types in Section 6 but forgets the folder in Section 4. |
| 10 | YouTube duration in search results | **Store as `undefined`** | YouTube search API doesn't return duration. Extra API call costs quota. |
| 11 | User-defined track ordering in playlists | **Fixed sort (artist, then title)** | Dynamic playlists compute membership live — there's no stable position to store. Custom ordering is a v2 candidate. |

---

## Revised Data Model

The original manifest had 3 tables (`playlists`, `tracks`, `playlist_tracks`). The new model has 4 tables — `playlist_tracks` is replaced by `tag_presets` and `tags`:

```sql
-- Tracks (canonical store — deduped by platform + platform_id)
CREATE TABLE tracks (
  id                 TEXT PRIMARY KEY,
  platform           TEXT NOT NULL,       -- 'spotify' | 'youtube' | 'soundcloud'
  platform_track_id  TEXT NOT NULL,
  title              TEXT NOT NULL,
  artist             TEXT,
  album              TEXT,
  thumbnail_url      TEXT,
  duration_seconds   INTEGER,
  deep_link_uri      TEXT NOT NULL,
  web_fallback_url   TEXT NOT NULL,
  added_at           INTEGER NOT NULL,
  UNIQUE(platform, platform_track_id)
);

-- Tag presets (the user's tag vocabulary)
CREATE TABLE tag_presets (
  id          TEXT PRIMARY KEY,
  category    TEXT NOT NULL,
  value       TEXT NOT NULL,
  created_at  INTEGER NOT NULL,
  UNIQUE(category, value)
);

-- Applied tags (tags on tracks — drives playlist membership)
CREATE TABLE tags (
  id        TEXT PRIMARY KEY,
  track_id  TEXT NOT NULL REFERENCES tracks(id) ON DELETE CASCADE,
  category  TEXT NOT NULL,
  value     TEXT NOT NULL,
  UNIQUE(track_id, category, value)
);

-- Playlists (saved tag filters — no junction table)
CREATE TABLE playlists (
  id           TEXT PRIMARY KEY,
  name         TEXT NOT NULL,
  description  TEXT,
  filter_tags  TEXT NOT NULL DEFAULT '[]',  -- JSON: [{"category":"mood","value":"dark"}, ...]
  created_at   INTEGER NOT NULL,
  updated_at   INTEGER NOT NULL
);
```

**Key changes from the original manifest:**
- `playlist_tracks` is gone. No junction table. No `position` column.
- `tag_presets` is new — stores the user's available tag vocabulary.
- `tags` is new — stores applied tags on tracks. This is what playlists query against.
- `playlists` gains `filter_tags` (JSON) and loses its relationship to tracks.
- No `user_id` anywhere — single-user local app.

---

## Revised Type Definitions

```typescript
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
  deepLinkUri: string;
  webFallbackUrl: string;
  addedAt: number;
}

export interface TagPreset {
  id: string;
  category: string;
  value: string;
  createdAt: number;
}

export interface Tag {
  id: string;
  trackId: string;
  category: string;
  value: string;
}

export interface TagFilter {
  category: string;
  value: string;
}

export interface Playlist {
  id: string;
  name: string;
  description?: string;
  filterTags: TagFilter[];
  createdAt: number;
  updatedAt: number;
  trackCount?: number;       // Computed live, not stored
}

export interface SearchResult {
  track: Track;
  score?: number;
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

## Build Phases

### Phase 0: Project Bootstrap

**Goal:** App runs on device/simulator with a dark-themed 3-tab shell.

**Tasks:**
- Initialize Expo project with `create-expo-app` (blank-typescript template)
- Install all dependencies upfront:
  - `expo-router`, `expo-sqlite`, `expo-secure-store`, `expo-linking`
  - `expo-auth-session`, `expo-web-browser`, `expo-crypto`
  - `zustand`
  - `react-native-safe-area-context`, `react-native-screens` (required by Expo Router)
- Create `app.json` with `scheme: 'unison'`
- Create `.env.example` with empty API key placeholders
- Create `.gitignore` (standard Expo + `.env`)

**Files to create:**

| File | Purpose |
|---|---|
| `src/constants/colors.ts` | Design tokens — dark theme palette from manifest Section 11 |
| `src/constants/typography.ts` | Font scale constants |
| `app/_layout.tsx` | Root layout: dark StatusBar, wraps children |
| `app/(tabs)/_layout.tsx` | Tab navigator: Home, Search, Library — dark themed tab bar |
| `app/(tabs)/index.tsx` | Home tab — placeholder text |
| `app/(tabs)/search.tsx` | Search tab — placeholder text |
| `app/(tabs)/library.tsx` | Library tab — placeholder text |

**Done when:** `npx expo start` shows dark app with 3 navigable tabs.

---

### Phase 1: Database + Types

**Goal:** SQLite schema initializes on launch. CRUD operations for tracks, tags, tag presets, and playlists work and are verifiable via console.

**Depends on:** Phase 0

**Files to create:**

| File | Purpose |
|---|---|
| `src/types/index.ts` | Core types: `Platform`, `Track`, `Tag`, `TagPreset`, `TagFilter`, `Playlist`, `SearchResult`, `UnifiedSearchResults` |
| `src/db/schema.ts` | SQLite schema (4 tables: `tracks`, `tag_presets`, `tags`, `playlists`), migration runner using `PRAGMA user_version`, `initDatabase()` function, DB singleton via `openDatabaseSync()`, `seedDefaultTagPresets()` for first-launch seeding |
| `src/db/tracks.ts` | `upsertTrack` (dedup via `INSERT OR IGNORE` on platform+platformTrackId), `getTrack`, `getAllTracks`, `deleteTrack`, `getTracksByTagFilter(filterTags)` — the AND-intersection query that powers dynamic playlists |
| `src/db/tags.ts` | `applyTag(trackId, category, value)`, `removeTag(trackId, category, value)`, `getTagsForTrack(trackId)`, `applyFilterTagsToTrack(trackId, filterTags)` (bulk apply for "add to playlist"), `removeFilterTagsFromTrack(trackId, filterTags)` (bulk remove for "remove from playlist") |
| `src/db/tag-presets.ts` | `getPresets()` (grouped by category), `addPreset(category, value)`, `deletePreset(id)`, `deleteCategory(category)`, `addCategory(category)` |
| `src/db/playlists.ts` | `createPlaylist(name, description, filterTags)`, `getPlaylists()` (each with live `trackCount`), `getPlaylistById(id)` (with computed track list), `updatePlaylist(id, name, description, filterTags?)`, `deletePlaylist(id)` |

**Files to modify:**

| File | Change |
|---|---|
| `app/_layout.tsx` | Call `initDatabase()` on mount before rendering children. On first launch, call `seedDefaultTagPresets()`. |

**Key decisions:**
- Use `expo-sqlite` synchronous API (`openDatabaseSync()` for reads, `execAsync()` for schema creation)
- `upsertTrack` uses `INSERT OR IGNORE` on the `(platform, platform_track_id)` unique constraint, then queries back the existing row ID if insert was a no-op
- `getTracksByTagFilter` builds a dynamic query: `SELECT DISTINCT t.* FROM tracks t` with one `AND t.id IN (SELECT track_id FROM tags WHERE category = ? AND value = ?)` subquery per filter tag. This is the core of dynamic playlists.
- `getPlaylists` calls `getTracksByTagFilter` count for each playlist to return live `trackCount`
- Migration strategy: version number in `PRAGMA user_version`. v1 has one migration (initial schema)
- UUID generation via `expo-crypto` (`randomUUID()`)
- Default tag presets seeded on first launch (8 categories, ~80 values — see `prds/tagging-system.md`)

**Done when:** Can programmatically create tracks, apply tags, create playlists with filter tags, and query back the computed track list. Tag preset CRUD works. Verified via console logs.

---

### Phase 2: Library + Track Management

**Goal:** Users can view their saved tracks in a library view. Tracks display with platform badges. The library is the central track collection that playlists will filter against.

**Depends on:** Phase 1

**Files to create:**

| File | Purpose |
|---|---|
| `src/store/library.ts` | Zustand store: `tracks[]`, `loadTracks()`, `saveTrack(track)`, `removeTrack(id)`. Hydrates from SQLite. |
| `src/constants/platforms.ts` | Platform metadata: display names, brand colors (`spotify: #1DB954`, etc.), icon names, URI scheme prefixes, abbreviations (SPO/YT/SC) |
| `src/components/TrackRow.tsx` | Track list item: thumbnail (48x48), title, artist, duration, platform badge, tag count indicator, overflow menu (⋮) |
| `src/components/PlatformBadge.tsx` | Colored dot + platform abbreviation (SPO / YT / SC) |
| `src/components/EmptyState.tsx` | Generic empty state with icon, title, subtitle |

**Files to modify:**

| File | Change |
|---|---|
| `app/(tabs)/library.tsx` | Render saved tracks from Zustand store using TrackRow in a FlatList. Show EmptyState when library is empty. |
| `app/(tabs)/index.tsx` | Show recently added tracks (last 5-10) |
| `app/_layout.tsx` | Hydrate library store from SQLite after DB init |

**Key decisions:**
- The Library tab shows ALL saved tracks, not playlists. This is the new "home base" for the track collection.
- TrackRow shows a small badge/count of how many tags are applied to the track (e.g., "4 tags"). Tapping opens the track detail/tagging view.
- Seed data: a `seedMockData()` helper inserts 5-8 fake tracks across platforms with some tags applied. Only called in development.

**Done when:** Library tab shows saved tracks with platform badges. Tracks persist across app restarts. Empty state shows when no tracks exist.

---

### Phase 3: Tagging System

**Goal:** Users can apply and remove tags on tracks. Tag presets are manageable. The full tagging UX from `prds/tagging-system.md` is functional.

**Depends on:** Phase 2

**Files to create:**

| File | Purpose |
|---|---|
| `src/store/tags.ts` | Zustand store: `presets: Record<string, string[]>` (category → values), `trackTags: Record<string, Tag[]>` (trackId → applied tags), actions for apply/remove/CRUD presets. Hydrates presets from SQLite on launch. |
| `src/hooks/useTags.ts` | Convenience hook: `getTagsForTrack(id)`, `applyTag(trackId, cat, val)`, `removeTag(trackId, cat, val)` |
| `src/components/TagChip.tsx` | Small colored chip displaying a tag value. Tappable for toggle (selected/unselected states). |
| `src/components/TagCategoryGroup.tsx` | A category header + row of TagChip components. Used in both the tagging view and the playlist filter dropdown. |
| `src/components/TagFilterDropdown.tsx` | Multi-select dropdown organized by tag category. Shows all preset values as chips. Selected chips are visually distinguished. Displays selected tags as removable chips below. Shows live count. Used for both playlist creation and playlist editing. |
| `app/track/[id].tsx` | Track detail + tagging screen: shows track metadata (thumbnail, title, artist, platform, duration), all applied tags grouped by category, all available preset tags as toggleable chips. Tapping a chip applies/removes the tag instantly. |
| `app/settings/tag-presets.tsx` | Tag preset management screen: list all categories with values, add/delete values, add/delete categories. Accessible from a settings/gear icon. |

**Files to modify:**

| File | Change |
|---|---|
| `src/components/TrackRow.tsx` | Add navigation to `app/track/[id].tsx` on tap. Show applied tag count badge. |
| `app/_layout.tsx` | Hydrate tag presets store from SQLite on launch |

**Key decisions:**
- Tag application is a toggle — tap to apply, tap again to remove. No confirmation dialog.
- Tags are saved immediately on toggle (no explicit save button).
- Track detail screen shows two sections: "Applied Tags" (grouped by category, showing currently applied tags) and below each category, the available preset values as toggleable chips.
- Tag preset management is a separate screen (not inline in the tagging view) to keep the tagging UX focused.
- Deleting a preset does NOT remove applied instances from tracks (see PRD edge cases).
- Categories are case-insensitive for uniqueness. Values are case-insensitive within their category.

**Done when:** Can navigate to a track's detail view, see available tags, tap to apply/remove tags. Can manage presets (add/delete categories and values). Tags persist across restarts.

---

### Phase 4: Dynamic Playlists

**Goal:** Users can create playlists by selecting tag filters. Playlists show live-computed track lists. Full playlist management from `prds/dynamic-playlists.md` is functional.

**Depends on:** Phase 3

**Files to create:**

| File | Purpose |
|---|---|
| `src/store/playlists.ts` | Zustand store: `playlists[]`, `loadPlaylists()`, `createPlaylist(name, desc, filterTags)`, `updatePlaylist(id, ...)`, `deletePlaylist(id)`, `addTrackToPlaylist(playlistId, trackId)` (applies filter tags to track), `removeTrackFromPlaylist(playlistId, trackId)` (removes filter tags from track). |
| `src/hooks/usePlaylists.ts` | Convenience hook over the Zustand store |
| `src/components/PlaylistCard.tsx` | Card for playlist list views: name, live track count, last updated, platform breakdown (optional) |
| `src/components/AddToPlaylistModal.tsx` | Modal listing all playlists with membership state for a given track. Checkmark on playlists the track is in. Tap to toggle (add/remove). Shows warning about tag side-effects on removal. |
| `app/playlist/[id].tsx` | Playlist detail: header (name, description, edit), active filter tags as chips, live-computed track list via FlatList. Overflow menu on each track with "Remove from Playlist". "Add Tracks" action. |
| `app/playlist/create.tsx` | Playlist creation flow: TagFilterDropdown for selecting filters, live preview of matching tracks below, track count, name input, save button. |

**Files to modify:**

| File | Change |
|---|---|
| `app/(tabs)/library.tsx` | Add "Playlists" section or toggle to switch between library view (all tracks) and playlists view (list of playlists). Add "Create Playlist" CTA. |
| `app/(tabs)/index.tsx` | Show recent playlists (last 3-5 modified) alongside recent tracks |

**Key decisions:**
- Playlist creation uses the TagFilterDropdown. As the user selects/deselects filter tags, the track list below updates live (shows matching tracks from the AND-intersection query).
- "Add to playlist" from a track row opens AddToPlaylistModal. Adding a track to a playlist applies the playlist's filter tags to the track (calls `applyFilterTagsToTrack`). This makes the track a natural member and may cause it to appear in other playlists whose filters are now satisfied.
- "Remove from playlist" removes the playlist's filter tags from the track (calls `removeFilterTagsFromTrack`). A confirmation message warns: "This will remove the tags [X, Y] from this track. It may also be removed from other playlists using these tags."
- Playlist deletion is safe — only the playlist record is deleted, no tracks or tags are affected.
- `getPlaylists()` returns each playlist with a live `trackCount` computed from `getTracksByTagFilter`.
- Track list in playlist detail is sorted alphabetically by artist, then title.

**Done when:** Can create a playlist by selecting tag filters, see the live track list, save it. Playlists show in the library/home view with live counts. Can add/remove tracks via the modal. Editing filters updates the playlist. Deletion works with confirmation.

---

### Phase 5: Spotify Auth + Search

**Goal:** OAuth PKCE login to Spotify. Real search results appear in the search tab. Tracks can be saved to library.

**Depends on:** Phase 2 (needs library to save tracks to)

**Files to create:**

| File | Purpose |
|---|---|
| `src/utils/tokenStorage.ts` | `expo-secure-store` wrappers: `getToken(key)`, `setToken(key, value)`, `deleteToken(key)`. Store tokens with `expiresAt` timestamp for refresh logic. |
| `src/auth/spotify-auth.ts` | OAuth2 PKCE flow using `expo-auth-session`. Uses `makeRedirectUri({ scheme: 'unison' })`. Handles `promptAsync()`, token exchange, and refresh token flow. Spotify tokens expire in 1hr — store `expiresAt` alongside token. |
| `src/api/spotify.ts` | `searchTracks(query, token): Promise<SpotifySearchResponse>`. Calls `GET /search?q={query}&type=track&limit=10`. Checks token expiry before each request, refreshes if needed. |
| `src/utils/normalizeTrack.ts` | `mapSpotifyTrack(apiItem) -> Track`: extracts `id`, `name`, `artists[0].name`, `album.name`, `album.images[0].url`, `duration_ms / 1000`, constructs `spotify:track:{id}` deep link and `https://open.spotify.com/track/{id}` web URL. |
| `src/store/auth.ts` | Zustand store: per-platform token state, `isConnected` flags, `connect(platform)` / `disconnect(platform)` actions |
| `src/store/search.ts` | Zustand store: `query`, `results: UnifiedSearchResults`, `isLoading`, `search(query)` action |
| `src/hooks/useUnifiedSearch.ts` | Calls Spotify search (YouTube added in Phase 6). Uses `Promise.allSettled` for graceful degradation. 400ms debounce. |
| `src/components/SearchBar.tsx` | Text input with search icon, debounced `onChangeText` (400ms) |

**Files to modify:**

| File | Change |
|---|---|
| `app/(tabs)/search.tsx` | Wire up SearchBar + FlatList of search results. Each result has "Save to Library" action (calls `upsertTrack` → track appears in library). Optionally "Save & Tag" to jump to tagging view after saving. |
| `app/_layout.tsx` | Hydrate auth store from secure storage on launch |

**Key decisions:**
- Search results are NOT automatically saved to the library. The user explicitly saves tracks they want to keep.
- "Save to Library" is the primary action on a search result. Once saved, the track is in the library and can be tagged → enters playlists.
- Optional shortcut: "Save & Tag" saves the track and immediately navigates to `app/track/[id].tsx` for tagging.
- "Add to Playlist" is also available on search results — it saves the track (if not already saved), then opens the AddToPlaylistModal. Adding to a playlist applies the filter tags, so the track gets tagged in one action.

**Done when:** Can connect Spotify, search for tracks, see real results with thumbnails, save tracks to library, and optionally tag them or add them to playlists.

---

### Phase 6: YouTube Search

**Goal:** YouTube results appear alongside Spotify in unified search. Grouped display with platform badges.

**Depends on:** Phase 5

**Files to create:**

| File | Purpose |
|---|---|
| `src/api/youtube.ts` | `searchVideos(query, apiKey): Promise<YouTubeSearchResponse>`. Calls `GET /search?part=snippet&q={query}&type=video&videoCategoryId=10&maxResults=10&key={apiKey}`. **No OAuth — API key only.** |

**Files to modify:**

| File | Change |
|---|---|
| `src/utils/normalizeTrack.ts` | Add `mapYouTubeVideo(apiItem) -> Track`. Title from `snippet.title`, artist from `snippet.channelTitle`, thumbnail from `snippet.thumbnails.high.url`. Duration stored as `undefined`. Deep link: `youtube://www.youtube.com/watch?v={id}` (iOS) / `vnd.youtube:{id}` (Android). Web URL: `https://www.youtube.com/watch?v={id}`. |
| `src/hooks/useUnifiedSearch.ts` | Add YouTube to `Promise.allSettled` call |
| `src/constants/platforms.ts` | Verify YouTube deep link formats per platform |
| `app/(tabs)/search.tsx` | Display results grouped by platform (Spotify section, then YouTube section) |

**Key decisions:**
- No YouTube OAuth. API key passed as query param `&key=${apiKey}`
- Lightweight daily quota counter in Zustand (not persisted — resets on app restart). Show warning at ~80 searches/day.
- Duration is `undefined` for YouTube tracks

**Done when:** Search returns results from both Spotify and YouTube, displayed with platform badges. Tracks from either platform can be saved to library.

---

### Phase 7: SoundCloud Manual Paste

**Goal:** Paste a SoundCloud URL, resolve its metadata via oEmbed, save to library.

**Depends on:** Phase 2 (independent of Phases 5-6)

**Files to create:**

| File | Purpose |
|---|---|
| `src/api/soundcloud.ts` | `resolveTrack(url): Promise<SoundCloudOEmbedResponse>`. Calls oEmbed endpoint. Extracts track ID from embed HTML for deep link construction. |
| `app/track/add-soundcloud.tsx` | Paste URL screen: TextInput for URL, preview card showing resolved metadata, "Save to Library" button. Optionally "Save & Tag" to jump to tagging. |

**Files to modify:**

| File | Change |
|---|---|
| `src/utils/normalizeTrack.ts` | Add `mapSoundCloudOEmbed(oEmbedResponse, originalUrl) -> Track`. |

**Key decisions:**
- oEmbed `title` often includes artist prefix. Parse on ` - ` delimiter to split artist/title.
- Entry point: accessible from Library tab via a "+" action or from search tab as an alternative input mode.

**Done when:** Can paste a real SoundCloud URL, see its resolved metadata, and save it to the library.

---

### Phase 8: Deep Link Playback

**Goal:** Tapping any track opens it in the native app. Falls back to browser if app isn't installed.

**Depends on:** Phase 2 (independent of other phases)

**Files to create:**

| File | Purpose |
|---|---|
| `src/utils/deepLinks.ts` | `openTrack(track: Track): Promise<void>`. Uses `Linking.canOpenURL(track.deepLinkUri)` — if true, opens deep link; otherwise opens `track.webFallbackUrl` in system browser. |
| `src/hooks/useDeepLink.ts` | Wrapper hook providing `openTrack` with loading/error state |

**Files to modify:**

| File | Change |
|---|---|
| `src/components/TrackRow.tsx` | Add play button / tap action that calls `openTrack(track)` (distinct from the tag navigation tap target) |
| `app.json` | Add `ios.infoPlist.LSApplicationQueriesSchemes: ["spotify", "youtube", "soundcloud"]` |

**Key decisions:**
- `canOpenURL` on iOS requires declared schemes in `app.json`. Without this, every track falls back to browser.
- Fallback opens in system browser (not in-app browser).
- Full `canOpenURL` testing requires a dev build or EAS build.
- TrackRow needs two distinct tap targets: one for play (deep link), one for navigation to tag/detail view. Play button on the left (thumbnail area), tag/detail on the right (text area).

**Done when:** Tapping a track's play action opens Spotify/YouTube/SoundCloud app (or browser if not installed).

---

### Phase 9: Polish & Edge Cases

**Goal:** Refine the experience. Handle error states, loading states, and visual polish.

**Depends on:** All previous phases

**Work items:**

| Area | Details |
|---|---|
| Loading states | Spinners or skeleton screens for search results, playlist track lists, tag loading |
| Error handling | Error banners when a platform search fails — partial results still shown from other platforms |
| Auth prompt | "Connect Spotify" card on search screen when not authenticated. Search degrades gracefully. |
| Delete confirmation | Alert dialog before deleting a playlist. Warning message on "remove from playlist" explaining tag side-effects. |
| Track removal | Swipe-to-delete or long-press on tracks in library to remove from library entirely (deletes all tags too). |
| Playlist side-effect warning | When removing a track from a playlist, show which other playlists will be affected (if any share the same filter tags). |
| Empty states | "No tracks match these filters" for empty playlists. "Save some tracks to get started" for empty library. "No tags yet — tap a track to start tagging" for untagged library. |
| App branding | Custom app icon and splash screen |
| Documentation | README with setup instructions, API key registration steps, and build commands |

**Done when:** No crashes on error paths. Loading states throughout. Side-effect warnings on playlist removal. Visually cohesive dark theme.

---

## Dependency Graph

```
Phase 0 (Shell)
    │
Phase 1 (DB + Types)
    │
Phase 2 (Library + Tracks)──────┬──────────┬──────────┐
    │                            │          │          │
Phase 3 (Tagging)          Phase 7 (SC)  Phase 8    Phase 5 (Spotify)
    │                            │     (Deep Links)    │
Phase 4 (Dynamic Playlists)      │          │        Phase 6 (YouTube)
    │                            │          │          │
    └────────────────────────────┴──────────┴──────────┘
                         │
                   Phase 9 (Polish)
```

**Hard sequential chain:** 0 → 1 → 2 → 3 → 4 (the core product flow must be built in order)
**Independent branches after Phase 2:** Phases 5-6 (search), Phase 7 (SoundCloud), Phase 8 (deep links)
**Phase 9** comes last after everything is wired up.

---

## Complete File Manifest

### Files created by Expo scaffolding (Phase 0):
- `package.json`, `tsconfig.json`, `babel.config.js`, `app.json`

### Files we create:

```
app/
├── _layout.tsx                          # Phase 0 (modified in 1, 2, 3, 5)
├── (tabs)/
│   ├── _layout.tsx                      # Phase 0
│   ├── index.tsx                        # Phase 0 (built out in 2, 4)
│   ├── search.tsx                       # Phase 0 (built out in 5, modified in 6)
│   └── library.tsx                      # Phase 0 (built out in 2, modified in 4)
├── track/
│   ├── [id].tsx                         # Phase 3 (track detail + tagging)
│   └── add-soundcloud.tsx               # Phase 7
├── playlist/
│   ├── [id].tsx                         # Phase 4 (playlist detail + live track list)
│   └── create.tsx                       # Phase 4 (tag filter selection + save)
└── settings/
    └── tag-presets.tsx                   # Phase 3 (preset management)

src/
├── types/
│   └── index.ts                         # Phase 1
├── db/
│   ├── schema.ts                        # Phase 1
│   ├── tracks.ts                        # Phase 1
│   ├── tags.ts                          # Phase 1
│   ├── tag-presets.ts                   # Phase 1
│   └── playlists.ts                     # Phase 1
├── auth/
│   └── spotify-auth.ts                  # Phase 5
├── api/
│   ├── spotify.ts                       # Phase 5
│   ├── youtube.ts                       # Phase 6
│   └── soundcloud.ts                    # Phase 7
├── store/
│   ├── library.ts                       # Phase 2
│   ├── tags.ts                          # Phase 3
│   ├── playlists.ts                     # Phase 4
│   ├── auth.ts                          # Phase 5
│   └── search.ts                        # Phase 5
├── hooks/
│   ├── useTags.ts                       # Phase 3
│   ├── usePlaylists.ts                  # Phase 4
│   ├── useUnifiedSearch.ts              # Phase 5 (modified in 6)
│   └── useDeepLink.ts                   # Phase 8
├── components/
│   ├── TrackRow.tsx                     # Phase 2 (modified in 3, 8)
│   ├── PlatformBadge.tsx                # Phase 2
│   ├── EmptyState.tsx                   # Phase 2
│   ├── TagChip.tsx                      # Phase 3
│   ├── TagCategoryGroup.tsx             # Phase 3
│   ├── TagFilterDropdown.tsx            # Phase 3 (used heavily in 4)
│   ├── PlaylistCard.tsx                 # Phase 4
│   ├── AddToPlaylistModal.tsx           # Phase 4
│   └── SearchBar.tsx                    # Phase 5
├── constants/
│   ├── colors.ts                        # Phase 0
│   ├── typography.ts                    # Phase 0
│   └── platforms.ts                     # Phase 2
└── utils/
    ├── deepLinks.ts                     # Phase 8
    ├── normalizeTrack.ts                # Phase 5 (modified in 6, 7)
    └── tokenStorage.ts                  # Phase 5

.env.example                             # Phase 0
.gitignore                               # Phase 0
```

**Total files we write: ~38** (excluding Expo scaffolding)

---

## Verification Strategy

| Phase | How to verify |
|---|---|
| 0 | `npx expo start` → dark 3-tab app renders on simulator/device |
| 1 | Console logs show successful track + tag + preset + playlist CRUD. Dynamic query returns correct tracks for given filter tags. |
| 2 | Library tab shows saved tracks. Tracks persist across app restarts. Empty state shows when no tracks. |
| 3 | Tap a track → see tag presets → tap chips to apply/remove tags → tags persist. Manage presets screen: add/delete categories and values. |
| 4 | Create playlist with tag filters → see live track count → save → playlist appears in list. Tag a track → it appears in matching playlists. Remove track from playlist → warning shown → tags removed. |
| 5 | Connect Spotify → search "Bohemian Rhapsody" → see real results → save to library → track appears in Library tab |
| 6 | Same search → results from both Spotify AND YouTube → platform badges visible |
| 7 | Paste real SoundCloud URL → metadata resolves → save to library |
| 8 | Tap Spotify track play button → Spotify app opens. Tap YouTube track → YouTube opens. Uninstall an app → browser fallback works. |
| 9 | Search with no internet → error banner. Delete playlist → confirm dialog. Remove from playlist → side-effect warning lists affected playlists. |
