# Onboarding Report

**Date:** 2026-04-11
**Mode:** Existing Codebase
**Project:** 7DaysTV (tv-programa)

## Summary

Onboarded an existing full-stack Bulgarian TV program aggregator. The backend is a Python/FastAPI server that scrapes TV schedules, annotates Oscar-nominated movies, and validates matches via external AI. The frontend is a React 19 TypeScript SPA. Deployed to Google Cloud Run with GCS storage.

## Tech Stack

- **Language(s):** Python 3.12, TypeScript
- **Framework(s):** FastAPI + uvicorn, React 19 + Create React App
- **Key Dependencies:** BeautifulSoup4, Pydantic, requests, firebase-admin, google-cloud-storage
- **Infrastructure:** Docker → Google Cloud Run, Google Cloud Storage for data

## Discovery Process

### Phase 1: Reconnaissance
- `requirements.txt` — Python dependencies
- `package.json` — React dependencies
- `Dockerfile` — Docker build configuration
- `app.py` — FastAPI server (all endpoints)
- `scripts/` — deploy, data deploy, archive, run-local
- No CI/CD pipeline (`.github/workflows/` absent)

### Phase 2: Domain Deep-Dives
- **`app.py`** (851 lines) — all API endpoints, caching logic, SPA serving
- **`storage.py`** (229 lines) — StorageProvider ABC + Local/Cloud implementations
- **`oscars_lookup.py`** (249 lines) — Oscar title matching, blacklist, TMDB integration
- **`fetch_tv_program.py`** (222 lines) — HTML scraper for TV schedule site
- **`fetch_active_programs.py`** (524 lines) — orchestrator with AI validation
- **`auth.py`** (55 lines) — Firebase auth helper (not yet active)
- **`frontend/src/App.tsx`** — routing via pathname
- **`frontend/src/components/ProgramsView.tsx`** (1005 lines) — main view
- **`frontend/src/components/OscarManager.tsx`** (1181 lines) — Oscar dedicated view
- **`frontend/src/components/ChannelManager.tsx`** (258 lines) — channel management
- **`frontend/src/config.ts`** — API URL resolution

### Phase 3: Patterns Found
- Storage abstraction pattern (ABC + factory)
- JSON file-based persistence (no database)
- Error handling: catch-all with print + return None/False
- Configuration via env vars + python-dotenv
- Frontend: per-component CSS, no router library, local useState
- No test suite

### Phase 4: Architecture
- Single-service architecture: FastAPI serves both API and SPA
- Data flows: scrape → annotate → validate → persist → cache → serve
- Two-layer cache (in-memory + persistent file)
- Storage abstraction hides local/cloud differences

## Generated Artifacts

### Documentation
- [x] `CLAUDE.md`
- [x] `ai-core/knowledge/architecture/overview.md`
- [x] `ai-core/knowledge/architecture/adr/README.md`
- [x] `ai-core/knowledge/architecture/adr/ADR-0001-existing-decisions.md`
- [x] `ai-core/knowledge/components/README.md`
- [x] `ai-core/knowledge/patterns/coding-patterns.md`
- [x] `ai-core/knowledge/conventions.md`
- [x] `ai-core/knowledge/domain.md`
- [x] `ai-core/knowledge/ownership.md`

### Components Documented
- [FastAPI Server](../knowledge/components/fastapi-server.md)
- [Storage Layer](../knowledge/components/storage-layer.md)
- [Oscar Lookup](../knowledge/components/oscar-lookup.md)
- [TV Scraper](../knowledge/components/tv-scraper.md)
- [Active Channel Fetcher](../knowledge/components/active-channel-fetcher.md)
- [React Frontend](../knowledge/components/react-frontend.md)
- [Auth Module](../knowledge/components/auth-module.md)

### ADRs Created
- ADR-0001: Existing decisions (8 decisions documented)

### Builder Skills Instantiated
- `backend-builder` — Python/FastAPI backend
- `frontend-builder` — React/TypeScript frontend
- `devops-builder` — Docker, Cloud Run, GCS

## Uncertainties & Verification Needed

- [VERIFY] No CI/CD pipeline detected — all deploys appear to be manual via `scripts/deploy-gcp.sh`
- [VERIFY] `auth.py` exists with Firebase setup but is not imported by `app.py` — is this intentionally unused or work-in-progress?
- [VERIFY] ADR-0002 file exists in `docs/architecture/adr/` but the `auth.py` module doesn't reference it — confirm if Firebase auth decision is finalized
- [VERIFY] No test suite exists — is this intentional or planned?
- [VERIFY] CORS is fully open (`allow_origins=["*"]`) — is this acceptable for production?
- [VERIFY] Swagger/Redoc docs are disabled — is this intentional?

## Next Steps

1. Review this report and all generated documentation
2. Correct any [VERIFY] items in the knowledge base
3. Run `/aisdlc-architect` when making your next architectural decision
4. Use `/backend-builder` or `/frontend-builder` when starting feature work

## Metrics

- **Files Read:** ~20
- **Documentation Generated:** 18 MD files
- **Total Lines Generated:** ~800
