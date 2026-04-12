# 7DaysTV

A full-stack Bulgarian TV program aggregator that scrapes daily schedules from a TV listing site, annotates movies with Oscar winner/nominee data from a curated database, validates matches via an external AI API, and presents everything through a React SPA. Deployed to Google Cloud Run with GCS for persistent storage.

## Quick context

- **Type**: Web app (API + SPA)
- **Stack**: Python 3.12 / FastAPI / uvicorn, React 19 / TypeScript / Create React App
- **Database**: JSON files on local filesystem or Google Cloud Storage (no RDBMS)
- **Deployment**: Docker → Google Cloud Run, GCS bucket for data
- **Repo structure**: Single service — flat Python backend + `frontend/` React SPA
- **Phase**: Active development

## How to work in this codebase

### Load order (follow this sequence)

**1. Stable knowledge — always load before starting any task**
- `ai-core/knowledge/architecture/overview.md` — system topology and key boundaries
- `ai-core/knowledge/patterns/coding-patterns.md` — shared patterns all builders must follow

**2. Active memory — load after knowledge, before starting any task**
- `ai-core/memory/patterns.md` — emergent patterns from recent sessions
- `ai-core/memory/anti-patterns.md` — what has been tried and caused problems

**3. On demand — load only when relevant**
- `ai-core/knowledge/architecture/adr/README.md` — before any architectural change
- `ai-core/memory/learnings.md` — when debugging a recurring issue or uncertain about an approach
- `ai-core/knowledge/domain.md` — when modeling new entities or business logic

**4. Never load proactively**
- `ai-core/meta/run-log.jsonl` — raw data; only if asked to analyze run history

### Other rules
- Run `/aisdlc-architect` for any decision with multi-week implications
- Never write to `ai-core/meta/run-log.jsonl` directly — always call `bash ai-core/hooks/log-run.sh` with the three required arguments

## Key facts

1. Storage is selected at startup via `ENVIRONMENT=local|cloud` env var; always use `storage.*` methods — never read/write files directly
2. Programs are NEVER deleted from storage — `cleanup_old_programs()` is an intentional no-op; old files stay but are filtered out at load time
3. Oscar matching skips ambiguous titles — if `>1 movie_id` matches a normalized title, no annotation is added (see `_find_movie_id`)
4. AI validation auto-blacklists false positives with `scope: broadcast` — this happens in-memory during fetch, before data is persisted
5. The 7-day cache is two-layer: in-memory (`Lock` + TTL) + `7days.json` persistent file on storage
6. `OscarLookup.enabled = True` whenever a `storage_provider` is passed, even if data files are missing on the local filesystem
7. React SPA is served by FastAPI's catch-all route at `/` — in dev, React runs on port 3000 and proxies API calls to port 8000
8. Auth module (`auth.py`) uses Firebase Admin SDK but is not yet wired into API endpoints — `get_optional_user` always returns `None` when no token is present
9. No test suite exists — changes must be verified manually

## Documentation map

| Want to understand... | Read... |
|---|---|
| System topology and data flows | `ai-core/knowledge/architecture/overview.md` |
| Existing architectural decisions | `ai-core/knowledge/architecture/adr/README.md` |
| Component details | `ai-core/knowledge/components/README.md` |
| Coding patterns | `ai-core/knowledge/patterns/coding-patterns.md` |
| Domain model and entities | `ai-core/knowledge/domain.md` |
| Recent session learnings | `ai-core/memory/learnings.md` |
| Approaches to avoid | `ai-core/memory/anti-patterns.md` |

## Commands

```bash
source venv/bin/activate && python app.py   # Start backend (port 8000)
cd frontend && npm start                     # Start frontend dev server (port 3000)
cd frontend && npm run build                 # Production build (output: frontend/build/)
./scripts/deploy-gcp.sh                      # Deploy to Cloud Run
./scripts/deploy-gcp-data.sh                 # Deploy data files to GCS
./scripts/archive-month.sh                   # Archive monthly program files to GCS
```

## Directory map

```
tv-programa/
├── app.py                  # FastAPI server — all API endpoints, caching, SPA serving
├── auth.py                 # Firebase auth helper (not yet wired in)
├── storage.py              # Storage abstraction (local filesystem / GCS)
├── oscars_lookup.py        # Oscar title matching, blacklist, TMDB watch providers
├── fetch_tv_program.py     # HTML scraper for TV schedule site
├── fetch_active_programs.py # Orchestrator: all channels + AI validation
├── data/                   # JSON data files (channels, Oscar reference, programs)
├── frontend/               # React 19 TypeScript SPA
│   └── src/components/     # ProgramsView, ChannelManager, OscarManager
├── scripts/                # Deployment and maintenance scripts
└── ai-core/                # All project knowledge and self-evolving memory
    ├── knowledge/          # Stable: architecture, patterns, components, domain
    ├── memory/             # Evolving: learnings, patterns, anti-patterns
    ├── meta/               # Audit: run logs, usage stats, evolution history
    └── hooks/              # Automation: log-run, extract-learning, summarize-failure
```
