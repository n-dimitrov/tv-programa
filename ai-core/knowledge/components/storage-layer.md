# Storage Layer

**Location**: `storage.py`
**Status**: Active

## Purpose

Provides a unified file I/O interface that works identically in local development (filesystem) and production (Google Cloud Storage). All modules use this instead of direct file operations, ensuring environment-transparent data access.

## Public interface

- `StorageProvider.read_json(file_path) -> Optional[Dict]`
- `StorageProvider.write_json(file_path, data) -> bool`
- `StorageProvider.file_exists(file_path) -> bool`
- `StorageProvider.delete_file(file_path) -> bool`
- `StorageProvider.list_files(directory) -> list`
- `StorageProvider.read_text(file_path) -> Optional[str]`
- `StorageProvider.write_text(file_path, content) -> bool`
- `get_storage_provider() -> StorageProvider` — factory, selects based on `ENVIRONMENT` env var

## Dependencies

**Depends on:**
- `google-cloud-storage` (only in cloud mode)

**Depended on by:**
- `app.py` — all data persistence
- `fetch_active_programs.py` — channel loading, AI prompt/response storage
- `oscars_lookup.py` — movie/oscar data loading, blacklist

## Key implementation notes

- `LocalStorageProvider` auto-creates parent directories on write (`mkdir(parents=True)`)
- `CloudStorageProvider` requires `GCS_BUCKET_NAME` env var; raises `ValueError` if missing
- GCS `list_files` uses prefix-based listing with `/` delimiter — returns filenames only (not full paths)
- All JSON is written with `ensure_ascii=False` and `indent=2` for Bulgarian character support
- Error handling: all methods catch exceptions, print to stdout, and return `None`/`False` — never raises

## Related ADRs

- [ADR-0001](../architecture/adr/ADR-0001-existing-decisions.md) — Storage abstraction decision
