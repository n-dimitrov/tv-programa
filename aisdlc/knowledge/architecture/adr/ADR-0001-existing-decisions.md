# ADR-0001: Existing Decisions

**Status:** Accepted
**Date:** 2026-05-16
**Context:** Decisions already baked into the codebase at time of onboarding.

---

## 1. JSON file storage instead of a database

**Context:** The application stores all data (programs, Oscar reference, blacklists, summaries) as JSON files on local filesystem or GCS.

**Decision:** Use JSON files with a `StorageProvider` abstraction layer instead of an RDBMS.

**Consequences:**
- Simple deployment — no database provisioning or migrations needed
- GCS provides durability and scalability for read-heavy workload
- No query capabilities beyond loading full files — all filtering/grouping is done in Python
- Write contention is not a concern since fetches are admin-triggered, not concurrent

## 2. FastAPI as backend framework

**Context:** Need a Python web framework to serve API endpoints and the React SPA.

**Decision:** Use FastAPI with uvicorn.

**Consequences:**
- Async support with Pydantic request validation
- Built-in OpenAPI docs (currently disabled: `docs_url=None`)
- Single process serves both API and static frontend assets in production

## 3. React SPA served by FastAPI catch-all

**Context:** Frontend is a React SPA that needs to be served alongside the API.

**Decision:** Build React app into `frontend/build/`, mount `/static` for assets, and serve `index.html` via a catch-all `/{path}` route.

**Consequences:**
- Single container deployment — no separate CDN or frontend hosting needed
- SPA routing works because all non-API, non-static paths return `index.html`
- API routes must be registered before the catch-all to avoid being swallowed

## 4. HTML scraping for TV schedule data

**Context:** The TV guide website has no public API.

**Decision:** Scrape HTML tables using BeautifulSoup.

**Consequences:**
- Fragile — any HTML structure change on the source site breaks the scraper
- `TVProgramFetcher` is isolated so changes are contained to one file
- Bulgarian text requires UTF-8 handling throughout

## 5. AI-assisted Oscar match validation

**Context:** Title-based matching produces false positives (e.g., a TV show named the same as a movie).

**Decision:** Send all Oscar matches to an external AI API for validation. False positives are auto-blacklisted with `scope: broadcast`.

**Consequences:**
- Reduces manual curation effort significantly
- Adds external API dependency and latency to the fetch flow
- AI model and endpoint are configurable via env vars — not tied to a specific provider

## 6. Window.location.pathname routing (no React Router)

**Context:** The SPA has only three views: programs (`/`), channels (`/channels`), Oscar (`/oscars`).

**Decision:** Use `window.location.pathname` checks in `App.tsx` instead of installing React Router.

**Consequences:**
- Zero additional dependency for routing
- Full page reload on navigation (no client-side transitions)
- Adding more routes would benefit from a proper router library

## 7. Docker → Cloud Run deployment

**Context:** Need a simple, scalable hosting solution.

**Decision:** Containerize with Docker, deploy to Google Cloud Run with GCS for data.

**Consequences:**
- Scales to zero when unused — cost-efficient for a personal project
- Cold starts add latency on first request after idle
- All env vars set via `deploy-gcp.sh` — no secrets in the image

## 8. Two-layer 7-day cache

**Context:** Building 7-day aggregate from individual daily files is expensive.

**Decision:** In-memory cache with `Lock` + TTL (30min default), backed by persistent `7days.json` file.

**Consequences:**
- Fast reads after first load
- Cache is invalidated/refreshed after every fetch operation
- Cold start loads from `7days.json` — no rebuild needed if file exists
