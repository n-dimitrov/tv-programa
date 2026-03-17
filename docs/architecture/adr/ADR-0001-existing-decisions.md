# ADR-0001: Existing Architectural Decisions

**Status**: Accepted
**Date**: 2026-03-17
**Context**: Documents architectural decisions already baked into the codebase at the time of onboarding.

---

## Decision 1: FastAPI as the backend framework

**Decision**: Use FastAPI (Python 3.12) rather than Flask or Django.

**Context**: A lightweight REST API was needed to serve stored JSON data. No ORM, no admin, no session handling required. Performance matters for the 7-day aggregate endpoint.

**Consequences**:
- Automatic request/response validation via Pydantic models
- OpenAPI docs generated automatically (disabled in production via `docs_url=None`)
- ASGI runtime (uvicorn) supports async handlers where needed
- All endpoints must use FastAPI's exception handling (`raise HTTPException`)

---

## Decision 2: File-based storage with abstracted StorageProvider

**Decision**: Store all data as JSON files, never use a relational or NoSQL database. Abstract file I/O behind a `StorageProvider` ABC with `LocalStorageProvider` and `CloudStorageProvider` implementations.

**Context**: The data model is simple (daily program dumps, channel config, movie catalog) and doesn't require transactions or querying. Cloud Run is stateless, so cloud storage is needed in production. Local development needs no infrastructure.

**Consequences**:
- All file access must go through `storage.read_json()` / `storage.write_json()` — never `open()` directly in app code (except in `OscarLookup` fallback paths)
- `ENVIRONMENT=cloud` switches to GCS at startup; `ENVIRONMENT=local` uses the filesystem
- No migrations — schema changes require manual data updates
- The Oscar catalog files (`movies-min.json`, `oscars-min.json`) are baked into the Docker image; runtime-generated files (daily programs) live in GCS

---

## Decision 3: Programs are never deleted

**Decision**: Old daily program files (older than 7 days) are retained in storage and never deleted. They are simply not loaded by the application.

**Context**: `cleanup_old_programs()` was originally designed to delete files but was converted to a no-op. Historical data has potential value for monthly summaries.

**Consequences**:
- `data/programs/` will accumulate files indefinitely — manual archival via `scripts/archive-month.sh` is needed
- Monthly Oscar summary (`/api/oscars/monthly`) can reach back further than 7 days because it reads all files with a matching date prefix

---

## Decision 4: React SPA served directly by FastAPI

**Decision**: The React production build is copied into `frontend/build/` and served by FastAPI via a catch-all route, rather than deploying them as separate services.

**Context**: Simplifies deployment to a single Cloud Run service. No need for a separate static hosting setup (e.g., CDN or Cloud Storage bucket for the frontend).

**Consequences**:
- In development: run backend on 8000 and frontend dev server on 3000 separately (CORS is enabled)
- In production: `npm run build` must complete before building the Docker image
- Frontend routing is path-based (checks `window.location.pathname`) rather than using React Router, to avoid client-side router setup

---

## Decision 5: Oscar matching uses normalized title lookup (no fuzzy matching)

**Decision**: Title matching in `OscarLookup` normalizes to lowercase alphanumeric tokens and requires an exact, unique match — one title maps to exactly one movie ID.

**Context**: Bulgarian TV titles may or may not match English TMDB titles. Fuzzy matching would produce too many false positives, especially for common words.

**Consequences**:
- The Bulgarian title (`title_bg`) and English title (`title`) in the movie database are both indexed
- If a normalized title maps to more than one movie ID, the match is skipped entirely (ambiguity penalty)
- AI validation is the second line of defense — it catches cases where a title accidentally matches the wrong movie
- Episode suffixes (сезон/еп.) are stripped before matching

---

## Decision 6: Two-layer caching for 7-day data

**Decision**: Cache the 7-day aggregate in two places: an in-memory dict (with TTL and threading lock) and a persistent `data/programs/7days.json` file.

**Context**: `GET /api/programs/7days` is the hottest endpoint (the React frontend fetches it on every page load). GCS reads have latency; in-memory caching reduces them.

**Consequences**:
- Default TTL is 30 minutes (`PROGRAMS_7DAYS_CACHE_TTL`, configurable)
- The in-memory cache is process-local — if Cloud Run scales to multiple instances, each has its own cache
- After any `POST /api/fetch`, `refresh_7days_aggregate()` is called to keep both layers fresh

---

## Decision 7: AI validation via external API

**Decision**: Use a configurable external AI endpoint (`AI_API_URL` + `AI_MODEL`) to validate Oscar title matches rather than a hardcoded integration.

**Context**: The Oscar title matching sometimes produces false positives (e.g., a Bulgarian TV show with the same normalized title as an Oscar movie). An AI model is used to cross-check descriptions.

**Consequences**:
- `AI_API_URL` and `AI_MODEL` must be set; if absent, validation is skipped and all matches are kept
- False positives identified by AI are auto-added to the blacklist with `scope: broadcast`
- Validation prompt is templated from `data/prompts/oscar_validation.txt`
- AI calls are logged to `data/results/{date}_oscar_validation_*.json` for debugging

---

## Decision 8: Docker + Google Cloud Run deployment

**Decision**: Package as a Docker container deployed to Cloud Run, with GCS for persistent storage.

**Context**: Cloud Run provides auto-scaling, no server management, and pay-per-use pricing. GCS integrates naturally for file storage.

**Consequences**:
- Container is stateless — all mutable data must go to GCS, not the container filesystem
- `ENVIRONMENT=cloud` is set in the Dockerfile `ENV` directive
- `data/movies-min.json` and `data/oscars-min.json` are **excluded** from the Docker image (via `.dockerignore`) — they must be uploaded to GCS with `./scripts/deploy-gcp-data.sh` before the first deploy
- `data/tv_channels.json`, `data/prompts/`, and the React build are baked into the image
- Runtime-generated files (daily programs, blacklist, summaries, AI validation logs) always go to GCS
