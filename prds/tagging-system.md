# PRD: Tagging System

## Overview

Users can apply custom, subjective tags to any track in their library — regardless of which platform the track came from. Tags are user-defined labels organized by category (e.g., energy, mood, context) that let users describe tracks in ways that platform metadata (title, artist, duration) cannot.

Tagging is the foundation that powers dynamic playlists. Without tags, playlists are static lists. With tags, playlists become living filters.

---

## Problem Statement

Tracks collected from Spotify, YouTube, and SoundCloud carry only platform metadata: title, artist, album, duration. None of this tells you *how a track feels* — its energy, its mood, when to play it, what elements it contains. Users have no way to organize their cross-platform library by subjective characteristics, which is exactly the information they need when building playlists for a specific vibe or context.

---

## User Stories

1. **As a user**, I can tag any track in my library with one or more category:value pairs (e.g., `mood:euphoric`, `energy:high`, `context:sunset`), so I can later find tracks by feel rather than by name.

2. **As a user**, I start with a set of default tag categories and values that I can use immediately without setup, so tagging is frictionless from day one.

3. **As a user**, I can create new tag categories (e.g., "season") and new values within any category (e.g., "summer", "winter"), so the system adapts to how I think about music.

4. **As a user**, I can delete any tag category or any individual value — including defaults — so I'm not stuck with labels that don't match my vocabulary.

5. **As a user**, I can see all tags currently applied to a track at a glance, so I know how I've already categorized it.

6. **As a user**, I can remove a tag from a track, so I can correct mistakes or change my mind.

7. **As a user**, I can apply multiple values from the same category to a single track (e.g., `mood:dark` AND `mood:hypnotic`), because tracks often span multiple moods.

8. **As a user**, my tag presets and all applied tags persist locally across app sessions, so my organizational work is never lost.

---

## Default Tag Presets

The app ships with these default categories and values, seeded on first launch. All are deletable and editable by the user.

| Category | Default Values |
|---|---|
| Energy | 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, low, medium, high, peak |
| Mood | dark, melancholic, uplifting, euphoric, hypnotic, driving, dreamy, aggressive, chill, emotional, mysterious, joyful |
| Position | opener, warmup, builder, journey, peak, cooldown, closer |
| Vocals | none, male, female, chopped, spoken, ethereal, powerful |
| Elements | arp, piano, strings, pads, acid, ethnic, guitar, brass, synth, bass, percussion |
| Breakdown | minimal, melodic, dramatic, building, drop, none |
| Context | beach, club, festival, afters, sunset, sunrise, underground, mainstage |
| Genre | melodic-techno, melodic-house, progressive, afro-house, indie-dance, organic, deep, tech-house |

---

## Data Model (Product-Level)

### Tag Preset
A category:value pair that exists in the user's tag vocabulary. Presets define *what tags are available* to apply. They appear as selectable options in the tagging UI.

- **Category** — a grouping label (e.g., "mood", "energy")
- **Value** — a specific label within the category (e.g., "dark", "peak")
- Uniqueness: one preset per category+value combination

### Applied Tag
An instance of a tag preset applied to a specific track.

- **Track** — the track this tag is applied to
- **Category** — which category
- **Value** — which value
- Uniqueness: one applied tag per track+category+value combination (no duplicates)

### Relationships
- A track can have zero or many applied tags
- A track can have multiple values from the same category
- Deleting a tag preset does NOT automatically remove applied instances of that tag from tracks (the applied tags remain as "orphaned" but still functional — they still appear on the track and still match in playlist filters)
- Deleting a track removes all its applied tags

---

## User Flows

### Flow 1: Tagging a Track

1. User views a track (in library, in a playlist, or in search results)
2. User taps the track to open its detail/action view
3. User sees all currently applied tags grouped by category
4. User sees available tag presets grouped by category (chips/buttons)
5. User taps a tag chip to apply it → chip visually toggles to "selected" state
6. User taps an applied tag chip to remove it → chip toggles back to "available" state
7. Changes are saved immediately (no explicit save button for tag application)

### Flow 2: Managing Tag Presets

1. User navigates to tag preset management (accessible from settings or tag UI)
2. User sees all categories with their values listed
3. **Add a value:** User taps "+" on a category → types new value → confirms → value appears in the category
4. **Add a category:** User taps "+ New Category" → types category name → category appears empty, ready for values
5. **Delete a value:** User taps "×" on any value → value is removed from presets (applied instances on tracks remain)
6. **Delete a category:** User taps "×" on a category header → entire category and all its values are removed from presets (applied instances on tracks remain)

### Flow 3: Viewing Tags on a Track

1. In any track list (library, playlist, search results), each track row shows a compact summary of its applied tags (e.g., small colored chips or a count badge)
2. Tapping into the track's detail view shows all applied tags grouped by category

---

## Behavioral Rules

1. **Tag application is a toggle.** Tapping an already-applied tag removes it. Tapping an unapplied tag adds it. No confirmation dialog.

2. **Tag presets are the palette, not the constraint.** Presets control what appears in the tagging UI. But applied tags on tracks are independent — deleting a preset doesn't strip tags from tracks. This prevents accidental data loss.

3. **Empty categories are allowed.** A category can exist with zero values (user deleted all values but kept the category). It appears in preset management but not in the tagging UI (nothing to select).

4. **No implicit tag creation during tagging.** Users cannot type a freeform tag while tagging a track. They must first add it as a preset, then apply it. This keeps the vocabulary controlled and prevents typo-duplicates.

5. **Categories are case-insensitive for uniqueness** (e.g., "Mood" and "mood" are the same category). Values are case-insensitive for uniqueness within their category.

6. **Display order:** Categories display in alphabetical order. Values within a category display in the order they were created (preserving the default seed order for defaults, appending user-created values at the end).

---

## Edge Cases

| Scenario | Behavior |
|---|---|
| User deletes a tag preset that is applied to 50 tracks | Preset disappears from the palette. The 50 tracks retain the applied tag. The tag still appears on those tracks and still matches in playlist filters. If the user re-creates the same preset later, it reconnects naturally. |
| User deletes a category that is used as a playlist filter | The playlist filter still works — it matches against applied tags, not presets. The playlist continues to function. The filter tag just won't appear in the preset dropdown anymore. |
| User applies all 14 energy values to one track | Allowed. Each is a separate applied tag. |
| User tries to create a category named "" (empty string) | Rejected. Category names must be non-empty after trimming whitespace. |
| User tries to create a duplicate category/value | Silently ignored (idempotent). No error shown. |
| Track is deleted | All applied tags for that track are deleted. |
| App is opened for the first time | Default presets are seeded. No tags are applied to any tracks (user has no tracks yet). |

---

## Non-Goals (v1)

- **Smart/auto-tagging** — No automatic tag suggestions based on track metadata or audio analysis
- **Tag import/export** — No sharing tag presets between devices or users
- **Tag-based search** — The library search bar does not filter by tags (that's what dynamic playlists are for)
- **Tag colors** — Tags use the platform's accent color uniformly; no per-category color customization
- **Tag hierarchies** — Categories are flat. No sub-categories or nested grouping.
