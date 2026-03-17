# Architecture Overview

## Topology

```
  External Scheduler
  (cron, GitHub Actions)
         |
         | POST /api/fetch
         v
+----------------------------------+
|  FastAPI Backend  (app.py)       |
|                                  |
|  REST API endpoints              |
|  In-memory 7-day cache (Lock)    |
|                                  |
|  ActiveChannelFetcher            |
|    - TVProgramFetcher (scraper)  |
|    - OscarLookup (annotator)     |
|    - AI validation (external)    |
|                                  |
|  StorageProvider                 |
|  (abstract interface)            |
+----------+---+-------------------+
           |   |
  +--------+   +---------+
  |                      |
  v                      v
LocalStorageProvider  CloudStorageProvider
(data/ on disk)       (Google Cloud Storage)

  FastAPI also serves the React SPA
  from frontend/build/ at runtime.

+----------------------------------+
|  React Frontend  (frontend/)     |
|  TypeScript, Create React App    |
|                                  |
|  Routes (path-based, no router): |
|  /          -> ProgramsView      |
|  /channels  -> ChannelManager    |
|  /oscars    -> OscarManager      |
+----------------------------------+
         |
         | HTTP (CORS enabled, all origins in prod)
         v
+----------------------------------+
|  Bulgarian TV schedule site      |
|  (scraped by TVProgramFetcher)   |
+----------------------------------+

+----------------------------------+
|  TMDB API (external)             |
|  - Watch providers per region    |
+----------------------------------+

+----------------------------------+
|  AI validation API (external)    |
|  AI_API_URL env var              |
|  - Validates Oscar matches       |
+----------------------------------+
```

## Key Boundaries

- **Storage boundary**: All file I/O goes through `StorageProvider`. Never read/write files directly in `app.py` or fetchers.
- **Environment boundary**: `ENVIRONMENT=local|cloud` at startup determines which storage backend is instantiated.
- **Oscar data boundary**: `OscarLookup` is the only component that reads Oscar/movie data and applies blacklist logic. API endpoints call `annotate_program()` on raw programs.
- **AI boundary**: `ActiveChannelFetcher._call_ai_api()` is the only entry point to the external AI validation service.

## Data Flows

### 1. Fetch Flow (triggered by scheduler)

```
POST /api/fetch {date_path}
  -> app.py: fetch_programs()
  -> ActiveChannelFetcher.fetch_all_programs()
     for each active channel:
       -> TVProgramFetcher.fetch_programs()  # scrape HTML
       -> OscarLookup.annotate_program()      # match Oscar data
     -> _run_ai_validation()                  # external AI call
     -> _process_ai_validations()             # remove false positives
  -> save_programs_for_date()                 # persist to storage
  -> refresh_7days_aggregate()                # update cache + 7days.json
  <- return Oscar summary to caller
```

### 2. Display Flow (user browses programs)

```
GET /api/programs/7days
  -> get_cached_7days()    # check in-memory cache
  -> load_7days_aggregate()  # read 7days.json from storage
  -> refresh_7days_aggregate()  # rebuild from daily files if needed
  <- {date: {programs: {channel_id: {...}}}}

React renders: date tabs -> channel cards -> program list
Oscar-annotated programs show badge + metadata modal
```

### 3. Oscar Catalog / Monthly Summary Flow

```
GET /api/oscars
  -> load 7-day data from cache
  -> group programs by (title, title_en) key
  -> sort by (winner, nominee) desc
  <- list of movies with broadcast schedules

GET /api/oscars/monthly?year=2026&month=3
  -> list all daily files for that month in storage
  -> aggregate Oscar data across all days
  -> always re-saves to data/summaries/YYYY-MM_oscar_monthly.json
  <- summary with winners, nominees, per-channel stats
```

### 4. AI Validation Flow (during fetch)

```
Oscar matches collected during channel scraping
  -> format as JSON array [{time, channel, title, description, overview, year}]
  -> save prompt to data/results/{date}_oscar_validation_prompt.txt
  -> POST to AI_API_URL with oscar_validation.txt prompt template
  <- JSON array [{matched: bool, confidence: str, response: str, red_flags: []}]
  -> false positives: remove oscar from in-memory result + add to blacklist
  -> save raw AI response to data/results/{date}_oscar_validation_response.json
```

## External Dependencies

| Dependency | Purpose | Config |
|---|---|---|
| Bulgarian TV site (punycode domain) | Source of program schedules | Hardcoded in `TVProgramFetcher.BASE_URL` |
| TMDB API | Movie posters, descriptions, streaming providers | `TMDB_API_KEY`, `TMDB_WATCH_REGION` |
| AI validation API | Validate Oscar title matches, reduce false positives | `AI_API_URL`, `AI_MODEL` |
| Google Cloud Storage | File storage in cloud mode | `GCS_BUCKET_NAME` |
| Google Cloud Run | Container hosting | `ENVIRONMENT=cloud`, `PORT` |
