# fetcher

**Location**: `fetch_tv_program.py` (scraper), `fetch_active_programs.py` (orchestrator)
**Status**: Active

## Purpose

Two tightly related modules: `TVProgramFetcher` scrapes a single TV channel's schedule from the Bulgarian TV program website; `ActiveChannelFetcher` orchestrates fetching for all active channels, running Oscar annotation and optional AI validation on the results.

## Public interface

**TVProgramFetcher** (`fetch_tv_program.py`):
- `TVProgramFetcher()` — creates a `requests.Session` with browser User-Agent
- `fetch_programs(channel, date_path) -> List[Dict]` — GET the channel schedule page, parse HTML, return `[{time, title, description, full}]`
- `BASE_URL` — class constant; the punycode domain of the Bulgarian TV schedule site

**ActiveChannelFetcher** (`fetch_active_programs.py`):
- `ActiveChannelFetcher(channels_file, storage_provider, ai_validate)` — loads active channels from storage on init
- `fetch_all_programs(date_path, target_date) -> Dict` — fetch + annotate all active channels; returns `{metadata: {...}, programs: {channel_id: {channel, programs, count}}}`
- `save_to_file(data, output_file)` — convenience method for standalone script mode

## Dependencies

**Depends on:**
- Bulgarian TV schedule website (external, scraped via HTTP; no API key)
- `oscars_lookup.py` (OscarLookup) — program annotation
- `storage.py` (StorageProvider) — channel config loading, blacklist writing
- `AI_API_URL`, `AI_MODEL` env vars — for AI validation
- `data/prompts/oscar_validation.txt` — AI prompt template

**Depended on by:**
- `app.py` — `POST /api/fetch` calls `ActiveChannelFetcher.fetch_all_programs()`

## Key implementation notes

- **HTML parsing**: `TVProgramFetcher` finds `<tr>` rows containing `<a href="/predavane/...">` links. Time is extracted from the first `<td>`. Title comes from a `<strong>` tag inside the link; description is the remaining text.
- **`date_path` values**: `"Днес"` (today) → URL is `/tv/{channel}` (no suffix); other values like `"Вчера"` (yesterday) or `"Утре"` (tomorrow) append `/{date_path}/` to the URL.
- **AI validation**: After Oscar annotation, `_run_ai_validation()` sends all matches to the external AI API with the prompt template. The response must be a JSON array of `{matched, confidence, response, red_flags}` objects — one per match, in the same order. A length mismatch causes validation to be skipped with a warning.
- **False positive handling**: `_process_ai_validations()` removes `oscar` from false-positive programs in the in-memory result dict and calls `_auto_exclude_false_positives()` to persist them to the blacklist with `scope: broadcast`.
- **AI validation is optional**: Pass `ai_validate=False` to `ActiveChannelFetcher` or the `POST /api/fetch` body to skip AI calls. All Oscar matches are kept as-is.
- AI responses wrapped in markdown code blocks (` ```json ``` `) are handled by stripping the fence before JSON parsing.
- The AI prompt + response are saved to `data/results/{date}_oscar_validation_prompt.txt` and `data/results/{date}_oscar_validation_response.json` on every fetch.

## Related ADRs

- [ADR-0001](../architecture/adr/ADR-0001-existing-decisions.md) — AI validation decision, Oscar matching strategy
