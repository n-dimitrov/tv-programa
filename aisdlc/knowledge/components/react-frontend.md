# React Frontend

**Location**: `frontend/src/`
**Status**: Active

## Purpose

Single-page application that displays TV program schedules with Oscar movie highlighting, channel filtering, search, and an Oscar management page with catalog browser, scanner, and monthly archive dialog.

## Public interface

Three views, selected by `window.location.pathname` in `App.tsx`:

- `/` → `ProgramsView` — 7-day program grid with Oscar poster strip, search, date/channel filters
- `/channels` → `ChannelManager` — manage active channels, trigger program fetches
- `/oscars` → `OscarManager` — Oscar movies on TV, catalog list, client-side scanner, archive dialog

## Dependencies

**Depends on:**
- Backend API (`/api/*` endpoints) — all data
- TMDB CDN (`image.tmdb.org`) — movie posters and provider logos

**Depended on by:**
- Nothing — leaf of the dependency tree

## Key implementation notes

- No React Router — routing is `window.location.pathname` string checks, which causes full page reloads on navigation
- `ProgramsView` is the largest component (~1000 lines) with complex scroll tracking, poster carousel auto-scroll, and date/channel/Oscar filtering
- Oscar modal with category badges and watch provider expansion is duplicated between `ProgramsView` and `OscarManager`
- `OscarManager` includes a client-side scanner that re-implements title matching logic from the backend (`normalizeTitle`, `stripEpisodeSuffix`)
- `config.ts` detects localhost at runtime and switches API URL accordingly
- All UI text is in Bulgarian except Oscar-related labels (English)
- Admin mode on `/oscars` is activated via `?admin=true` query param — enables blacklist management

## Related ADRs

- [ADR-0001](../architecture/adr/ADR-0001-existing-decisions.md) — SPA served by FastAPI, no React Router
