# Storage Layer

**Location**: `storage.py`
**Status**: Active

## Purpose

Abstracts file I/O so the application works identically on local filesystem (dev) and Google Cloud Storage (production). Every module that reads or writes data goes through this layer.

## Public interface

- `get_storage_provider() -> StorageProvider` — factory that reads `ENVIRONMENT` env var
- `StorageProvider.read_json(path) -> Optional[Dict]` — read and parse JSON
- `StorageProvider.write_json(path, data) -> bool` — serialize and write JSON
- `StorageProvider.file_exists(path) -> bool` — check existence
- `StorageProvider.delete_file(path) -> bool` — delete file
- `StorageProvider.list_files(directory) -> list` — list JSON files in directory
- `StorageProvider.read_text(path) -> Optional[str]` — read text file
- `StorageProvider.write_text(path, content) -> bool` — write text file

## Dependencies

**Depends on:**
- `google-cloud-storage` (GCS client, imported only in cloud mode)

**Depended on by:**
- `app.py` — all data operations
- `fetch_active_programs.py` — channel loading, validation results, blacklist
- `oscars_lookup.py` — loading Oscar reference data and blacklist

## Key implementation notes

- `LocalStorageProvider` auto-creates parent directories on write (`mkdir(parents=True)`)
- `CloudStorageProvider` requires `GCS_BUCKET_NAME` env var; raises `ValueError` if missing
- `list_files()` only returns `.json` files — other file types are invisible
- All errors are caught and logged with `print()` — methods return `None`/`False` on failure, never raise
- JSON is written with `ensure_ascii=False` and `indent=2` for human readability and Bulgarian text support

## Related ADRs

- [ADR-0001](../architecture/adr/ADR-0001-existing-decisions.md) — JSON file storage decision
