# storage

**Location**: `storage.py`
**Status**: Active

## Purpose

Abstracts all file I/O behind a `StorageProvider` interface so that the rest of the codebase works identically whether files live on the local filesystem or in Google Cloud Storage. The active implementation is chosen once at startup by `get_storage_provider()` based on the `ENVIRONMENT` env var.

## Public interface

- `get_storage_provider() -> StorageProvider` — factory; returns `LocalStorageProvider` or `CloudStorageProvider`
- `StorageProvider.read_json(file_path) -> Optional[Dict]` — parse JSON file; returns None on missing/error
- `StorageProvider.write_json(file_path, data) -> bool` — serialize dict to JSON file; returns False on error
- `StorageProvider.read_text(file_path) -> Optional[str]` — read raw text; returns None on missing/error
- `StorageProvider.write_text(file_path, content) -> bool` — write raw text; returns False on error
- `StorageProvider.file_exists(file_path) -> bool` — existence check
- `StorageProvider.delete_file(file_path) -> bool` — delete file; returns False on error
- `StorageProvider.list_files(directory) -> list[str]` — list filenames (not full paths) with `.json` extension in a directory

## Dependencies

**Depends on:**
- `google-cloud-storage` (optional, installed in Docker only) — for `CloudStorageProvider`
- `ENVIRONMENT`, `GCS_BUCKET_NAME` env vars

**Depended on by:**
- `app.py` — all program/channel/blacklist I/O
- `fetch_active_programs.py` — channel loading, result saving, blacklist updates
- `oscars_lookup.py` — Oscar/movie data loading in cloud mode

## Key implementation notes

- `LocalStorageProvider.write_json()` creates parent directories automatically (`mkdir(parents=True, exist_ok=True)`).
- `CloudStorageProvider.list_files()` requires the directory prefix to end with `/` — it adds one if missing. The returned list contains **filenames only** (basename after the last `/`), not full GCS paths.
- All methods catch all exceptions, log to stdout, and return `None`/`False`/`[]`. Callers must handle these gracefully.
- `OscarLookup` has a **fallback path** that reads files directly with `open()` when no storage provider is passed — this is only used when running `fetch_tv_program.py` as a standalone script.
- The `CloudStorageProvider` constructor raises immediately if `google-cloud-storage` is not installed or GCS credentials are unavailable. This is intentional — a misconfigured cloud instance should fail fast.

## Related ADRs

- [ADR-0001](../architecture/adr/ADR-0001-existing-decisions.md) — File-based storage decision, StorageProvider abstraction
