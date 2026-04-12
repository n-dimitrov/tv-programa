# Active Channel Fetcher

**Location**: `fetch_active_programs.py`
**Status**: Active

## Purpose

Orchestrates the complete program fetch pipeline: loads active channels, scrapes each channel's schedule, runs Oscar annotation, invokes AI validation on matches, auto-blacklists false positives, and cleans the in-memory result before returning.

## Public interface

- `ActiveChannelFetcher(channels_file, storage_provider, ai_validate)` — constructor
- `ActiveChannelFetcher.fetch_all_programs(date_path, target_date) -> Dict` — main entry point; returns `{metadata, programs}` dict
- `ActiveChannelFetcher.save_to_file(data, output_file) -> bool` — save to local file
- `ActiveChannelFetcher.print_summary(data)` — print statistics

## Dependencies

**Depends on:**
- `fetch_tv_program.py` — `TVProgramFetcher` for scraping
- `oscars_lookup.py` — `OscarLookup` for annotation
- `storage.py` — channel config, AI prompt/response persistence
- External AI API — for Oscar match validation (via `AI_API_URL` and `AI_MODEL` env vars)

**Depended on by:**
- `app.py` — called from `POST /api/fetch` endpoint

## Key implementation notes

- Channels are fetched sequentially (no parallelism)
- AI validation sends all Oscar matches as a JSON array in a single API call
- The AI prompt template is read from `data/prompts/oscar_validation.txt` via storage provider
- AI response parsing handles markdown code blocks (strips ``` wrappers)
- False positive processing: (1) adds to blacklist file, (2) removes `oscar` key from in-memory result dict
- If AI validation count doesn't match input count, the entire validation is skipped with a warning
- Has `__main__` block for standalone CLI usage

## Related ADRs

- [ADR-0001](../architecture/adr/ADR-0001-existing-decisions.md) — AI validation decision
