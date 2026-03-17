# TV Program Manager (7DaysTV)

A full-stack app that scrapes Bulgarian TV channel schedules from a third-party site, annotates programs with Oscar winner/nominee data, validates matches via an AI API, and serves them through a FastAPI backend with a React frontend. Targets Bulgarian viewers and deploys to Google Cloud Run with GCS storage.

## Quick context

- **Type**: Full-stack web app (API + SPA)
- **Stack**: Python 3.12, FastAPI, Uvicorn, BeautifulSoup4 | React 19 (TypeScript), Create React App
- **Database**: None — JSON files on local filesystem (dev) or Google Cloud Storage (prod)
- **Deployment**: Docker → Google Cloud Run, GCS as file storage backend
- **Repo structure**: Single repo — Python backend at root, React frontend at `frontend/`
- **Phase**: Active development

## How to work in this codebase

- Read `docs/patterns/coding-patterns.md` BEFORE implementing anything — patterns are established
- Read relevant ADRs before making architectural changes: `docs/architecture/adr/README.md`
- Run `/architect` for decisions with multi-week implications
- Run `/implement` to get pattern-aware implementation assistance

## Key facts

1. **Storage is selected at startup** via `ENVIRONMENT` env var (`local` or `cloud`). `.env.local` is loaded with `override=False`, so Cloud Run env vars always win. Never import filesystem paths directly — always use `storage.py` methods.
2. **Programs are never deleted** — old files accumulate in storage but only the last 7 days are served. The `cleanup_old_programs()` function in `app.py` is a no-op kept for backward compatibility.
3. **Oscar title matching is conservative**: `OscarLookup._find_movie_id()` only returns a match if a normalized title maps to exactly ONE movie in the database. Ambiguous titles return no match.
4. **AI validation auto-blacklists false positives** at `scope: broadcast`. On the next fetch, those programs will never get Oscar annotations again. Blacklist is persisted to `data/oscar_blacklist.json`.
5. **Two-layer 7-day cache**: in-memory (thread-locked, expires at `PROGRAMS_7DAYS_CACHE_TTL`) + a persistent `data/programs/7days.json` file in storage. Read order: memory → storage file → rebuild from daily files.
6. **OscarLookup.enabled is always True** when a storage_provider is passed to it, even if the Oscar data files don't exist locally. Check this when debugging missing Oscar data in cloud mode.
7. **The React SPA is served by FastAPI** in production from `frontend/build/`. In dev, run backend on 8000 and frontend on 3000 separately. The catch-all `/{full_path:path}` route handles React Router.
8. **Scraping target** is a Bulgarian TV schedule site accessed via a punycode domain (`TVProgramFetcher.BASE_URL`). The scraper parses HTML `<tr>` rows with `/predavane/` links.

## Documentation map

| Want to understand... | Read... |
|---|---|
| System topology and data flows | `docs/architecture/overview.md` |
| Key architectural decisions | `docs/architecture/adr/ADR-0001-existing-decisions.md` |
| Storage abstraction | `docs/components/storage.md` |
| Oscar lookup + AI validation | `docs/components/oscar-lookup.md` |
| TV program scraper | `docs/components/fetcher.md` |
| FastAPI app + caching | `docs/components/app.md` |
| All components at a glance | `docs/components/README.md` |
| Coding patterns (error handling, storage, etc.) | `docs/patterns/coding-patterns.md` |

## Commands

```bash
# Backend
source venv/bin/activate
./scripts/run-local.sh        # Start backend (sets ENVIRONMENT=local, port 8000)
python app.py                 # Manual start

# Frontend
cd frontend && npm start      # Dev server on port 3000
cd frontend && npm run build  # Production build (output to frontend/build/)
cd frontend && npm test       # Run tests

# Cloud deployment
./scripts/deploy-gcp.sh       # Build Docker image, push to GCR, deploy to Cloud Run
./scripts/deploy-gcp-data.sh  # Upload data files to GCS bucket
```

## Directory map

```
tv-programa/
├── app.py                    # FastAPI server, API endpoints, caching
├── storage.py                # StorageProvider ABC + Local/GCS implementations
├── oscars_lookup.py          # Oscar title matching, blacklist, TMDB watch info
├── fetch_tv_program.py       # HTML scraper for individual TV channel
├── fetch_active_programs.py  # Orchestrator: all active channels + AI validation
├── requirements.txt          # Python deps (FastAPI, uvicorn, requests, bs4, etc.)
├── Dockerfile                # Cloud Run container (python:3.12-slim)
├── data/
│   ├── programs/             # Daily YYYY-MM-DD.json + 7days.json aggregate
│   ├── movies-min.json       # TMDB movie database — NOT in Docker image, must be in GCS
│   ├── oscars-min.json       # Oscar winners/nominees — NOT in Docker image, must be in GCS
│   ├── oscar_blacklist.json  # Manual + AI-generated false-positive exclusions
│   ├── tv_channels.json      # Channel config (id, name, icon, active)
│   ├── prompts/              # AI prompt templates
│   ├── results/              # AI validation logs per date
│   └── summaries/            # Monthly Oscar summary JSONs
├── scripts/                  # Deployment and local run scripts
├── frontend/                 # React 19 + TypeScript SPA
│   └── src/components/       # ProgramsView, ChannelManager, OscarManager
└── docs/                     # Architecture, ADRs, component docs, patterns
```
