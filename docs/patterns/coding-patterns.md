# Coding Patterns

Patterns extracted from the existing codebase. Follow these when adding or modifying code.

---

## File organization

The project is flat at the root — no packages/modules directory. Each Python file is a self-contained module:

```
app.py                    # FastAPI app + all endpoints
storage.py                # StorageProvider ABC + implementations
oscars_lookup.py          # OscarLookup class + _normalize_title helper
fetch_tv_program.py       # TVProgramFetcher class
fetch_active_programs.py  # ActiveChannelFetcher class
```

The frontend follows Create React App conventions:

```
frontend/src/
  App.tsx                 # Root component, view routing by pathname
  components/             # One file per view: ProgramsView, ChannelManager, OscarManager
  config.ts               # API base URL config
```

---

## Error handling

All storage operations catch all exceptions, log to stdout, and return a safe default (`None`, `False`, `[]`). Callers handle the fallback:

```python
# storage.py — LocalStorageProvider.read_json()
def read_json(self, file_path: str) -> Optional[Dict]:
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        print(f"Error reading {file_path}: {e}")
        return None
```

API endpoint errors use `raise HTTPException`:

```python
# app.py — get_programs()
data = load_programs_for_date(date)
if not data:
    raise HTTPException(status_code=404, detail="No programs found for this date")
```

Broad try/except in top-level endpoint handlers:

```python
# app.py — fetch_programs()
try:
    ...
except Exception as e:
    raise HTTPException(status_code=500, detail=str(e))
```

---

## Data access

All data access goes through the `StorageProvider` interface. The storage instance is a module-level singleton in `app.py`:

```python
# app.py
storage = get_storage_provider()

def load_channels() -> List[Dict]:
    data = storage.read_json(CHANNELS_FILE)
    if data:
        return data.get('channels', [])
    return []
```

Never call `open()` directly in app code (except for the `OscarLookup` fallback path used only in standalone script mode).

---

## Logging

No structured logging library — everything uses `print()` to stdout. Cloud Run captures stdout as logs.

```python
# fetch_active_programs.py
print(f"[{idx}/{len(self.channels)}] Fetching {channel_name}...", end=" ")
print(f"✓ ({len(programs)} programs)")
print(f"Error saving to {output_file}: {e}")
```

Log format: plain English, no timestamps, no log levels. Errors prefix with `ERROR:` or `WARNING:`.

---

## Configuration

Environment variables are the only configuration mechanism. `.env.local` is loaded at startup with `override=False`:

```python
# app.py and fetch_active_programs.py
load_dotenv(".env.local", override=False)
```

Reading config:

```python
# app.py
CACHE_TTL_SECONDS = int(os.getenv("PROGRAMS_7DAYS_CACHE_TTL", "1800"))
```

Key env vars:
- `ENVIRONMENT` — `local` (default) or `cloud`
- `GCS_BUCKET_NAME` — required when `ENVIRONMENT=cloud`
- `TMDB_API_KEY` — optional; omit to disable streaming provider lookup
- `TMDB_WATCH_REGION` — default `BG`
- `AI_API_URL` — required for Oscar AI validation
- `AI_MODEL` — required for Oscar AI validation
- `PROGRAMS_7DAYS_CACHE_TTL` — default `1800`
- `PORT` — default `8000` (local) / `8080` (Cloud Run)

---

## Pydantic models

All request/response bodies use Pydantic `BaseModel`. Optional fields default to `None`:

```python
# app.py
class Program(BaseModel):
    time: str
    title: str
    description: Optional[str] = None
    full: Optional[str] = None
    oscar: Optional[Dict[str, object]] = None

class FetchRequest(BaseModel):
    date_path: str = "Днес"
    ai_validate: bool = True
```

---

## Oscar annotation pattern

Programs are annotated by mutating the dict in place. The annotator returns match info for logging or `None` if no match:

```python
# fetch_active_programs.py
for program in programs:
    match_info = self.oscar_lookup.annotate_program(
        program,
        channel_id=channel_id,
        date=target_date,
        time=program.get('time', '')
    )
    if match_info:
        oscar_matches.append({...})
```

After annotation, `program["oscar"]` contains the payload. If blacklisted or unmatched, `program` has no `"oscar"` key.

---

## In-memory caching with threading lock

Shared mutable state uses a `threading.Lock` to handle concurrent requests:

```python
# app.py
_programs_7days_cache = {"data": None, "expires_at": 0.0}
_programs_7days_lock = Lock()

def get_cached_7days() -> Optional[Dict]:
    now = time.time()
    with _programs_7days_lock:
        if _programs_7days_cache["data"] and _programs_7days_cache["expires_at"] > now:
            return _programs_7days_cache["data"]
    return None
```

---

## Auth

Optional Firebase Authentication via `auth.py`. See ADR-0002.

`get_optional_user` is a FastAPI dependency that returns the decoded Firebase token payload (`{uid, email, name, ...}`) if a valid `Authorization: Bearer <token>` header is present, or `None` for anonymous requests. It never raises — callers that require auth must check for `None` themselves:

```python
# app.py — user-specific endpoint
from auth import get_optional_user

@app.get("/api/user/me")
async def get_me(user=Depends(get_optional_user)):
    if user is None:
        raise HTTPException(status_code=401, detail="Authentication required")
    return {"uid": user["uid"], "email": user.get("email")}
```

All existing public endpoints are unaffected — they do not use this dependency.

Firebase Admin SDK is initialized once at module load in `auth.py`. If initialization fails (missing credentials), `get_optional_user` always returns `None` — the app stays functional for anonymous users.

**Local dev**: set `FIREBASE_SERVICE_ACCOUNT_KEY` (JSON string) in `.env.local`.
**Cloud Run**: uses Application Default Credentials automatically (no key needed if the service account has Firebase Auth permissions).

---

## Data structures

### Daily program file (`data/programs/YYYY-MM-DD.json`)

```json
{
  "metadata": {
    "timestamp": "2026-03-16T09:07:18",
    "date": "Вчера",
    "target_date": "2026-03-16",
    "total_channels": 11,
    "channels_with_programs": 11
  },
  "programs": {
    "bnt": {
      "channel": {"id": "bnt", "name": "BNT", "icon": "/tvlogos/bnt.png"},
      "programs": [
        {
          "time": "00:30",
          "title": "Program Title",
          "description": "Description...",
          "full": "Program Title Description...",
          "oscar": {
            "winner": 3,
            "nominee": 5,
            "winner_categories": ["Best Picture", ...],
            "nominee_categories": [...],
            "title_en": "English Title",
            "year": 1994,
            "poster_path": "/abc.jpg",
            "tmdb_id": 12345,
            "watch": {"region": "BG", "flatrate": [...]}
          }
        }
      ],
      "count": 37
    }
  }
}
```

### 7-day aggregate file (`data/programs/7days.json`)

```json
{
  "generated_at": "2026-03-17T10:00:00",
  "data": {
    "2026-03-11": { /* same as daily file */ },
    "2026-03-12": { ... }
  }
}
```

### Channel config (`data/tv_channels.json`)

```json
{
  "channels": [
    {"id": "bnt", "name": "BNT", "icon": "/tvlogos/bnt.png", "active": true}
  ]
}
```

### Oscar blacklist (`data/oscar_blacklist.json`)

```json
{
  "excluded": [
    {
      "title": "Заглавие",
      "scope": "broadcast",
      "channel_id": "bnt",
      "date": "2026-03-16",
      "time": "14:30",
      "auto_excluded_by_ai": true,
      "reason": "TV show, not the Oscar-winning film",
      "red_flags": ["episode number in description"]
    }
  ]
}
```
