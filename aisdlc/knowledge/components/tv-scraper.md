# TV Scraper

**Location**: `fetch_tv_program.py`
**Status**: Active

## Purpose

Scrapes TV program schedules from the Bulgarian TV guide website. Parses HTML tables to extract time slots, titles, and descriptions for a given channel and date.

## Public interface

- `TVProgramFetcher()` — constructor, sets up requests session with User-Agent
- `TVProgramFetcher.fetch_programs(channel, date_path) -> List[Dict]` — fetch programs for one channel/date
- `TVProgramFetcher.BASE_URL` — class constant, the TV guide website URL
- `TVProgramFetcher.print_programs(programs)` — debug helper

## Dependencies

**Depends on:**
- External: TV guide website (`xn----8sbafg9clhjcp.bg`) — HTTP scraping
- `requests` + `beautifulsoup4`

**Depended on by:**
- `fetch_active_programs.py` — called for each active channel

## Key implementation notes

- URL structure: `/tv/{channel}` for today, `/tv/{channel}/{date_path}/` for other dates
- Date paths are Bulgarian words: `Днес` (today), `Вчера` (yesterday), `Утре` (tomorrow)
- Programs are extracted from `<tr>` rows containing `<a href="/predavane/...">` links
- Title is extracted from `<strong>` tag within the link; description is the remaining text
- Fallback title/description splitting uses regex patterns for common Bulgarian TV description keywords
- Returns empty list on HTTP errors — never raises

## Related ADRs

- [ADR-0001](../architecture/adr/ADR-0001-existing-decisions.md) — HTML scraping decision
