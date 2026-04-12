# ADR-0001: Existing Decisions at Onboarding

**Status**: Accepted
**Date**: 2026-04-11
**Context**: Decisions already baked into the codebase at the time of AI-SDLC onboarding.

---

## 1. FastAPI as backend framework

**Context**: The project needed a Python web framework to serve REST APIs and static frontend assets.

**Decision**: FastAPI was chosen with uvicorn as the ASGI server.

**Consequences**:
- Async-ready, though current code is mostly synchronous (scraping, file I/O)
- Pydantic models provide request/response validation
- Built-in OpenAPI docs (currently disabled via `docs_url=None`)
- SPA catch-all route works well for serving React build

## 2. JSON files as primary storage (no database)

**Context**: The data model is simple (daily program listings, channel config, Oscar reference data) and the app serves a single user/admin.

**Decision**: All data is stored as JSON files — daily program files (`YYYY-MM-DD.json`), channel config, Oscar blacklist, etc. No RDBMS or document database.

**Consequences**:
- Very simple deployment — no database to provision or migrate
- Concurrency is handled via in-memory Lock for cache; no file-level locking
- Data cleanup is a no-op — old files accumulate but are filtered at read time
- Trade-off: no query capabilities, no transactions, limited to small data volumes

## 3. Storage abstraction layer (local/cloud)

**Context**: App runs locally during development and on Cloud Run in production. File paths must work in both environments.

**Decision**: Abstract base class `StorageProvider` with `LocalStorageProvider` and `CloudStorageProvider` implementations. Factory function `get_storage_provider()` selects based on `ENVIRONMENT` env var.

**Consequences**:
- Same application code works locally and in cloud
- All file operations must go through the storage provider — never use `open()` directly
- GCS operations are synchronous (using `google-cloud-storage` client)

## 4. HTML scraping for program data

**Context**: The Bulgarian TV listing site has no public API. Program data must be extracted from rendered HTML.

**Decision**: Use `requests` + `BeautifulSoup4` to scrape program schedules from the site's HTML tables.

**Consequences**:
- Fragile — HTML structure changes can break the parser
- Title/description splitting uses regex heuristics for Bulgarian text patterns
- Sequential channel fetching (one HTTP request per channel)

## 5. Oscar data from curated JSON files

**Context**: Oscar winner/nominee information needs to be matched against Bulgarian TV program titles.

**Decision**: Pre-curated `movies-min.json` (movie metadata with Bulgarian titles) and `oscars-min.json` (award categories) stored as static files. Title matching via normalized string comparison.

**Consequences**:
- Matching is fast (in-memory indexes built at startup)
- Only exact single-match titles are annotated (ambiguous titles skipped)
- Bulgarian title coverage depends on manual curation of `movies-min.json`
- Blacklist mechanism handles false positives at broadcast/channel/global scope

## 6. React SPA served by FastAPI

**Context**: The frontend needed to be deployed alongside the backend without a separate hosting setup.

**Decision**: React app is built to `frontend/build/` and served by FastAPI via static file mount and catch-all route. In development, React dev server proxies API calls.

**Consequences**:
- Single Docker container for both frontend and backend
- No need for CDN or separate frontend hosting
- SPA routing handled by catch-all returning `index.html`
- Frontend dev uses port 3000, backend port 8000

## 7. Google Cloud Run for deployment

**Context**: The app is a personal project needing low-cost, low-maintenance hosting with container support.

**Decision**: Docker container deployed to Cloud Run. GCS bucket for persistent storage. No CI/CD pipeline — manual deployment via `scripts/deploy-gcp.sh`.

**Consequences**:
- Pay-per-request pricing suits low-traffic personal project
- Cold starts can delay first request
- Stateless container — all persistent data must go through GCS
- Manual deployment with shell scripts

## 8. AI validation of Oscar matches

**Context**: Automated title matching produces false positives (e.g., a TV show title matching a movie title).

**Decision**: After Oscar matching, send matches to an external AI API for validation. The AI returns a JSON array with `matched: true/false` per entry. False positives are auto-blacklisted with `scope: broadcast`.

**Consequences**:
- Reduces false positives significantly
- Adds latency and cost to fetch operations
- Depends on external AI API availability
- Validation prompt template stored in `data/prompts/oscar_validation.txt`
