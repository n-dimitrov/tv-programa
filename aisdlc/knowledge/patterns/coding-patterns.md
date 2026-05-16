# Coding Patterns

Real patterns extracted from the 7DaysTV codebase.

## File organization

Backend is flat — all Python modules at repo root. No packages or subdirectories.

```
app.py                   # FastAPI server, all endpoints, caching
storage.py               # Storage abstraction (ABC + implementations)
oscars_lookup.py         # Oscar matching logic
fetch_tv_program.py      # HTML scraper
fetch_active_programs.py # Orchestrator
auth.py                  # Firebase auth (unused)
```

Frontend follows Create React App conventions:
```
frontend/src/
├── App.tsx              # Root component with path-based routing
├── config.ts            # API URL configuration
└── components/          # One file per view (ProgramsView, OscarManager, ChannelManager)
```

## Error handling

**Backend:** Endpoints catch broad `Exception` and raise `HTTPException(500)`. No custom exception classes.

```python
# From app.py:349
except Exception as e:
    raise HTTPException(status_code=500, detail=str(e))
```

**Scraper/storage:** Errors are caught and logged with `print()`, returning `None` or empty list instead of raising.

```python
# From storage.py:57
except Exception as e:
    print(f"Error reading {file_path}: {e}")
    return None
```

**Frontend:** Fetch errors are caught and stored in component state for display.

```typescript
// From ProgramsView.tsx:139
catch (err) {
    setError(err instanceof Error ? err.message : 'Неуспешно зареждане на програмата');
}
```

## Data access

All data access goes through the `StorageProvider` ABC. Never use `open()` or `Path().read_text()` directly.

```python
# Factory pattern — From storage.py:216
storage = get_storage_provider()  # Returns Local or Cloud based on ENVIRONMENT env var

# Usage — From app.py:96
data = storage.read_json(CHANNELS_FILE)
storage.write_json(file_path, programs_data)
storage.file_exists(file_path)
storage.list_files("data/programs")
```

## Logging

Uses `print()` throughout — no logging library. Status messages include checkmarks/crosses.

```python
# From fetch_active_programs.py:130
print(f"✓ ({len(programs)} programs)")
print("✗ (no programs)")
```

## Configuration

Environment variables loaded via `python-dotenv`. Local dev uses `.env.local`, production uses Cloud Run env vars.

```python
# From app.py:27 — override=False means Cloud Run env vars take precedence
load_dotenv(".env.local", override=False)

# Key env vars:
# ENVIRONMENT=local|cloud        — storage backend selection
# GCS_BUCKET_NAME               — GCS bucket for cloud storage
# TMDB_API_KEY                  — TMDB API for watch providers
# AI_API_URL, AI_MODEL          — AI validation endpoint
# PROGRAMS_7DAYS_CACHE_TTL      — cache TTL in seconds (default 1800)
```

## Auth

Firebase Admin SDK is initialized but not wired into any endpoint. `get_optional_user` is a no-op dependency.

```python
# From auth.py:34
async def get_optional_user(request: Request) -> dict | None:
    # Returns decoded token if valid Bearer token present, else None
    # Never raises — callers must check for None
```

## Frontend API pattern

All API calls use the `API_URL` constant from `config.ts`. Relative URLs in production, `localhost:8000` in dev.

```typescript
// From config.ts
export const API_URL = getApiUrl();
// Usage:
const response = await fetch(`${API_URL}/api/programs/7days`);
```

## Pydantic models for request/response

Endpoint inputs are validated with Pydantic `BaseModel` classes defined at module level in `app.py`.

```python
# From app.py:53
class FetchRequest(BaseModel):
    date_path: str = "Днес"
    ai_validate: bool = True
```

## Title normalization

Titles are normalized for matching by lowercasing and collapsing non-alphanumeric chars to spaces.

```python
# From oscars_lookup.py:23
def _normalize_title(text: str) -> str:
    cleaned = "".join(ch.lower() if ch.isalnum() else " " for ch in text)
    return " ".join(cleaned.split())
```
