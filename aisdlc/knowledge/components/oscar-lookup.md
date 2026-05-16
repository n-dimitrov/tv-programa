# Oscar Lookup

**Location**: `oscars_lookup.py`
**Status**: Active

## Purpose

Matches TV program titles against a curated Oscar movie database and annotates matching programs with winner/nominee info, TMDB metadata, and watch provider availability.

## Public interface

- `OscarLookup(movies_path, oscars_path, blacklist_path, storage_provider)` — constructor, builds indexes
- `OscarLookup.annotate_program(program, channel_id, date, time) -> Optional[Dict]` — annotate a program dict in-place, returns match info or None
- `OscarLookup.find_movie_candidates(title, description) -> Tuple[Optional[str], List[Dict]]` — returns `(movie_id, [])` for unique match, `(None, [candidates])` for ambiguous, `(None, [])` for no match
- `OscarLookup.annotate_program_with_movie_id(program, movie_id) -> Optional[Dict]` — annotate using a known movie_id (from AI disambiguation)
- `OscarLookup.enabled` — bool, True when data is available
- `_normalize_title(text) -> str` — module-level helper, used externally by `app.py`
- `_strip_episode_suffix(title) -> str` — module-level helper, used externally by `app.py`

## Dependencies

**Depends on:**
- `storage.py` (optional) — loading Oscar reference data from storage
- TMDB API — fetching watch provider info per movie

**Depended on by:**
- `fetch_active_programs.py` — Oscar annotation during fetch
- `app.py` — imports `_normalize_title` and `_strip_episode_suffix`

## Key implementation notes

- Builds two in-memory indexes at startup: `_title_index` (normalized title → set of movie_ids) and `_title_year_index` (year+title → set of movie_ids)
- **Ambiguity rule**: `_find_movie_id` returns `None` if more than one movie_id matches a normalized title — only unique matches are annotated. `find_movie_candidates` returns the candidate list instead, enabling AI disambiguation upstream
- Blacklist is loaded at startup and checked before annotation — three scopes: `all`, `channel`, `broadcast`
- TMDB watch provider results are cached in `_watch_cache` dict (in-memory, per-session)
- `enabled` is set to `True` when `storage_provider` is passed, even if actual data files are missing — this can cause empty indexes
- Episode suffixes (сез., еп., etc.) are stripped before title matching via `_strip_episode_suffix`

## Related ADRs

- [ADR-0001](../architecture/adr/ADR-0001-existing-decisions.md) — AI-assisted validation, title matching approach
- [ADR-0002](../architecture/adr/ADR-0002-ai-disambiguation-and-graduated-blacklist.md) — AI disambiguation for ambiguous titles, graduated blacklist scoping
