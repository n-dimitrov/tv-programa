# oscar-lookup

**Location**: `oscars_lookup.py`
**Status**: Active

## Purpose

Matches Bulgarian TV program titles against the Oscar winners/nominees database and annotates matched programs with Oscar metadata (win count, categories, TMDB poster, streaming providers). Also manages the blacklist of false-positive matches.

## Public interface

- `OscarLookup(movies_path, oscars_path, blacklist_path, storage_provider)` — constructor; loads all data into memory on init
- `OscarLookup.annotate_program(program, channel_id, date, time) -> Optional[Dict]` — mutates `program` in-place adding `program["oscar"]`; returns match info dict or None
- `OscarLookup.enabled -> bool` — True if Oscar data is available (always True when storage_provider is passed)
- `_normalize_title(text) -> str` — module-level; used by `app.py` for blacklist deduplication

## Dependencies

**Depends on:**
- `data/movies-min.json` — TMDB movie database keyed by `movie_id`; fields: `title` (EN), `title_bg`, `year`, `tmdb_id`, `poster_path`, `overview`
- `data/oscars-min.json` — Oscar data keyed by year, then category; each entry has `winner.id` and `nominees[].id` referencing movie_ids
- `data/oscar_blacklist.json` — list of exclusion entries with `scope`, `title`, `channel_id`, `date`, `time`
- TMDB API (`TMDB_API_KEY`) — for streaming provider info per `TMDB_WATCH_REGION`

**Depended on by:**
- `fetch_active_programs.py` (ActiveChannelFetcher) — annotates programs during fetch
- `fetch_tv_program.py` (standalone script mode only)
- `app.py` — imports `_normalize_title` for blacklist endpoint

## Key implementation notes

- **Title indexes** are built at init: `_title_index[normalized_title] -> set(movie_ids)` and `_title_year_index[(year, normalized_title)] -> set(movie_ids)`. Only the `_title_index` is currently used in `_find_movie_id()`.
- **Match is skipped if ambiguous**: `_find_movie_id()` returns a movie_id only if the normalized title maps to **exactly one** movie_id. Multiple matches → `None`.
- **Episode suffixes are stripped** before matching (regex strips сезон/еп/сез patterns).
- **Blacklist scopes**: `all` (title globally excluded), `channel` (title excluded on one channel), `broadcast` (exact channel + date + time match).
- **TMDB watch info is cached per session** in `_watch_cache` (in-memory dict). Cache does not persist across restarts.
- When `storage_provider` is passed, `enabled` is forced to `True` even if the data files don't exist on the local path — the provider's `read_json()` handles cloud paths.
- The `annotate_program()` method **mutates the program dict** in place by setting `program["oscar"]`. It also returns the match info separately for logging purposes.

## Related ADRs

- [ADR-0001](../architecture/adr/ADR-0001-existing-decisions.md) — Oscar matching strategy, AI validation, blacklist
