# Unit Testing Report — 001: Testability Readiness Audit

**Date:** 2026-03-23
**Scope:** Every module in `src/` evaluated for unit testability without refactoring
**Verdict:** 88% of exports are testable today. 3 exports across 2 files are BLOCKED.

---

## Executive Summary

| Category | Count | % |
|---|---|---|
| READY (pure, zero mocking) | 12 exports | 16% |
| NEEDS_MOCK (testable with standard mocks) | 60 exports | 80% |
| BLOCKED (requires refactoring) | 3 exports | 4% |
| **Total testable without refactoring** | **72 / 75** | **96%** |

The codebase is overwhelmingly testable today. Only 3 functions across 2 files cannot be tested without a code change, and each fix is a single-line change (move env var read from module scope into function scope).

---

## Existing Coverage

| Test file | Coverage |
|---|---|
| `__tests__/normalize-track.test.ts` | `mapSpotifyTrack`, `mapYouTubeVideo`, `mapSoundCloudOEmbed`, `getDeepLinkUri` |
| `__tests__/deep-links.test.ts` | `getDeepLinkUri` (redundant with above) |
| `__tests__/dynamic-playlist-query.test.ts` | `upsertTrack`, `getTracksByTagFilter`, `applyTag` via in-memory SQLite mock |
| `__tests__/migrations.test.ts` | `runMigrations`, `getDb`, `seedDefaultTagPresets` |

**27 tests passing across 4 suites.**

---

## READY — Pure Functions, Zero Mocking Needed

These can be tested with a plain `expect(fn(input)).toBe(output)` — no setup, no mocks.

| File | Export | Why it's pure |
|---|---|---|
| `src/types/index.ts` | `isTagFilter` | Predicate: `unknown` → `boolean`. No deps. |
| `src/constants/colors.ts` | `colors` | Plain object literal. |
| `src/constants/typography.ts` | `typography` | Plain object literal. |
| `src/constants/platforms.ts` | `platformMeta` | Plain object, imports only `colors` (constant). |
| `src/utils/normalize-track.ts` | `mapSpotifyTrack` | Pure data transformation. Already tested. |
| `src/utils/normalize-track.ts` | `mapSoundCloudOEmbed` | Pure. Delegates to pure helpers. Already tested. |
| `src/api/soundcloud.ts` | `extractSoundCloudTrackId` | Pure string parsing. Not yet directly tested. |
| `src/api/soundcloud.ts` | `parseSoundCloudTitle` | Pure string parsing. Not yet directly tested. |
| `src/components/TagChip.tsx` | `TagChip` | Pure presentational. No native module deps beyond RN primitives. |
| `src/components/TagCategoryGroup.tsx` | `TagCategoryGroup` | Composes `TagChip` (pure). No external deps. |

---

## NEEDS_MOCK — Testable Today With Standard Mocks

These require mocking one or more dependencies, but the mocks are straightforward and well-established patterns.

### Mock Patterns Already Proven in the Codebase

| Pattern | Where it's used | What it mocks |
|---|---|---|
| `jest.mock('expo-sqlite', ...)` | `dynamic-playlist-query.test.ts`, `migrations.test.ts` | In-memory SQLite with `runSync`, `getFirstSync`, `getAllSync` |
| `jest.mock('expo-crypto', ...)` | Both test files | `randomUUID()` |
| `jest.mock('react-native', ...)` | `normalize-track.test.ts` | `Platform.OS` |

### Additional Mocks Needed for Remaining Modules

| Dependency | Mock approach | Modules that need it |
|---|---|---|
| `global.fetch` | `jest.spyOn(global, 'fetch')` | `spotify.ts`, `youtube.ts`, `soundcloud.ts`, `spotify-auth.ts` |
| `expo-secure-store` | `jest.mock('expo-secure-store', () => ({ getItemAsync: jest.fn(), ... }))` | `token-storage.ts` |
| `expo-auth-session` | `jest.mock('expo-auth-session', ...)` (mock `AuthRequest` class) | `spotify-auth.ts` |
| `expo-web-browser` | `jest.mock('expo-web-browser', ...)` | `spotify-auth.ts` (module-level side effect) |
| `@expo/vector-icons` | `jest.mock('@expo/vector-icons', () => ({ Ionicons: 'Ionicons' }))` | All components using Ionicons |
| `react-native` `Alert` | `jest.spyOn(Alert, 'alert')` | `AddToPlaylistModal.tsx` |
| `react-native` `Linking` | Mock `canOpenURL` + `openURL` | `deep-links.ts` |

### Module-by-Module Breakdown

**`src/utils/` (3 files, 8 exports) — All NEEDS_MOCK**

| Export | Mock needed | Notes |
|---|---|---|
| `normalize-track.ts` → `getDeepLinkUri` | `react-native` Platform.OS | Already mocked in tests. Android branch untested. |
| `normalize-track.ts` → `mapYouTubeVideo` | Same | Already tested. |
| `deep-links.ts` → `openTrack` | `react-native` Linking | 3 branches: native open, web fallback, exception fallback. |
| `token-storage.ts` → all 4 | `expo-secure-store` + fake timers | `isStoredToken` type guard tested indirectly via `getToken`. |

**`src/api/` (3 files, 4 testable exports)**

| Export | Mock needed | Notes |
|---|---|---|
| `soundcloud.ts` → `resolveSoundCloudTrack` | `global.fetch` | Test OK/error responses. |
| `spotify.ts` → `searchSpotifyTracks` | `spotify-auth` + `global.fetch` | Test 200/401-retry/429/network-error paths. |
| `youtube.ts` → `searchYouTubeVideos` | `global.fetch` | **BLOCKED** (see below). |

**`src/auth/` (1 file, 3 testable exports)**

| Export | Mock needed | Notes |
|---|---|---|
| `getSpotifyToken` | `token-storage` + `global.fetch` | 3 paths: no token, valid token, expired→refresh. |
| `connectSpotify` | `expo-auth-session` + `expo-web-browser` + `global.fetch` | Heavy mock: `AuthRequest` class constructor. Doable but non-trivial. |
| `disconnectSpotify` | `token-storage` | Trivial. |

**`src/db/` (5 files, 30 exports) — All NEEDS_MOCK via SQLite mock**

The in-memory SQLite mock pattern from `dynamic-playlist-query.test.ts` covers all DB modules. Specific untested areas:

| High-value untested logic | File | Why it matters |
|---|---|---|
| `rowToPlaylist` JSON parsing + `isTagFilter` validation | `playlists.ts:7-18` | Guards against DB corruption. Fallback to `[]` is silent and untested. |
| `upsertTrack` "not found after insert" error branch | `tracks.ts:46` | Should never happen but if it does, the error is the only signal. |
| `addPreset` normalization (`.toLowerCase().trim()`) | `tag-presets.ts:40-41` | Ensures case-insensitive uniqueness. |
| `getPresetsGrouped` grouping loop | `tag-presets.ts:24-33` | Pure logic embedded in DB function. |

**`src/store/` (5 files, 5 stores) — All NEEDS_MOCK**

Zustand stores are testable without React — call `store.getState().action()`, then assert `store.getState()`. Each store requires mocking its corresponding `db/` module. The `auth` store additionally requires mocking `spotify-auth` (which has module-level side effects).

| Store | Key behaviors to test |
|---|---|
| `library` | `saveTrack` returns `UpsertResult` with `wasInserted`, `loadTracks` hydrates `tracks` array |
| `tags` | `applyTag`/`removeTag` update `trackTags[trackId]` correctly, `loadPresets` populates `presets` and `allPresets` |
| `playlists` | `addTrackToPlaylist` applies filter tags to track, `removeTrackFromPlaylist` removes them, `isTrackInPlaylist` returns correct boolean |
| `auth` | `connectSpotify` sets error state on failure, `hydrate` sets `spotifyConnected` based on stored token |
| `search` | `Promise.allSettled` partial failure: Spotify fails but YouTube succeeds (and vice versa), empty query guard |

**`src/components/` (9 files) — Mostly NEEDS_MOCK**

All components are presentational with props-in/events-out. The only mock consistently needed is `@expo/vector-icons`. Components don't import from `src/db/` or `src/store/`, making them clean to test in isolation.

| Component | Interesting test cases |
|---|---|
| `TrackRow` | Duration formatting: 0s, 59s, 354s → "5:54", undefined → no display. Tap targets: `onPress` vs `onPlay`. Tag count badge visibility. |
| `TagFilterDropdown` | Trigger label changes with selection count. Applied tags strip. Modal open/close. Category alphabetical sort. |
| `AddToPlaylistModal` | Confirmation alert on remove (with tag list in message). Null track returns null. Already-in-playlist checkmark. |
| `PlaylistCard` | Filter summary string. Default track count 0. |
| `SearchBar` | Clear button visibility. `debounceMs` prop is dead code (test would reveal this). |

---

## BLOCKED — Requires Refactoring (3 exports, 2 files)

### `src/api/youtube.ts` — `searchYouTubeVideos` and `isYouTubeConfigured`

**Root cause:** Line 2 captures the env var at module evaluation time:
```typescript
const API_KEY = process.env.EXPO_PUBLIC_YOUTUBE_API_KEY ?? '';
```

By the time any test runs, `API_KEY` is already frozen in the module closure. You cannot test both the "key present" and "key missing" paths in the same test suite without `jest.resetModules()` + re-import (fragile, not idiomatic).

**Fix (no refactor needed — one-line change):**
Move `const API_KEY` inside each function body so the env var is read at call time:
```typescript
export function isYouTubeConfigured(): boolean {
  return (process.env.EXPO_PUBLIC_YOUTUBE_API_KEY ?? '').length > 0;
}
```

### `src/auth/spotify-auth.ts` — `isSpotifyConfigured`

**Same root cause:** Line 9:
```typescript
const CLIENT_ID = process.env.EXPO_PUBLIC_SPOTIFY_CLIENT_ID ?? '';
```

**Same fix:** Read `process.env` inside the function body.

---

## Embedded Pure Logic Not Independently Testable

These are pure logic blocks trapped inside impure functions. They work correctly but cannot be unit-tested in isolation without extracting them.

| Location | Logic | Risk if untested |
|---|---|---|
| `playlists.ts:7-18` | `rowToPlaylist` — JSON parse + `isTagFilter` validation + fallback | Corrupt DB row silently turns a filtered playlist into "all tracks" |
| `tag-presets.ts:40-41` | `.toLowerCase().trim()` normalization in `addPreset` | Duplicate presets with different casing |
| `tag-presets.ts:24-33` | Category grouping loop in `getPresetsGrouped` | Wrong preset rendering in UI |
| `TrackRow.tsx:17-19` | Duration formatting (`Math.floor`, `padStart`) | "NaN:NaN" or "0:0" display for edge cases |
| `AddToPlaylistModal.tsx:24-26` | Filter tag → string join for alert message | Wrong confirmation text |

These are not BLOCKED — they *can* be tested through the parent function's mock path. But they'd benefit from extraction into standalone pure functions for direct assertion.

---

## Module-Level Side Effects (Footguns)

Two files execute code at import time that can break tests if not anticipated:

| File | Side effect | Impact |
|---|---|---|
| `src/auth/spotify-auth.ts:6` | `WebBrowser.maybeCompleteAuthSession()` | Crashes if `expo-web-browser` is not mocked before import |
| `src/auth/spotify-auth.ts:16` | `makeRedirectUri({ scheme: 'unison' })` | Crashes if `expo-auth-session` is not mocked before import |

**Any test file** that imports `src/store/auth.ts` (which imports `spotify-auth.ts`) will trigger these unless the entire `spotify-auth` module is mocked at the boundary. The existing codebase handles this correctly, but it's an invisible trap for new test authors.

---

## Coverage Gap Analysis

### What's tested today (27 tests)

| Area | Coverage quality |
|---|---|
| Track normalization (Spotify, YouTube, SoundCloud) | Excellent — all field mappings, edge cases, fallbacks |
| Deep link URI generation | Good — all 3 platforms + exhaustive switch |
| Dynamic playlist AND-query | Excellent — single filter, multi-filter, no-match, empty-filter |
| DB migration system | Basic — verifies tables/indexes created, version set |

### What's NOT tested (high priority)

| Area | Risk | Effort to test |
|---|---|---|
| `rowToPlaylist` corrupt JSON fallback | High — silent data loss | Low (mock `getDb().getFirstSync` to return malformed JSON) |
| `upsertTrack` INSERT OR IGNORE dedup behavior | Medium — duplicate tracks | Low (already have the SQLite mock pattern) |
| `token-storage` type guard (`isStoredToken`) | Medium — corrupted tokens accepted | Low (mock `SecureStore.getItemAsync` with bad JSON) |
| Spotify 401→refresh retry loop | High — broken auth recovery | Medium (mock `fetch` to return 401 then 200) |
| Search store `Promise.allSettled` partial failure | High — one platform error hides results | Low (mock API modules to reject) |
| TrackRow duration formatting edge cases | Low — cosmetic | Trivial (pure logic, just assert strings) |
| `SearchBar` dead `debounceMs` prop | Low — misleading API | Trivial (test would immediately reveal the bug) |

---

## Recommended Test Execution Order

Based on risk × effort:

1. **`rowToPlaylist` JSON corruption** — highest risk, lowest effort
2. **Search store partial failure** — high risk, low effort
3. **`token-storage` type guard** — catches corrupted auth data
4. **Spotify 401 retry** — high risk, medium effort
5. **`upsertTrack` dedup behavior** — medium risk, low effort
6. **Store action state transitions** — systematic coverage of all 5 stores
7. **Component rendering** — presentational tests with `@testing-library/react-native`
8. **`openTrack` deep link** — mock `Linking`, 3 branches

---

## Conclusion

The codebase is in strong shape for unit testing. 96% of exports are testable today with standard Jest mocking patterns. The 3 BLOCKED functions need a trivial one-line fix each (move env var read into function body). The biggest testing gaps are in error/corruption recovery paths that are currently untested but straightforward to cover with the existing mock infrastructure.
