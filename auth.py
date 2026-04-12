import json
import os

import firebase_admin
from firebase_admin import auth as firebase_auth, credentials
from fastapi import Request

_firebase_initialized = False


def _initialize_firebase():
    global _firebase_initialized
    if _firebase_initialized:
        return
    try:
        service_account_key = os.getenv("FIREBASE_SERVICE_ACCOUNT_KEY")
        if service_account_key:
            cred = credentials.Certificate(json.loads(service_account_key))
            firebase_admin.initialize_app(cred)
        else:
            # Fall back to Application Default Credentials (works on Cloud Run)
            cred = credentials.ApplicationDefault()
            firebase_admin.initialize_app(cred)
        _firebase_initialized = True
        print("Firebase Admin SDK initialized")
    except Exception as e:
        print(f"WARNING: Firebase Admin SDK initialization failed: {e}")
        print("WARNING: Auth endpoints will return None for all requests")


_initialize_firebase()


async def get_optional_user(request: Request) -> dict | None:
    """
    FastAPI dependency. Returns the decoded Firebase token payload if a valid
    Bearer token is present, or None for anonymous / unauthenticated requests.

    Never raises — callers that require authentication must check for None
    and raise HTTPException(401) themselves.
    """
    if not _firebase_initialized:
        return None

    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        return None

    token = auth_header[len("Bearer "):]
    try:
        return firebase_auth.verify_id_token(token)
    except Exception as e:
        print(f"WARNING: Firebase token verification failed: {e}")
        return None
