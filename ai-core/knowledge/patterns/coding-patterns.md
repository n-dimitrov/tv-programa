# Coding Patterns

## File organization

All Python backend modules live at project root — no `src/` directory. Each module is a single file with a focused responsibility:

```
app.py                    # FastAPI server + all endpoints
storage.py                # Storage abstraction
oscars_lookup.py          # Oscar matching logic
fetch_tv_program.py       # HTML scraper
fetch_active_programs.py  # Orchestrator
auth.py                   # Auth helper
```

Frontend follows Create React App conventions:
```
frontend/src/
├── App.tsx               # Root component + routing
├── config.ts             # API URL resolution
└── components/
    ├── ProgramsView.tsx  # + ProgramsView.css
    ├── ChannelManager.tsx # + ChannelManager.css
    └── OscarManager.tsx  # + OscarManager.css
```

## Error handling

**Backend**: All storage operations catch exceptions, print to stdout, and return `None` (reads) or `False` (writes). API endpoints catch broad exceptions and raise `HTTPException(500)`:

```python
# From app.py:196
try:
    fetcher = ActiveChannelFetcher(...)
    data = fetcher.fetch_all_programs(...)
    ...
except Exception as e:
    raise HTTPException(status_code=500, detail=str(e))
```

**Frontend**: Fetch errors are caught and stored in component state (`setError`), displayed as inline messages. No global error boundary.

```typescript
// From ProgramsView.tsx:131
try {
  const response = await fetch(`${API_URL}/api/programs/7days`);
  if (!response.ok) throw new Error('Не са намерени предавания');
  ...
} catch (err) {
  setError(err instanceof Error ? err.message : 'Неуспешно зареждане');
}
```

## Data access

All data access goes through `StorageProvider` — never use `open()` or direct filesystem calls:

```python
# From app.py:95
data = storage.read_json(CHANNELS_FILE)

# From app.py:102
storage.write_json(CHANNELS_FILE, {'channels': channels})
```

Data path convention: all paths are relative (e.g., `data/programs/2024-01-01.json`, `data/tv_channels.json`).

## Logging

Simple `print()` statements to stdout — no logging framework:

```python
# From fetch_active_programs.py:98
print(f"[{idx}/{len(self.channels)}] Fetching {channel_name}...", end=" ")
```

AI validation uses visual separators:
```python
print("\n" + "="*60)
print("AI VALIDATION")
print("="*60)
```

## Configuration

Environment variables loaded via `python-dotenv` from `.env.local` with `override=False` (production env vars take precedence):

```python
# From app.py:24
load_dotenv(".env.local", override=False)
```

Key env vars:
- `ENVIRONMENT` — `local` or `cloud` (storage selection)
- `GCS_BUCKET_NAME` — GCS bucket for cloud storage
- `TMDB_API_KEY` — TMDB watch provider API
- `TMDB_WATCH_REGION` — defaults to `BG`
- `AI_API_URL`, `AI_MODEL` — external AI validation API
- `PROGRAMS_7DAYS_CACHE_TTL` — cache TTL in seconds (default 1800)
- `FIREBASE_SERVICE_ACCOUNT_KEY` — Firebase auth (JSON string)
- `PORT` — server port (default 8000 local, 8080 Cloud Run)

## Auth

Auth module exists (`auth.py`) but is not yet wired into any endpoint. Pattern is "optional auth" — dependency returns `None` for unauthenticated requests, never raises:

```python
# From auth.py:34
async def get_optional_user(request: Request) -> dict | None:
    ...
    return firebase_auth.verify_id_token(token)
```

Frontend admin mode is URL-parameter based (`?admin=true`), not token-based.

## Frontend patterns

**Routing**: Path-based via `window.location.pathname` checks, no router library:
```typescript
const isChannelsView = window.location.pathname.startsWith('/channels');
const isOscarsView = window.location.pathname.startsWith('/oscars');
```

**API calls**: Direct `fetch()` with `API_URL` prefix from `config.ts`. No HTTP client library.

**State management**: Local `useState` + `useMemo`/`useCallback` — no Redux or context providers.

**Styling**: Per-component CSS files, no CSS-in-JS or utility framework.
