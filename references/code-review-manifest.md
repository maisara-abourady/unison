# Unison — Code Review Manifest
**Role:** You are a senior tech lead performing code review on this codebase.
**Standard:** Apply Google/Amazon engineering bar. Enforce every criterion below on every file you touch, generate, or review.

---

## How to Use This Manifest

Before marking any phase complete, run through every section below as a checklist. A phase is not done until all applicable criteria pass. Flag violations inline as code comments using the severity tags defined in Section 0.

---

## Section 0 — Severity Tags

Use these tags in code comments and review output:

| Tag | Meaning |
|---|---|
| `[BLOCKER]` | Must be fixed before this phase is considered done. Will cause bugs, data loss, or crashes. |
| `[MAJOR]` | Should be fixed in this phase. If deferred, create a clearly labelled `// TODO [MAJOR]:` comment. |
| `[MINOR]` | Nice to fix. Low risk if deferred. Note it but do not block. |
| `[NITPICK]` | Style or naming. Only raise if it creates ambiguity. |

---

## Section 1 — Blockers (Enforce Before Any Phase is Complete)

### 1.1 — AND/OR Semantics of `filter_tags` Must Be Explicit

`filter_tags` drives all playlist membership. Its boolean logic must be defined and consistent everywhere it is used.

**Required behavior (pick one and enforce everywhere):**
- **AND (default recommended):** A track must match ALL tags in the filter to appear in the playlist.
- **OR:** A track matching ANY tag in the filter appears in the playlist.

**Checklist:**
- [ ] The SQL query in `db/playlists.ts` explicitly implements the chosen logic
- [ ] The type definition of `TagFilter[]` has a JSDoc comment stating the AND/OR behavior
- [ ] The playlist creation UI (`playlist/create.tsx`) communicates the logic to the user (e.g., "Tracks must match all of these tags")
- [ ] No other code path re-implements the filter query independently

**Reference SQL for AND logic (tracks must have ALL filter tags):**
```sql
-- AND: track must match every filter tag
SELECT t.* FROM tracks t
WHERE (
  SELECT COUNT(DISTINCT tg.category || '::' || tg.value)
  FROM tags tg
  WHERE tg.track_id = t.id
    AND (tg.category || '::' || tg.value) IN (/* filter pairs */)
) = /* total number of filter tags */
ORDER BY t.artist ASC, t.title ASC;
```

---

### 1.2 — Database Migration Strategy Must Be Implemented

`expo-sqlite` has no built-in migrations. Schema changes without a migration runner will corrupt user data.

**Required:**
- [ ] `src/db/schema.ts` uses `PRAGMA user_version` as a version integer
- [ ] A `runMigrations(db)` function runs on every app launch before any screen renders
- [ ] Migrations are sequential and numbered (migration 1, migration 2, etc.)
- [ ] The root layout (`app/_layout.tsx`) awaits `runMigrations()` before rendering children
- [ ] `CURRENT_SCHEMA_VERSION` is a named constant, not a magic number

**Required implementation pattern:**
```typescript
const CURRENT_SCHEMA_VERSION = 1;

export async function runMigrations(db: SQLiteDatabase): Promise<void> {
  const result = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  let version = result?.user_version ?? 0;

  if (version < 1) {
    await applyMigration1(db); // Initial schema creation
    version = 1;
  }
  // if (version < 2) { await applyMigration2(db); version = 2; }

  await db.execAsync(`PRAGMA user_version = ${CURRENT_SCHEMA_VERSION}`);
}
```

---

### 1.3 — Referential Integrity: `tags` → `tag_presets`

Applied tags must not become invisible orphans when a preset is deleted.

**Checklist:**
- [ ] Either `tags.category`/`tags.value` references `tag_presets` via FK with `ON DELETE CASCADE`
- [ ] OR the decision to allow orphaned tags is explicitly documented as intentional in a code comment with a note on the resulting UX behavior
- [ ] There is no code path where orphaned tags silently affect playlist membership without appearing in the tag UI

---

### 1.4 — Store/DB Data Flow Must Follow One Consistent Pattern

All phases must use the same calling convention between UI, hooks, Zustand store, and DB layer.

**Required pattern (enforce everywhere):**
```
Screen / Component
  └─ hook (useLibrary, useTags, usePlaylists)
       └─ Zustand store action (addTrack, applyTag, etc.)
            └─ DB layer function (as side effect)
```

**Checklist:**
- [ ] Screens never import from `src/db/` directly
- [ ] Zustand store actions are the only callers of DB layer functions
- [ ] Hooks never call DB functions directly; they call store actions
- [ ] This pattern is consistent across all phases — no exceptions without a comment explaining the deviation

---

## Section 2 — Data Model

### 2.1 — Schema Correctness
- [ ] All `NOT NULL` constraints are present on fields that must never be null
- [ ] All `UNIQUE` constraints match the type-level uniqueness invariants
- [ ] `ON DELETE CASCADE` is present on all FK references where child rows should not outlive their parent
- [ ] `DEFAULT` values are present where a missing value would cause a runtime error

### 2.2 — Required Indexes
The following indexes must exist in `schema.ts`:
```sql
CREATE INDEX IF NOT EXISTS idx_tags_track_id ON tags(track_id);
CREATE INDEX IF NOT EXISTS idx_tags_category_value ON tags(category, value);
CREATE INDEX IF NOT EXISTS idx_tracks_platform ON tracks(platform);
CREATE INDEX IF NOT EXISTS idx_tracks_added_at ON tracks(added_at);
```

### 2.3 — Track Upsert Behavior
- [ ] The `insertTrack()` function uses `INSERT OR IGNORE` (not `INSERT OR REPLACE`, which would lose local mutations)
- [ ] The return value of `insertTrack()` distinguishes between "inserted" and "already existed"
- [ ] The UI reflects this: tracks already in the library show a visual indicator (e.g., filled bookmark icon vs. outline)

### 2.4 — Timestamps
- [ ] All timestamps are Unix epoch integers in milliseconds (`Date.now()`)
- [ ] No `new Date().toISOString()` strings stored in SQLite — this makes sorting and comparison queries brittle
- [ ] `updated_at` is present on `tracks` table (even if unused in v1, cheap to add now)

---

## Section 3 — Type Safety

### 3.1 — No `any`
- [ ] Zero occurrences of `any` in `src/`. Use `unknown` and narrow it, or define the correct type.
- [ ] `JSON.parse()` results are always typed through a validation function or explicit cast with a comment

### 3.2 — Discriminated Unions for Platform
```typescript
// Correct — exhaustive, catches missing cases at compile time
function getDeepLinkUri(platform: Platform, id: string): string {
  switch (platform) {
    case 'spotify':    return `spotify:track:${id}`;
    case 'youtube':    return `vnd.youtube:${id}`;    // Android
    case 'soundcloud': return `soundcloud://sounds/${id}`;
    default:
      const _exhaustive: never = platform; // [BLOCKER] if this line errors at compile time
      throw new Error(`Unhandled platform: ${platform}`);
  }
}
```
- [ ] Every `switch` on `Platform` has an exhaustive `never` default case

### 3.3 — Optional Fields
- [ ] Optional fields use `?: T` not `T | undefined` in interface definitions
- [ ] All optional field accesses use optional chaining (`?.`) or are guarded

### 3.4 — `filter_tags` JSON Parsing
- [ ] `filter_tags` is stored as JSON string in SQLite and parsed on read
- [ ] Parsing is wrapped in try/catch
- [ ] The parsed value is validated as `TagFilter[]` before use — a corrupted `filter_tags` must not crash the playlist screen

---

## Section 4 — Error Handling

### 4.1 — Error Type Definitions (Phase 1 deliverable)
The following error type must exist in `src/types/errors.ts` before Phase 2 begins:
```typescript
export type AppError =
  | { type: 'DB_ERROR'; message: string; cause?: unknown }
  | { type: 'AUTH_EXPIRED'; platform: Platform }
  | { type: 'AUTH_FAILED'; platform: Platform; reason: string }
  | { type: 'API_ERROR'; platform: Platform; statusCode: number; message: string }
  | { type: 'SOUNDCLOUD_RESOLVE_FAILED'; url: string; reason: string }
  | { type: 'DEEP_LINK_FAILED'; track: Track }
  | { type: 'MIGRATION_FAILED'; version: number; cause: unknown };
```

### 4.2 — No Silent Failures
- [ ] No `catch` block that is empty or only calls `console.log`
- [ ] Every `catch` either: rethrows, sets an error state that the UI can display, or calls `console.error` with a structured message
- [ ] Async functions that can fail return `Promise<Result<T, AppError>>` or propagate via thrown error — never return `undefined` on failure without documenting it

### 4.3 — API Error Handling
- [ ] HTTP 401 from Spotify triggers token refresh, not a user-visible error
- [ ] HTTP 429 (rate limit) is handled with a user-visible "Too many requests, try again shortly" message
- [ ] Platform search failures are isolated: if Spotify fails, YouTube results still display
- [ ] Network offline state is detected and surfaces a clear error banner — not a generic crash

### 4.4 — DB Error Handling
- [ ] All `db.execAsync` / `db.runAsync` calls are wrapped in try/catch
- [ ] A DB write failure must never leave the Zustand store in an inconsistent state with the DB (if the write fails, roll back the store update)

---

## Section 5 — Auth & Token Management

### 5.1 — Spotify Token Lifecycle (Phase 5)
- [ ] `access_token` and `refresh_token` are both stored in `expo-secure-store`
- [ ] `expires_at` (timestamp) is stored alongside the access token
- [ ] The Spotify API client checks `expires_at` before every request; if expired, it refreshes silently
- [ ] A 401 response from Spotify also triggers a refresh attempt (clock skew safety)
- [ ] If refresh fails, the user is prompted to re-authenticate — not silently logged out

### 5.2 — Token Storage
- [ ] Token keys in `expo-secure-store` are namespaced: `unison.spotify.access_token`, `unison.spotify.refresh_token`, etc.
- [ ] Tokens are never stored in Zustand state (memory only is acceptable for active session; persistence must use `expo-secure-store`)
- [ ] Tokens are never logged: `console.log('token:', token)` is [BLOCKER]

### 5.3 — YouTube Auth
- [ ] YouTube uses API key only (no OAuth) — confirmed per plan deviation #6
- [ ] API key is loaded from `process.env.EXPO_PUBLIC_YOUTUBE_API_KEY` — never hardcoded
- [ ] Spotify Client ID loaded from `process.env.EXPO_PUBLIC_SPOTIFY_CLIENT_ID` — never hardcoded

---

## Section 6 — Platform API Clients

### 6.1 — Response Normalization
- [ ] Every platform API response is mapped through `normalizeTrack.ts` before being stored or dispatched
- [ ] Raw platform API response types are defined in the API client file — the rest of the app never sees raw API shapes
- [ ] `normalizeTrack` functions are pure (no side effects, no async) — testable in isolation

### 6.2 — SoundCloud ID Extraction (Phase 7)
- [ ] Track ID is extracted from the original pasted URL path — not from oEmbed HTML (fragile)
- [ ] Fallback: if ID cannot be extracted from URL, use the original URL as both deep link and web fallback
- [ ] The `title` field from oEmbed is parsed on ` - ` delimiter to split artist/title — but only if the delimiter exists; do not assume it always does

### 6.3 — YouTube Search
- [ ] `videoCategoryId=10` (Music) filter is either removed or made configurable in `src/constants/platforms.ts`
- [ ] Duration is stored as `undefined` for YouTube tracks — the type allows this and the UI must handle it gracefully (no "NaN:NaN" display)

### 6.4 — Quota & Rate Limit Awareness
- [ ] YouTube API key quota usage is tracked at the component level — if a search fails with 403, the error message references quota, not a generic failure
- [ ] Spotify search debounce is implemented in the search hook — minimum 300ms after last keystroke before firing API call

---

## Section 7 — Deep Links (Phase 8)

- [ ] `Linking.canOpenURL()` is called before every deep link attempt
- [ ] iOS `app.json` includes `ios.infoPlist.LSApplicationQueriesSchemes: ["spotify", "youtube", "soundcloud"]` — without this, `canOpenURL` always returns false on iOS
- [ ] Web fallback uses `Linking.openURL(track.webFallbackUrl)` — opens system browser, not in-app browser
- [ ] Phase 8 verification checklist notes that `canOpenURL` requires an EAS dev build — not testable in Expo Go

---

## Section 8 — Component Architecture

### 8.1 — Single Responsibility
- [ ] No component exceeds 200 lines. If it does, extract sub-components.
- [ ] No component imports directly from `src/db/` — all data flows through hooks
- [ ] No business logic in JSX — extract to hooks or utils

### 8.2 — TrackRow Tap Targets
- [ ] `TrackRow.tsx` has two distinct, non-overlapping tap targets:
  - Left zone (thumbnail area) → `openTrack(track)` deep link
  - Right zone (text area) → navigate to track detail / tag screen
- [ ] Minimum tap target size: 44x44pt (Apple HIG / Material guidelines)

### 8.3 — List Performance
- [ ] Search results and library lists use `FlatList` — never `ScrollView` with `.map()`
- [ ] `FlatList` has `keyExtractor` returning `track.id`
- [ ] `FlatList` has `getItemLayout` if item height is fixed — reduces layout calculation overhead

### 8.4 — Empty States
- [ ] Every list has an explicit empty state component (`EmptyState.tsx`)
- [ ] Empty state copy distinguishes between "no data yet" and "no results for this query"

---

## Section 9 — App Launch Sequence (Root Layout)

`app/_layout.tsx` must implement this exact loading gate:

```typescript
// Required sequence — do not reorder
useEffect(() => {
  async function init() {
    try {
      const db = await openDatabase();
      await runMigrations(db);       // [BLOCKER] Must complete before any screen renders
      await loadStoredTokens();      // Check auth state — non-blocking if fails
      setIsReady(true);
    } catch (err) {
      setInitError(err);             // Show error screen, not a crash
    }
  }
  init();
}, []);

if (!isReady) return <SplashScreen />;  // Or loading indicator
if (initError) return <InitErrorScreen error={initError} />;
```

- [ ] No screen renders before `runMigrations()` completes
- [ ] A migration failure shows a recoverable error screen — not a white screen crash
- [ ] Token loading failure does not block app launch — it just means the user is unauthenticated

---

## Section 10 — Testing Requirements

The following tests must exist before Phase 9 (Polish) begins:

### 10.1 — Unit Tests (Required)
| Test file | What it tests |
|---|---|
| `__tests__/normalizeTrack.test.ts` | Maps raw Spotify/YouTube/SoundCloud API fixtures → `Track`. Covers missing fields, artist/title parsing. |
| `__tests__/deepLinks.test.ts` | URI scheme output per platform. Exhaustive for all Platform values. |
| `__tests__/dynamicPlaylistQuery.test.ts` | Seeds in-memory DB, applies tags, asserts correct tracks returned for AND/OR filter logic. This is the most critical test in the project. |
| `__tests__/migrations.test.ts` | Runs `runMigrations` on a fresh DB and on a DB at each prior version. Asserts correct schema at the end. |

### 10.2 — Test Setup
- [ ] `jest` and `@testing-library/react-native` are in `devDependencies`
- [ ] `jest.config.js` has preset `jest-expo`
- [ ] DB tests use an in-memory SQLite instance — no disk I/O in tests

---

## Section 11 — Code Style & Naming

### 11.1 — Naming Conventions
| Pattern | Convention | Example |
|---|---|---|
| Components | PascalCase | `TrackRow`, `PlatformBadge` |
| Hooks | camelCase, `use` prefix | `useLibrary`, `useUnifiedSearch` |
| DB functions | camelCase, verb-first | `insertTrack`, `deletePlaylist`, `queryTracksByTags` |
| Store actions | camelCase, verb-first | `addTrack`, `removeTag`, `createPlaylist` |
| Constants | SCREAMING_SNAKE_CASE | `CURRENT_SCHEMA_VERSION`, `MAX_SEARCH_RESULTS` |
| Types/Interfaces | PascalCase | `Track`, `TagFilter`, `AppError` |
| Enum-like string unions | lowercase | `'spotify' \| 'youtube' \| 'soundcloud'` |

### 11.2 — File Naming
- [ ] All files use kebab-case: `normalize-track.ts`, `deep-links.ts`
- [ ] Exception: React components use PascalCase: `TrackRow.tsx`, `PlaylistCard.tsx`
- [ ] No `index.ts` barrel files unless the directory has 3+ exports — they create circular dependency risk

### 11.3 — Comments Policy
- [ ] Every non-obvious decision has a `// Why:` comment explaining the reasoning
- [ ] Every `TODO` includes: severity tag, phase it belongs to, and what needs to happen. Format: `// TODO [MAJOR] Phase 9: Add swipe-to-delete on TrackRow`
- [ ] No commented-out code in committed files

---

## Section 12 — Security (Personal App Scope)

- [ ] No API keys, tokens, or secrets in source code — all via `EXPO_PUBLIC_*` env vars or `expo-secure-store`
- [ ] `.env` is in `.gitignore` — verified before first commit
- [ ] `.env.example` exists with all keys listed but empty values
- [ ] No user data is logged: track titles, artist names, playlist names must not appear in `console.log` in production builds

---

## Phase Completion Checklist

Before closing any phase as done, verify:

- [ ] All [BLOCKER] items in this manifest pass for files created/modified in this phase
- [ ] All [MAJOR] items are either fixed or have a `// TODO [MAJOR]:` comment with phase assignment
- [ ] TypeScript compiles with zero errors (`npx tsc --noEmit`)
- [ ] The verification criterion in `plan.md` for this phase passes on a physical device or simulator
- [ ] No `console.log` left in committed code (use `console.error` for real errors only)
- [ ] Every new file has a one-line comment at the top stating its responsibility
