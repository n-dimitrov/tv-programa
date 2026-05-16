# FastAPI Server

**Location**: `app.py`
**Status**: Active

## Purpose

Central API server that exposes all endpoints for TV program management, Oscar annotations, monthly summaries, and channel configuration. Also serves the React SPA as static files via a catch-all route.

## Public interface

- `GET /api/config` — returns logo base URL
- `POST /api/fetch` — trigger program fetch for a date (with optional AI validation)
- `GET /api/programs?date=YYYY-MM-DD` — get programs for a specific date
- `GET /api/programs/7days` — get 7-day aggregate (cached)
- `GET /api/channels` — list all channels
- `GET /api/channels/active` — list active channels only
- `PUT /api/channels` — update channel list
- `POST /api/channels/{id}/toggle` — toggle channel active status
- `GET /api/oscars` — Oscar-annotated programs grouped by movie (7-day)
- `GET /api/oscars/catalog` — full Oscar movie catalog
- `POST /api/oscars/exclude` — add to blacklist
- `DELETE /api/oscars/exclude` — remove from blacklist
- `GET /api/oscars/blacklist` — list all blacklisted entries
- `GET /api/oscars/monthly?year=&month=` — get pre-generated monthly summary
- `POST /api/oscars/monthly/generate?year=&month=` — generate monthly summary
- `GET /api/oscars/monthly/available` — list months with summary data
- `GET /api/status` — application status
- `GET /{path}` — catch-all serving React SPA

## Dependencies

**Depends on:**
- `storage.py` — all file I/O
- `fetch_active_programs.py` — program fetching orchestration
- `fetch_tv_program.py` — imported for `BASE_URL` constant
- `oscars_lookup.py` — imported for `_strip_episode_suffix`

**Depended on by:**
- React frontend — all data access via `/api/*` endpoints

## Key implementation notes

- All endpoints and Pydantic models are in a single file — no router separation
- 7-day cache uses module-level `_programs_7days_cache` dict with a `threading.Lock`
- `cleanup_old_programs()` is a no-op — intentionally kept for backward compatibility
- Monthly summary generation reads ALL daily files for a month and aggregates in-memory
- CORS is wide open (`allow_origins=["*"]`) — should be tightened for production
- API docs are disabled (`docs_url=None`, `redoc_url=None`)

## Related ADRs

- [ADR-0001](../architecture/adr/ADR-0001-existing-decisions.md) — FastAPI choice, catch-all routing, two-layer cache
