# Component Registry

| Component | Description | Doc |
|---|---|---|
| app | FastAPI server: API endpoints, caching, SPA serving | [app.md](app.md) |
| storage | StorageProvider ABC: local filesystem and GCS implementations | [storage.md](storage.md) |
| oscar-lookup | Oscar title matching, blacklist, TMDB watch info enrichment | [oscar-lookup.md](oscar-lookup.md) |
| fetcher | TV program scraper + active-channel orchestrator + AI validation | [fetcher.md](fetcher.md) |
| frontend | React 19 TypeScript SPA: ProgramsView, ChannelManager, OscarManager | — |
