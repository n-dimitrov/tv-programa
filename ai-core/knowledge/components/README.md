# Component Registry

| Component | Description | Doc |
|---|---|---|
| FastAPI Server | Main backend — all API endpoints, caching, SPA serving | [fastapi-server.md](./fastapi-server.md) |
| Storage Layer | Local/cloud storage abstraction for all file I/O | [storage-layer.md](./storage-layer.md) |
| Oscar Lookup | Oscar title matching, blacklist, TMDB watch info | [oscar-lookup.md](./oscar-lookup.md) |
| TV Scraper | HTML scraper for Bulgarian TV schedule site | [tv-scraper.md](./tv-scraper.md) |
| Active Channel Fetcher | Orchestrator — fetches all channels, runs Oscar matching + AI validation | [active-channel-fetcher.md](./active-channel-fetcher.md) |
| React Frontend | SPA with ProgramsView, ChannelManager, OscarManager | [react-frontend.md](./react-frontend.md) |
| Auth Module | Firebase token verification (not yet active) | [auth-module.md](./auth-module.md) |
