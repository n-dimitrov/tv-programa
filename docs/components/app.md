# app

**Location**: `app.py`
**Status**: Active

## Purpose

FastAPI backend that exposes the REST API, manages the 7-day program cache, and serves the React SPA. It is the integration point for all other components: it instantiates the storage provider, delegates fetching to `ActiveChannelFetcher`, and delegates Oscar data reads to `OscarLookup`.

## Public interface

- `POST /api/fetch` — scrape programs for all active channels (triggers ActiveChannelFetcher + AI validation)
- `GET /api/programs?date=YYYY-MM-DD` — load daily program file from storage
- `GET /api/programs/7days` — return 7-day aggregate (memory cache → storage file → rebuild)
- `GET /api/channels` — list all channels
- `GET /api/channels/active` — list active channels only
- `PUT /api/channels` — bulk update channel list
- `POST /api/channels/{channel_id}/toggle` — toggle a channel's active status
- `GET /api/status` — health check with available dates + storage stats
- `GET /api/config` — return `logo_base_url` for frontend
- `GET /api/oscars` — 7-day Oscar programs grouped by movie
- `GET /api/oscars/catalog` — full Oscar movie catalog from `movies-min.json`
- `POST /api/oscars/exclude` — add program to Oscar blacklist
- `DELETE /api/oscars/exclude` — remove program from Oscar blacklist
- `GET /api/oscars/blacklist` — list all blacklisted programs
- `GET /api/oscars/monthly?year=&month=` — monthly Oscar broadcast summary (always recomputes + saves)
- `GET /{full_path:path}` — serve React SPA (catch-all; only mounted if `frontend/build/` exists)

## Dependencies

**Depends on:**
- `storage.py` (StorageProvider) — all file I/O
- `fetch_active_programs.py` (ActiveChannelFetcher) — program scraping + Oscar annotation
- `fetch_tv_program.py` (TVProgramFetcher) — BASE_URL constant
- `oscars_lookup.py` (_normalize_title) — for blacklist endpoint deduplication

**Depended on by:**
- Frontend React app (HTTP)
- External scheduler (cron / GitHub Actions calling `/api/fetch`)

## Key implementation notes

- The `storage` singleton is created at module load time from `get_storage_provider()`. All endpoints share the same instance.
- The 7-day in-memory cache (`_programs_7days_cache`) is guarded by `_programs_7days_lock` (threading.Lock). This is necessary because FastAPI can run handlers on multiple threads.
- `cleanup_old_programs()` is a **no-op** — kept only for backward compatibility. Files are never deleted.
- `GET /api/oscars/monthly` always recomputes and overwrites the summary file; it does NOT use the 7-day cache. It iterates all daily files matching the month prefix via `storage.list_files()`.
- OpenAPI docs are disabled in production (`docs_url=None`, `redoc_url=None`) to reduce surface area.
- CORS is set to `allow_origins=["*"]` — this was intended for development and was never restricted for production.

## Related ADRs

- [ADR-0001](../architecture/adr/ADR-0001-existing-decisions.md) — FastAPI choice, file storage, SPA serving, two-layer caching
