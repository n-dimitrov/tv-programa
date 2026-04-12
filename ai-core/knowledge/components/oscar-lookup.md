# Oscar Lookup

**Location**: `oscars_lookup.py`
**Status**: Active

## Purpose

Matches Bulgarian TV program titles against a curated Oscar movie database and enriches matches with award categories, TMDB poster/overview, and streaming availability. Also manages a blacklist to suppress known false positives.

## Public interface

- `OscarLookup(movies_path, oscars_path, blacklist_path, storage_provider)` — constructor, builds indexes
- `OscarLookup.annotate_program(program, channel_id, date, time) -> Optional[Dict]` — annotates a program dict in-place with `oscar` key; returns match info dict or None
- `OscarLookup.enabled` — bool, whether lookup is available
- `_normalize_title(text) -> str` — module-level, used by app.py for blacklist matching

## Dependencies

**Depends on:**
- `storage.py` (optional) — for loading data from GCS in production
- TMDB API — for watch provider info (`_fetch_watch_info`)
- `data/movies-min.json` — movie metadata with Bulgarian titles
- `data/oscars-min.json` — Oscar category data
- `data/oscar_blacklist.json` — excluded titles

**Depended on by:**
- `fetch_active_programs.py` — called during fetch to annotate programs
- `app.py` — `_normalize_title` imported for blacklist endpoint matching

## Key implementation notes

- Title matching is purely string-based: normalize → strip episode suffixes → lookup in `_title_index`
- **Ambiguity rule**: if a normalized title maps to >1 movie_id, it is silently skipped (no match). This prevents false positives for generic titles
- `_title_year_index` exists but is currently not used in `_find_movie_id` — only `_title_index` is checked
- Watch provider info is fetched from TMDB lazily and cached in `_watch_cache` (in-memory, per-instance)
- Blacklist supports three scopes: `all` (everywhere), `channel` (specific channel), `broadcast` (specific channel+date+time)
- When `storage_provider` is passed, `enabled` is forced to `True` regardless of local file existence

## Related ADRs

- [ADR-0001](../architecture/adr/ADR-0001-existing-decisions.md) — Oscar data approach, AI validation
