# PRD: Dynamic Playlists

## Overview

Playlists in Unison are **saved tag filters**, not static lists of tracks. A playlist is defined by a set of required tags (e.g., `mood:dark` + `energy:high`). Its contents are computed live — any track in the library that carries ALL of the playlist's filter tags is automatically a member. When a user tags or untags a track, it may enter or exit playlists instantly without any explicit add/remove action.

This model makes playlists a powerful, living lens on the user's tagged library.

---

## Problem Statement

Static playlists require manual curation — users must individually add and remove tracks. As a library grows, this becomes tedious and playlists go stale. Users who have invested effort in tagging their tracks should get playlist organization *for free* as a byproduct of that work. A track tagged `mood:euphoric` + `context:festival` should automatically appear in any playlist filtering for those attributes, without the user having to remember which playlists it belongs to.

---

## Relationship to the Tagging System

Dynamic playlists depend entirely on the tagging system. The dependency is one-way:

- **Tagging can exist without playlists** — users can tag tracks and never create a playlist
- **Playlists cannot exist without tagging** — a playlist with zero filter tags matches every track in the library (this is allowed but is essentially a "show all" view)

The tagging system defines the vocabulary. Dynamic playlists consume it.

---

## User Stories

1. **As a user**, I can create a playlist by selecting one or more tags as filters, so the playlist automatically contains every track matching those tags.

2. **As a user**, I can see a live track count on each playlist that updates as I tag/untag tracks, so I always know how many tracks match.

3. **As a user**, I can open a playlist and see all matching tracks listed, so I can browse what's in it.

4. **As a user**, I can manually add a track to a playlist even if it doesn't carry the right tags — the system applies the playlist's filter tags to the track automatically, so the track gains those tags and becomes a natural member.

5. **As a user**, I can manually remove a track from a playlist — the system removes the playlist's filter tags from the track, so it no longer matches.

6. **As a user**, I can update a playlist's filter tags after creation (add/remove filters), so the playlist evolves as my organization system evolves. The membership recomputes immediately.

7. **As a user**, I can rename and add a description to a playlist, so I can give it context beyond its filter definition.

8. **As a user**, I can delete a playlist without affecting the tracks or their tags, so deletion is safe and non-destructive.

9. **As a user**, I can see which playlists a given track belongs to, so I understand how my tagging has organized things.

10. **As a user**, I can browse all my playlists in a list view, so I can quickly find and open one.

---

## Data Model (Product-Level)

### Playlist
- **Name** — required, user-defined
- **Description** — optional
- **Filter Tags** — a list of `{category, value}` pairs. Stored as JSON. Can be empty (matches all tracks).
- **Created At** — timestamp
- **Updated At** — timestamp, bumped on any mutation (name, description, filter change, track add/remove)

### Membership (Computed, Not Stored)
A track is a member of a playlist if and only if it has ALL of the playlist's filter tags applied. This is evaluated at query time. There is no membership table.

**Example:**
- Playlist "Dark Peak" has filter tags: `[mood:dark, energy:peak]`
- Track A has tags: `mood:dark, energy:peak, context:club` → **member** (has both required tags + extras)
- Track B has tags: `mood:dark, energy:high` → **not a member** (has `mood:dark` but not `energy:peak`)
- Track C has tags: `energy:peak` → **not a member** (has `energy:peak` but not `mood:dark`)

### Relationship Rules
- A playlist with zero filter tags matches ALL tracks in the library
- A track can be in multiple playlists simultaneously (its tags may satisfy multiple filter sets)
- Playlists do not "own" tracks — deleting a playlist has zero effect on tracks or tags

---

## User Flows

### Flow 1: Creating a Playlist

1. User taps "Create Playlist" (from library view or playlists list)
2. System enters playlist creation mode: the tag filter dropdown appears
3. User selects tags from the dropdown (e.g., `mood:dark`, `energy:peak`)
4. As tags are selected, the track list below updates live to show matching tracks (AND intersection)
5. User sees the live count of matching tracks
6. User taps "Save" → prompted for a playlist name (and optional description)
7. Playlist is created and opens as a new view/tab

**Key behavior:** The user defines the playlist by its filter, not by hand-picking tracks. They see the result of their filter in real time before committing.

### Flow 2: Browsing Playlists

1. User navigates to playlists (via tab, nav item, or modal)
2. User sees a list of all playlists, each showing: name, track count, last updated
3. User can search/filter the playlist list by name
4. Tapping a playlist opens it — shows the playlist's tracks (computed live from filter tags)
5. From the playlist list, user can also delete a playlist (with confirmation)

### Flow 3: Viewing a Playlist

1. User opens a playlist (from playlists list or by tapping an open tab)
2. System loads the playlist's filter tags, computes matching tracks, displays them
3. User sees the active filter tags displayed as chips above the track list
4. User can tap any track to play it (deep link) or manage its tags
5. User can modify the filter tags — adding or removing filters immediately recomputes the track list

### Flow 4: Editing a Playlist's Filters

1. User is viewing a playlist
2. User opens the tag filter dropdown and changes the selected tags
3. Track list updates live as filters change
4. An "unsaved changes" indicator appears (e.g., tab shows `*`, save button enables)
5. User taps "Save" → choice dialog:
   - **"Update Playlist"** — overwrites the playlist's filter tags with the current selection
   - **"Save as New"** — creates a new playlist with the current selection, reverts the original playlist to its previous filters
   - **"Cancel"** — dismisses the dialog, changes remain unsaved in the UI

### Flow 5: Manually Adding a Track to a Playlist

1. User is viewing a track (in library, search results, or another playlist)
2. User taps "Add to Playlist" on the track
3. Modal shows all playlists, each indicating whether this track is already a member (checkmark) or not
4. User taps a playlist to add the track to it
5. **System behavior:** The playlist's filter tags are applied to the track as actual tags. The track now has those tags and naturally matches the playlist's filter. It also becomes a member of any OTHER playlist whose filters are now satisfied by the track's updated tags.
6. The modal updates immediately to reflect the new membership state

### Flow 6: Removing a Track from a Playlist

1. User is viewing a playlist's track list
2. User triggers remove on a track (swipe, long-press, or overflow menu)
3. **System behavior:** The playlist's filter tags are removed from the track. The track loses those specific tags and no longer matches the playlist's filter. It may also exit other playlists that relied on those same tags.
4. **Important side effect:** This is the one destructive aspect of the dynamic model. The user should understand that removing a track from a playlist strips those tags from the track globally. A confirmation message should communicate this: "This will remove the tags [mood:dark, energy:peak] from this track. It may also be removed from other playlists using these tags."

### Flow 7: Checking a Track's Playlist Membership

1. User views a track's detail or hovers/long-presses the "playlist" indicator on a track row
2. System shows which playlists currently contain this track
3. User can tap any listed playlist to navigate to it

---

## Behavioral Rules

1. **Membership is always computed, never stored.** There is no cache of "which tracks are in which playlist." Every playlist view runs a live query. This ensures playlists are always current.

2. **Filters use AND logic.** A track must have ALL filter tags to be a member. There is no OR mode. If a user wants "dark OR euphoric," they create two playlists.

3. **Adding a track to a playlist = applying tags.** This is the fundamental equivalence. There is no separate "playlist membership" concept. Membership is a consequence of tagging.

4. **Removing a track from a playlist = removing tags.** This has global consequences. Tags are removed from the track everywhere, not just "for this playlist." This is by design — the dynamic model doesn't have a concept of playlist-scoped membership.

5. **Playlist deletion is safe.** Deleting a playlist removes only the playlist record (name, description, filters). No tracks are modified. No tags are removed.

6. **Empty filter = all tracks.** A playlist with zero filter tags matches the entire library. This is allowed and can serve as an "all tracks" view.

7. **Track count is live.** The count displayed on a playlist card is always recomputed. It reflects the current state of the tag database, not a cached value.

8. **Updated timestamp is bumped on any mutation:** rename, description change, filter change, manual track add, manual track remove.

---

## The Side-Effect Problem

The most important behavioral nuance of this system:

**Scenario:** User has two playlists:
- "Dark Peak" → filters: `[mood:dark, energy:peak]`
- "Dark Vibes" → filters: `[mood:dark, context:club]`

Track X has tags: `mood:dark, energy:peak, context:club` — it's in BOTH playlists.

User removes Track X from "Dark Peak." The system removes `mood:dark` and `energy:peak` from Track X. Track X now only has `context:club`. It exits "Dark Peak" (intended) AND exits "Dark Vibes" (unintended, because it lost `mood:dark`).

**How to handle this:**
- The confirmation message on removal must clearly state which tags will be removed
- The system should warn if the track is in other playlists that will be affected (list them)
- This is an accepted tradeoff of the dynamic model — the alternative (a junction table) loses the "tag once, appear everywhere" benefit

---

## UI Components

### Playlist List View
- List of all playlists, sorted by most recently updated
- Each item shows: playlist name, live track count, last updated timestamp
- Search bar to filter playlists by name
- "Create Playlist" action (button or FAB)
- Swipe or long-press to delete (with confirmation dialog)

### Playlist Detail View
- Header: playlist name, description, edit button
- Active filter tags displayed as chips (tappable to open filter editor)
- Track list: standard track rows (thumbnail, title, artist, platform badge, duration)
- Each track row has: play action (deep link), overflow menu with "Remove from Playlist"
- "Add Tracks" action to open the track selection flow

### Tag Filter Dropdown
- Shared component used in both playlist creation mode and playlist editing mode
- Multi-select dropdown organized by tag category
- Each category is a collapsible section with tag value chips
- Selected chips are visually distinguished (filled/colored)
- "Clear All" action to reset selection
- Selected tags shown as removable chips below/above the dropdown
- Live track count updates as selection changes

### Add to Playlist Modal
- Triggered from any track's overflow menu or action button
- Shows track info (title, artist, platform) at the top
- Lists all playlists below
- Each playlist row shows:
  - Playlist name and track count
  - Checkmark if the track is already a member
  - Tap to toggle: adds (applies tags) or removes (strips tags) the track
- "Create New Playlist" option at top of list

### Playlist Membership Indicator
- On each track row in any list, a subtle indicator showing playlist membership count
- Tapping reveals the list of playlists this track belongs to
- Quick navigation to any listed playlist

---

## Edge Cases

| Scenario | Behavior |
|---|---|
| User creates a playlist with filters that match zero tracks | Playlist is created. Shows empty state: "No tracks match these filters. Tag some tracks to see them here." |
| User deletes all filter tags from a playlist | Playlist now matches ALL tracks in the library. Save is allowed. |
| User creates two playlists with identical filters | Allowed. They're independent playlists with the same view. User might use different names/descriptions for different contexts. |
| User has zero tags applied to any tracks | All playlists with filters show zero tracks. Playlists with empty filters show all tracks. |
| User tags a track that is not currently in any playlist view | If the new tags satisfy any playlist's filters, the track silently enters those playlists. Next time the user views those playlists, the track appears and the count is updated. |
| Track is deleted from library | Track disappears from all playlist views (it no longer exists to match against). No playlist metadata is modified. |
| A platform track that was added via search is tagged and later the same track is found again in search | The track is deduped by platform+platformTrackId. The existing track (with its tags and playlist memberships) is returned. No duplicate. |

---

## Non-Goals (v1)

- **OR logic in filters** — Filters are AND-only. No "mood:dark OR mood:euphoric" in a single playlist.
- **Nested filters / groups** — No `(mood:dark AND energy:peak) OR (mood:euphoric AND energy:high)`.
- **Manual ordering within a playlist** — Since membership is computed, there is no user-defined track order. Tracks are ordered by a fixed sort (artist, then title). Custom sort order is a v2 candidate.
- **Playlist sharing / export** — No sharing playlists as links or files.
- **Collaborative playlists** — Single-user app, no collaboration.
- **Playlist folders / grouping** — Flat list of playlists only.
- **Smart auto-population** — No AI/ML suggestions for which tags to use as filters.

---

## Impact on the Original Unison Design

Adopting dynamic playlists changes the original Unison manifest in these ways:

| Original Manifest | With Dynamic Playlists |
|---|---|
| Static `playlist_tracks` junction table with `position` column | No junction table. Membership computed from tags. |
| Manual add/remove tracks to/from playlists | Add/remove still exists but works by applying/removing tags |
| Track ordering within playlists is user-defined | Track ordering is fixed (alphabetical by artist, then title) |
| Playlists are independent of each other | Playlists can share filter tags, creating implicit relationships |
| No tagging system | Tagging system is required as a prerequisite |
| Searching = the primary way to find tracks to add | Searching + tagging = the primary workflow (search → save → tag → playlists auto-populate) |

The core user workflow shifts from **search → add to playlist** to **search → save to library → tag → playlists compute automatically**.
