# Active Channel Fetcher

**Location**: `fetch_active_programs.py`
**Status**: Active

## Purpose

Orchestrates the full program fetch pipeline: loads active channels, fetches programs for each via the scraper, annotates with Oscar data, runs AI validation, and handles false positive cleanup.

## Public interface

- `ActiveChannelFetcher(channels_file, storage_provider, ai_validate)` — constructor
- `ActiveChannelFetcher.fetch_all_programs(date_path, target_date) -> Dict` — main entry point
- `ActiveChannelFetcher.save_to_file(data, output_file) -> bool` — save to local JSON
- `ActiveChannelFetcher.print_summary(data)` — debug summary

## Dependencies

**Depends on:**
- `fetch_tv_program.py` — scraping individual channels
- `oscars_lookup.py` — Oscar annotation
- `storage.py` — channel config, validation results, blacklist
- External: AI API (configurable via env vars) — match validation

**Depended on by:**
- `app.py` — `POST /api/fetch` endpoint

## Key implementation notes

- Iterates channels sequentially (no parallelism)
- Ambiguous Oscar titles (>1 candidate) are collected during the channel loop, then sent to AI for disambiguation in a single batch call via `_resolve_ambiguous_matches()` — only `confidence: high` resolutions are accepted
- AI validation sends all Oscar matches (including disambiguated ones) as a single prompt, expects a JSON array response
- False positives are auto-blacklisted with graduated scoping: `scope: all` for non-movie content (TV shows, sports, news), `scope: broadcast` for wrong movie versions — determined by `red_flags` from AI validation
- AI prompt templates are loaded from `data/prompts/oscar_disambiguation.txt` (disambiguation) and `data/prompts/oscar_validation.txt` (validation) via storage
- Validation results (prompt + response) are persisted to `data/results/` for debugging
- If AI API fails, fetch still succeeds — Oscar annotations remain unvalidated

## Related ADRs

- [ADR-0001](../architecture/adr/ADR-0001-existing-decisions.md) — AI-assisted validation decision
- [ADR-0002](../architecture/adr/ADR-0002-ai-disambiguation-and-graduated-blacklist.md) — AI disambiguation layer, graduated blacklist scoping
