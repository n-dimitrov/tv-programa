# Architecture Overview

## System topology

```
┌─────────────────────────────────────────────────────────────┐
│                     Google Cloud Run                         │
│  ┌────────────────────────────────────────────────────────┐  │
│  │                   FastAPI (app.py)                      │  │
│  │  ┌──────────┐  ┌──────────┐  ┌────────────────────┐   │  │
│  │  │ /api/*   │  │ /static  │  │ /{path} catch-all  │   │  │
│  │  │ endpoints│  │ assets   │  │ → React index.html │   │  │
│  │  └────┬─────┘  └──────────┘  └────────────────────┘   │  │
│  │       │                                                │  │
│  │  ┌────┴───────────────────────────────────┐            │  │
│  │  │         Business Logic Layer            │            │  │
│  │  │  ┌──────────────┐  ┌────────────────┐  │            │  │
│  │  │  │ ActiveChannel│  │  OscarLookup   │  │            │  │
│  │  │  │   Fetcher    │  │  (annotator)   │  │            │  │
│  │  │  └──────┬───────┘  └───────┬────────┘  │            │  │
│  │  │         │                  │            │            │  │
│  │  │  ┌──────┴───────┐  ┌──────┴────────┐   │            │  │
│  │  │  │ TVProgram    │  │ Title Index   │   │            │  │
│  │  │  │  Fetcher     │  │ + Blacklist   │   │            │  │
│  │  │  └──────────────┘  └───────────────┘   │            │  │
│  │  └────────────────────────────────────────┘            │  │
│  │       │                                                │  │
│  │  ┌────┴──────────────────────┐                         │  │
│  │  │   StorageProvider (ABC)   │                         │  │
│  │  │   Local FS │ GCS Client   │                         │  │
│  │  └──────────────────────────┘                          │  │
│  └────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
         │              │                │
         ▼              ▼                ▼
   ┌──────────┐  ┌───────────┐   ┌────────────┐
   │ TV Guide │  │ GCS Bucket│   │ TMDB API   │
   │ Website  │  │ (data/)   │   │ (watch     │
   │ (scrape) │  │           │   │  providers)│
   └──────────┘  └───────────┘   └────────────┘
         │
         ▼
   ┌──────────┐
   │ AI API   │
   │(validate │
   │ matches) │
   └──────────┘
```

## Data flows

### 1. Daily program fetch (primary flow)

```
User clicks "Fetch Today" → POST /api/fetch
  → ActiveChannelFetcher.fetch_all_programs()
    → For each active channel:
      → TVProgramFetcher.fetch_programs(channel, date)
        → HTTP GET to TV guide website → parse HTML tables
      → OscarLookup.annotate_program() for each program
        → Normalize title → look up in title index
        → If unique match: add oscar payload (wins, noms, categories, poster, watch)
        → If ambiguous (>1 candidate): collect for AI disambiguation
        → If blacklisted: skip
    → AI disambiguation (if ambiguous titles collected):
      → Send ambiguous titles + candidates to AI API
      → High-confidence resolutions → annotate; uncertain → skip
    → AI validation (if enabled):
      → Build prompt with all matches
      → POST to AI API → parse JSON response
      → False positives: remove oscar from result, add to blacklist
        → Non-movie content (TV show, sports): scope: all
        → Wrong movie version: scope: broadcast
  → save_programs_for_date() → storage.write_json("data/programs/YYYY-MM-DD.json")
  → refresh_7days_aggregate() → rebuild + cache
  → Return summary with oscar stats
```

### 2. 7-day programs view (read flow)

```
User opens "/" → React loads → GET /api/programs/7days
  → Check in-memory cache (Lock + TTL)
    → Hit: return cached data
    → Miss: load 7days.json from storage
      → Hit: cache + return
      → Miss: build from daily files → save aggregate → cache → return
```

### 3. Oscar page (read flow)

```
User opens "/oscars" → GET /api/oscars
  → Load 7-day data (same cache chain as above)
  → Group programs by movie (title + title_en deduplication)
  → Sort by winner count desc → return
```

## Key boundaries

- **Storage abstraction** (`storage.py`): All file I/O goes through `StorageProvider`. `LocalStorageProvider` for dev, `CloudStorageProvider` for prod. Never use `open()` directly.
- **Scraper boundary** (`fetch_tv_program.py`): Only module that talks to the TV guide website. Returns raw program dicts.
- **Oscar annotation** (`oscars_lookup.py`): Self-contained lookup with its own indexes. Only dependency is storage for loading reference data + TMDB API for watch providers.
- **Frontend/Backend boundary**: React SPA communicates only via `/api/*` endpoints. In dev: port 3000 → proxy to port 8000. In prod: FastAPI serves both.

## External dependencies

| Service | Purpose | Config |
|---|---|---|
| TV Guide website (`xn----8sbafg9clhjcp.bg`) | Scrape daily schedules | Hardcoded in `TVProgramFetcher.BASE_URL` |
| Google Cloud Storage | Persistent data storage (prod) | `GCS_BUCKET_NAME` env var |
| TMDB API | Watch provider info for Oscar movies | `TMDB_API_KEY`, `TMDB_WATCH_REGION` env vars |
| AI API (configurable) | Validate Oscar title matches | `AI_API_URL`, `AI_MODEL` env vars |
| Firebase Admin SDK | Auth (not yet wired in) | `FIREBASE_SERVICE_ACCOUNT_KEY` env var |
| Google Cloud Run | Hosting | `deploy-gcp.sh` |
