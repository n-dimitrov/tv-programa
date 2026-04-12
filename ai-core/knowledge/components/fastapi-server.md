# FastAPI Server

**Location**: `app.py`
**Status**: Active

## Purpose

Central backend that exposes all REST API endpoints, manages the 7-day program cache, and serves the React SPA in production. It is the single entry point for all client interactions.

## Public interface

- `GET /api/config` — returns logo base URL
- `POST /api/fetch` — triggers program scraping for a given date (Днес/Вчера/Утре)
- `GET /api/programs?date=YYYY-MM-DD` — programs for a single date
- `GET /api/programs/7days` — cached 7-day aggregate
- `GET /api/channels` — all channels
- `GET /api/channels/active` — only active channels
- `PUT /api/channels` — bulk update channel list
- `POST /api/channels/{id}/toggle` — toggle active status
- `GET /api/oscars` — Oscar-annotated programs grouped by movie (7 days)
- `GET /api/oscars/catalog` — full Oscar movie catalog
- `POST /api/oscars/exclude` — add to blacklist
- `DELETE /api/oscars/exclude` — remove from blacklist
- `GET /api/oscars/blacklist` — all blacklisted entries
- `GET /api/oscars/monthly?year=&month=` — monthly Oscar statistics
- `GET /api/status` — application status and available dates
- `GET /{path}` — catch-all serving React SPA

## Dependencies

**Depends on:**
- `storage.py` — all data persistence
- `fetch_active_programs.py` — program fetching orchestration
- `fetch_tv_program.py` — base URL constant
- `oscars_lookup.py` — `_normalize_title` for blacklist matching

**Depended on by:**
- React frontend (via HTTP)

## Key implementation notes

- The 7-day cache uses a module-level dict + `threading.Lock` with configurable TTL (`PROGRAMS_7DAYS_CACHE_TTL`, default 1800s)
- `POST /api/fetch` is the heaviest endpoint — it triggers sequential scraping of all active channels, Oscar matching, and AI validation
- Swagger/Redoc docs are disabled (`docs_url=None, redoc_url=None`)
- CORS is fully open (`allow_origins=["*"]`) — intended for dev convenience
- The `/api/oscars/monthly` endpoint always recomputes and overwrites the saved summary

## Related ADRs

- [ADR-0001](../architecture/adr/ADR-0001-existing-decisions.md) — FastAPI choice, SPA serving, JSON storage
