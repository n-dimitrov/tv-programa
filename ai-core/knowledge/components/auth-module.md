# Auth Module

**Location**: `auth.py`
**Status**: Active (not yet wired into endpoints)

## Purpose

Provides Firebase token verification for optional user authentication. Designed as a FastAPI dependency that extracts and verifies Bearer tokens from the Authorization header.

## Public interface

- `get_optional_user(request: Request) -> dict | None` — FastAPI dependency; returns decoded Firebase token payload or None

## Dependencies

**Depends on:**
- `firebase-admin` SDK
- `FIREBASE_SERVICE_ACCOUNT_KEY` env var (JSON string) or Application Default Credentials

**Depended on by:**
- Nothing yet — not imported by `app.py`

## Key implementation notes

- Firebase is initialized at module import time (top-level `_initialize_firebase()` call)
- If initialization fails, `_firebase_initialized` stays `False` and all calls return `None` — never raises
- Designed as "optional auth" — callers that require authentication must check for `None` and raise 401 themselves
- Falls back to Application Default Credentials if `FIREBASE_SERVICE_ACCOUNT_KEY` is not set (works on Cloud Run with correct IAM)

## Related ADRs

- [ADR-0002](../architecture/adr/ADR-0002-firebase-auth-and-user-data.md) — Firebase auth decision (if exists)
