# TV Scraper

**Location**: `fetch_tv_program.py`
**Status**: Active

## Purpose

Scrapes TV program schedules from a Bulgarian TV listing website by parsing HTML tables. Extracts time, title, and description for each program in a channel's daily schedule.

## Public interface

- `TVProgramFetcher()` — constructor, creates a `requests.Session` with custom User-Agent
- `TVProgramFetcher.fetch_programs(channel, date_path) -> List[Dict]` — fetches and parses programs for one channel/date
- `TVProgramFetcher.print_programs(programs)` — pretty-prints to stdout
- `TVProgramFetcher.BASE_URL` — class constant, the base URL of the scraping target

## Dependencies

**Depends on:**
- `requests` — HTTP client
- `beautifulsoup4` — HTML parsing

**Depended on by:**
- `fetch_active_programs.py` — used to fetch each channel's programs
- `app.py` — uses `BASE_URL` for logo URL construction

## Key implementation notes

- URL construction: for "today" (`Днес`), URL is `/tv/{channel}`; for other dates, `/tv/{channel}/{date_path}/`
- HTML parsing looks for `<tr>` rows containing `<a href="/predavane/...">` links
- Title extraction prefers `<strong>` tags within the link; falls back to `_split_title_description` heuristics
- `_split_title_description` uses regex to detect Bulgarian description keywords (Спорт, Повторение, Документален, etc.)
- Timeout is 10 seconds per request; failures return empty list (no retry)
- Has a `__main__` block for standalone testing with Oscar annotation

## Related ADRs

- [ADR-0001](../architecture/adr/ADR-0001-existing-decisions.md) — HTML scraping decision
