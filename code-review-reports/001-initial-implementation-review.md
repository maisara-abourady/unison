# Code Review Report — 001: Initial Implementation

**Date:** 2026-03-23
**Scope:** Full codebase review (Phases 0–8) against `references/code-review-manifest.md`
**Files reviewed:** 40 files in `app/` and `src/`
**Verdict:** NOT READY — 12 blockers, 28 majors, 14 minors, 3 nitpicks

---

## Blockers (12) — Must Fix Before Any Phase is Done

### B-01: No Migration System
**Manifest:** Section 1.2
**Files:** `src/db/schema.ts`, `app/_layout.tsx`

No `PRAGMA user_version`, no `runMigrations()` function, no `CURRENT_SCHEMA_VERSION` constant. Current `initDatabase()` uses raw `CREATE TABLE IF NOT EXISTS` — safe for first install but will corrupt data if the schema ever changes. The root layout has no try/catch on init — if DB init throws, the app hangs on a spinner forever.

**Fix:**
- Add `CURRENT_SCHEMA_VERSION = 1` constant
- Implement `runMigrations(db)` with sequential numbered migrations
- Set `PRAGMA user_version` after each migration
- Root layout must try/catch the init sequence and render an error screen on failure

---

### B-02: Missing `AppError` Type
**Manifest:** Section 4.1
**File:** `src/types/errors.ts` — does not exist

The discriminated union `AppError` (`DB_ERROR`, `AUTH_EXPIRED`, `AUTH_FAILED`, `API_ERROR`, `SOUNDCLOUD_RESOLVE_FAILED`, `DEEP_LINK_FAILED`, `MIGRATION_FAILED`) is completely absent.

**Fix:** Create `src/types/errors.ts` with the full `AppError` type as specified in the manifest.

---

### B-03: `TagFilter` AND Semantics Not Documented in Types
**Manifest:** Section 1.1
**File:** `src/types/index.ts:31-34`

`TagFilter` interface and `Playlist.filterTags` field have no JSDoc comment stating that AND logic is used. The playlist creation UI also doesn't communicate this to the user.

**Fix:**
- Add JSDoc: `/** AND semantics — a track must match ALL tags in this array to appear in the playlist. */`
- Add helper text in `app/playlist/create.tsx`: "Tracks must match all selected tags"

---

### B-04: Screens Import Directly from `src/db/`
**Manifest:** Section 1.4
**Files:**
- `app/track/[id].tsx:14` — `import { getTrack } from '../../src/db/tracks'`
- `app/playlist/create.tsx:12` — `import { getTracksByTagFilter } from '../../src/db/tracks'`
- `app/settings/tag-presets.tsx:9` — `import { getAllPresets } from '../../src/db/tag-presets'`
- `src/components/AddToPlaylistModal.tsx:6` — `import { getTracksByTagFilter } from '../db/tracks'`

Four files bypass the store layer and call DB functions directly, violating the required data flow pattern: Screen → Hook → Store → DB.

**Fix:** Expose the needed data through store actions/selectors. Remove all `src/db/` imports from screens and components.

---

### B-05: Filter Query Re-implemented Outside Canonical Path
**Manifest:** Section 1.1
**Files:** `AddToPlaylistModal.tsx:20-23`, `playlist/create.tsx:30`

Both call `getTracksByTagFilter` directly from the DB layer. The canonical path for playlist membership calculation should only go through the playlists store.

**Fix:** Consolidate via store. `AddToPlaylistModal` should receive membership data as a prop or via a store method. `create.tsx` should call a store action for live preview.

---

## Majors (28)

### M-01: Orphaned Tags Affect Playlist Membership Silently
**Section 1.3** | `src/db/schema.ts`
No FK from `tags` to `tag_presets`. Deleting a preset leaves applied tags intact — they still satisfy playlist filters but are invisible in the tag UI. No code comment documents this as intentional.
**Fix:** Add `// Why:` comment documenting the orphan-by-design decision and its UX consequences.

### M-02: Missing `idx_tracks_added_at` Index
**Section 2.2** | `src/db/schema.ts`
`getAllTracks()` orders by `added_at DESC` with no supporting index.
**Fix:** Add `CREATE INDEX IF NOT EXISTS idx_tracks_added_at ON tracks(added_at);`

### M-03: `upsertTrack` Uses SELECT-then-INSERT Instead of INSERT OR IGNORE
**Section 2.3** | `src/db/tracks.ts:20-41`
Two DB round trips instead of one atomic statement. Return value doesn't distinguish inserted vs. already-existed.
**Fix:** Rewrite to use `INSERT OR IGNORE`, then SELECT to check what happened. Return `{ track: Track; wasInserted: boolean }`.

### M-04: Search Results Don't Show "Already Saved" Indicator
**Section 2.3** | `app/(tabs)/search.tsx:110-122`
All search results show the same `add-circle-outline` icon regardless of library membership.
**Fix:** Check library store for existing tracks, show filled icon for already-saved tracks.

### M-05: Unsafe Double-Casts in Search Store
**Section 3.1** | `src/store/search.ts:38-41`
`mapSpotifyTrack(item) as unknown as Track` — the `as unknown as` pattern is the moral equivalent of `any`. The types are intentionally discarded.
**Fix:** Update `SearchResult` type to use `Omit<Track, 'id' | 'addedAt'>`, or generate placeholder IDs in the normalize functions.

### M-06: No Exhaustive Switch on Platform Type
**Section 3.2** | Entire codebase
No `switch` on the `Platform` type with a `never` default case exists anywhere. Adding a new platform would silently produce incomplete coverage.
**Fix:** Create a `getDeepLinkUri(platform: Platform, id: string): string` utility with an exhaustive switch.

### M-07: Auth Store Silently Swallows Connect Errors
**Section 4.2** | `src/store/auth.ts:30-33`
`catch` block returns `false` with no `console.error` or error state. User gets no feedback.
**Fix:** Set an `error` field in the auth store, surface in the UI.

### M-08: HTTP 401 from Spotify Doesn't Trigger Refresh
**Section 4.3, 5.1** | `src/api/spotify.ts:32-34`
A 401 response throws a generic error instead of attempting token refresh (clock-skew safety).
**Fix:** Add 401 handling: attempt refresh, retry once, then throw.

### M-09: HTTP 429 Shows Raw Status Code
**Section 4.3** | `src/api/spotify.ts:33`, `src/api/youtube.ts:32`
Rate limit errors show "search failed: 429" instead of user-readable messaging.
**Fix:** Check for 429 specifically, throw with "Too many requests — try again shortly."

### M-10: No Network Offline Detection
**Section 4.3** | Entire codebase
No offline detection. Network failures produce raw JS errors.
**Fix:** Check `NetInfo` or catch `TypeError: Network request failed` and surface a clear "You're offline" banner.

### M-11: DB Write Calls Not Wrapped in try/catch
**Section 4.4** | `src/db/tracks.ts:34-38`, `src/db/playlists.ts:28-31,77-86`, `src/db/tags.ts:29-34`
Multiple `db.runSync` calls can throw on disk full / corruption with no error handling.
**Fix:** Wrap DB writes in try/catch, propagate structured `AppError`.

### M-12: DB Failure Can Leave Store Inconsistent
**Section 4.4** | `src/store/library.ts:20-24`, `src/store/tags.ts:55-60`, `src/store/playlists.ts:27-29`
If a DB write throws, the store update never fires and the UI shows stale data. No try/catch to recover.
**Fix:** Wrap in try/catch. If write fails, don't update store, surface error.

### M-13: Refresh Failure Doesn't Prompt Re-auth
**Section 5.1** | `src/auth/spotify-auth.ts:73-95`
`refreshSpotifyToken` returns `null` on failure. Caller throws "Not connected" — no re-auth prompt.
**Fix:** Auth store should set `spotifyConnected: false` on refresh failure, triggering the "Connect Spotify" card.

### M-14: Token Keys Not Namespaced
**Section 5.2** | `src/auth/spotify-auth.ts:7`
Key is `'spotify_token'` — manifest requires `'unison.spotify.access_token'`.
**Fix:** Rename to `'unison.spotify.token'` or similar namespaced format.

### M-15: SoundCloud ID Extracted from oEmbed HTML (Fragile)
**Section 6.2** | `src/api/soundcloud.ts:23-32`, `src/utils/normalizeTrack.ts:44-45`
ID is extracted from the oEmbed `html` iframe URL. Manifest explicitly says "not from oEmbed HTML (fragile)."
**Fix:** Extract from the original pasted URL path instead (e.g., parse the URL slug), with oEmbed HTML as a fallback.

### M-16: YouTube 403 Doesn't Reference Quota
**Section 6.4** | `src/api/youtube.ts:32`
A 403 is not distinguished from other errors. No quota-specific messaging.
**Fix:** Check for 403, throw with "YouTube API quota exceeded — try again tomorrow."

### M-17: TrackRow Deep Link Tap Target Not Functional
**Section 8.2** | `src/components/TrackRow.tsx`
The `onPlay` prop exists but no screen passes it. `openTrack` from `deepLinks.ts` is never called from any screen.
**Fix:** Wire `onPlay={() => openTrack(track)}` in library and playlist detail screens.

### M-18: Non-Component Files Not in kebab-case
**Section 11.2** | Three files:
- `src/utils/normalizeTrack.ts` → `normalize-track.ts`
- `src/utils/deepLinks.ts` → `deep-links.ts`
- `src/utils/tokenStorage.ts` → `token-storage.ts`

### M-19 through M-24: Missing Test Files and Setup
**Section 10** | Entire `__tests__/` directory missing
- No `jest`, `jest-expo`, or `@testing-library/react-native` in devDependencies
- No `jest.config.js`
- Missing: `normalizeTrack.test.ts`, `deepLinks.test.ts`, `dynamicPlaylistQuery.test.ts`, `migrations.test.ts`

### M-25: Playlist UI Doesn't Communicate AND Logic
**Section 1.1** | `app/playlist/create.tsx`
No text explains that tracks must match ALL selected tags.
**Fix:** Add helper text below the TagFilterDropdown.

### M-26: `tracks` Table Missing `updated_at` Column
**Section 2.4** | `src/db/schema.ts`
The manifest says it's cheap to add now even if unused in v1.

### M-27: Every New File Missing Top-Level Responsibility Comment
**Manifest: Phase Completion Checklist** | All 40 files
No file has a one-line comment at the top stating its responsibility, as required by the manifest.

### M-28: No `console.error` in Error Paths
**Section 4.2** | Multiple files
Error paths silently set state or return null without `console.error`. The manifest requires at minimum `console.error` with structured messages for real errors.

---

## Minors (14)

| # | Section | File | Issue |
|---|---|---|---|
| m-01 | 2.1 | `schema.ts` | `artist TEXT` should be `NOT NULL DEFAULT ''` to match type |
| m-02 | 2.2 | `schema.ts` | Index named `idx_tags_track` not `idx_tags_track_id` |
| m-03 | 2.2 | `schema.ts` | `idx_tracks_platform` is composite, manifest wants single-column |
| m-04 | 3.1 | `tokenStorage.ts` | `JSON.parse` return unvalidated as `StoredToken` |
| m-05 | 3.4 | `playlists.ts:8` | `filter_tags` parsed value not structurally validated |
| m-06 | 4.2 | `add-soundcloud.tsx:33` | catch discards error `e` without logging |
| m-07 | 6.3 | `youtube.ts:25` | `videoCategoryId=10` hardcoded, not configurable |
| m-08 | 8.1 | `track/[id].tsx` | 234 lines (exceeds 200 limit) |
| m-09 | 8.1 | `settings/tag-presets.tsx` | 259 lines (exceeds 200 limit) |
| m-10 | 8.3 | `(tabs)/index.tsx` | Uses `.map()` in ListHeaderComponent |
| m-11 | 8.4 | `AddToPlaylistModal.tsx` | Empty state is inline, not `EmptyState` component |
| m-12 | 11.3 | Multiple | `// Why:` comments missing on non-obvious decisions |
| m-13 | 12 | `.env.example` | Lists phantom `EXPO_PUBLIC_GOOGLE_CLIENT_ID` |
| m-14 | 2.4 | `schema.ts` | `updated_at` missing on tracks table |

---

## Nitpicks (3)

| # | Section | File | Issue |
|---|---|---|---|
| n-01 | 7 | `deepLinks.ts` | No `// Why:` comment about canOpenURL requiring EAS dev build |
| n-02 | 8.3 | Multiple FlatLists | No `getItemLayout` on fixed-height TrackRow lists |
| n-03 | 11.1 | `schema.ts` | `CURRENT_SCHEMA_VERSION` constant doesn't exist |

---

## Fix Priority Order

**Pass 1 — Blockers (do first):**
1. Migration system (`schema.ts`, `_layout.tsx`)
2. `AppError` type (`types/errors.ts`)
3. Remove all direct DB imports from screens/components
4. JSDoc on `TagFilter` and `Playlist.filterTags`

**Pass 2 — Critical Majors:**
5. Upsert track pattern (INSERT OR IGNORE + return wasInserted)
6. Store/DB error handling (try/catch in stores, surface errors)
7. Spotify 401 → refresh retry
8. Token key namespacing
9. SoundCloud ID extraction from URL path

**Pass 3 — Testing:**
10. Install jest + jest-expo + testing-library
11. Write the 4 required test files
12. File renames (kebab-case)

**Pass 4 — Polish Majors:**
13. "Already saved" indicator in search
14. TrackRow deep link wiring
15. AND logic helper text in UI
16. Rate limit / offline error messaging
17. Top-level responsibility comments on all files
