# React Frontend

**Location**: `frontend/src/`
**Status**: Active

## Purpose

Single-page application that displays 7 days of TV program data with Oscar movie highlighting, channel filtering, search, and an Oscar movie catalog with scanner functionality.

## Public interface (routes)

- `/` — ProgramsView (default): 7-day program grid with Oscar poster carousel, search, date/channel filters
- `/channels` — ChannelManager: toggle active channels, trigger program fetching
- `/oscars` — OscarManager: dedicated Oscar movie view with list, scanner, and admin blacklist management

## Key components

- **`App.tsx`** — routing via `window.location.pathname` (no router library)
- **`ProgramsView.tsx`** (~1000 lines) — main view; Oscar poster carousel with auto-scroll, channel cards with expandable program lists, date carousel navigation, Oscar modal with categories + watch providers
- **`ChannelManager.tsx`** — channel grid with toggle, search, fetch today/yesterday buttons
- **`OscarManager.tsx`** (~1180 lines) — Oscar movies list, catalog dialog (sortable table with full/TV-only toggle), client-side scanner that re-matches programs against catalog
- **`config.ts`** — API URL resolution (localhost:8000 in dev, relative in prod)

## Dependencies

**Depends on:**
- FastAPI backend (`/api/*` endpoints)
- TMDB image CDN (`image.tmdb.org`) for posters and provider logos

**Depended on by:**
- Nothing — it's the leaf consumer

## Key implementation notes

- No router library — routing is done via `window.location.pathname` checks in `App.tsx`
- CSS is per-component (`.css` files alongside `.tsx`)
- Oscar poster carousel auto-scrolls every 5 seconds, pauses on user interaction for 10 seconds
- Oscar filter cycles through: Номиниран → Oscar → Best Picture (with counts)
- The Scanner in OscarManager runs entirely client-side — fetches catalog + 7days data, builds title index, matches with `setTimeout(0)` for UI responsiveness
- Admin mode is enabled via `?admin=true` URL parameter — shows exclude/restore buttons
- All UI text is in Bulgarian except Oscar-related labels (English)
- Channel icons come from the TV listing site via `logoBaseUrl` from `/api/config`

## Related ADRs

- [ADR-0001](../architecture/adr/ADR-0001-existing-decisions.md) — React SPA served by FastAPI
