# Architecture Overview

## System topology

```
┌─────────────────┐     ┌──────────────────────┐     ┌──────────────────┐
│  React SPA      │────▶│  FastAPI Server       │────▶│  Storage Layer   │
│  (frontend/)    │     │  (app.py)             │     │  (storage.py)    │
│                 │◀────│                       │◀────│                  │
│  ProgramsView   │     │  /api/programs/*      │     │  Local FS (dev)  │
│  ChannelManager │     │  /api/channels/*      │     │  GCS (prod)      │
│  OscarManager   │     │  /api/oscars/*        │     └──────────────────┘
└─────────────────┘     │  /api/fetch           │
                        │  /api/config           │
                        └──────┬───────┬─────────┘
                               │       │
                    ┌──────────▼──┐ ┌──▼─────────────┐
                    │ TV Schedule │ │ AI Validation   │
                    │ Scraper     │ │ API (external)  │
                    │ (fetch_*.py)│ │                 │
                    └──────┬──────┘ └─────────────────┘
                           │
                    ┌──────▼──────┐     ┌──────────────┐
                    │ Oscar       │────▶│ TMDB API     │
                    │ Lookup      │     │ (watch info) │
                    │ (oscars_    │     └──────────────┘
                    │  lookup.py) │
                    └─────────────┘
```

## Data flows

### 1. Program Fetch (write path)

1. User triggers fetch via `POST /api/fetch` (from ChannelManager UI) with `date_path` (Днес/Вчера/Утре)
2. `ActiveChannelFetcher` loads active channels from `data/tv_channels.json`
3. For each channel, `TVProgramFetcher` scrapes the Bulgarian TV listing site (HTML parsing via BeautifulSoup)
4. `OscarLookup.annotate_program()` matches program titles against `movies-min.json` using normalized title comparison
5. If matches found, AI validation is invoked — sends matches to external AI API with prompt template from `data/prompts/oscar_validation.txt`
6. False positives are auto-blacklisted (scope: broadcast) and Oscar annotations removed from in-memory data
7. Validated data is saved as `data/programs/YYYY-MM-DD.json` via StorageProvider
8. 7-day aggregate is rebuilt and cached

### 2. Program Read (read path)

1. React SPA loads → calls `GET /api/programs/7days`
2. Server checks in-memory cache (TTL-based with Lock)
3. Cache miss → reads `data/programs/7days.json` from storage
4. Storage miss → rebuilds from individual daily files for last 7 days
5. Data returned to frontend, which groups programs by channel, adds date navigation, Oscar filtering

### 3. Oscar Matching

1. `OscarLookup._load()` builds two indexes from `movies-min.json`:
   - `_title_index`: normalized title → set of movie_ids
   - `_title_year_index`: (year, normalized title) → set of movie_ids
2. For each TV program title, strips episode suffixes, normalizes, and looks up
3. Only matches with exactly 1 movie_id are accepted (ambiguous = skip)
4. Matched programs get enriched with Oscar categories, TMDB poster, overview, and watch provider info

## Key boundaries

- **Storage abstraction** (`StorageProvider` ABC): All file I/O goes through this. `LocalStorageProvider` for dev, `CloudStorageProvider` for production. Never bypass.
- **Scraper isolation**: `TVProgramFetcher` only does HTTP + HTML parsing. It knows nothing about storage, Oscar data, or AI validation.
- **Oscar module**: Self-contained lookup with its own indexes. Stateless after init (except watch provider cache). Blacklist is loaded once at init.
- **Frontend/Backend boundary**: React SPA communicates only via `/api/*` endpoints. In production, served from same origin by FastAPI catch-all.

## External dependencies

| Dependency | Purpose | Used by |
|---|---|---|
| Bulgarian TV listing site | HTML scraping for program schedules | `fetch_tv_program.py` |
| TMDB API | Movie watch provider info (flatrate/rent/buy) | `oscars_lookup.py` |
| External AI API | Oscar match validation (false positive detection) | `fetch_active_programs.py` |
| Google Cloud Storage | Persistent data storage in production | `storage.py` |
| Firebase Admin SDK | Auth token verification (not yet active) | `auth.py` |
