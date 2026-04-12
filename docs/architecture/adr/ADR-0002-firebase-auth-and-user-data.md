# ADR-0002: Firebase Authentication and Firestore for Optional User Identity

**Date**: 2026-03-17
**Status**: Accepted
**Deciders**: solo

---

## Context

The app currently has no concept of user identity. All endpoints are public and anonymous; all data (programs, Oscar annotations, channel config) is shared and stored in GCS or local JSON files. This is sufficient for a read-only schedule viewer, but the product needs to support personalization features — such as favorites, watchlists, or display preferences — that are meaningful only per user.

The login requirement is explicitly optional: anonymous users must retain the full current experience with zero degradation. The personalization layer must be purely additive.

The existing stack has no database, no session store, and no auth middleware. Cloud Run is stateless and ephemeral, which rules out server-side sessions without adding infrastructure (e.g., Redis). Any auth solution must be stateless on the backend. The project is solo-maintained, so operational overhead is a key constraint — minimizing the number of external systems to manage matters.

No admin elevation is needed for logged-in users. Auth is purely for personalization; all existing API endpoints remain publicly accessible.

---

## Decision

**Use Firebase Authentication for Google OAuth sign-in and Firestore as the user data store for all per-user personalization features.**

Firebase Authentication handles the Google OAuth flow entirely on the frontend via the Firebase JS SDK (`signInWithPopup`). After sign-in, the SDK provides a short-lived Firebase ID token (JWT). The React frontend attaches this token as a `Bearer` header on requests to user-specific FastAPI endpoints. FastAPI verifies the token using the `firebase-admin` Python SDK — stateless, no session table required.

Per-user data (preferences, favorites, watchlists — specific shape TBD) is stored in Firestore under each user's UID. This keeps user data fully within the Firebase ecosystem alongside auth, rather than scattering it into GCS alongside program JSON files. GCS remains the store for program schedules, Oscar data, and blacklists; Firestore is exclusively for user-scoped data.

Firebase was chosen over the lighter-weight Google One Tap + `google-auth` approach (Option C) because Firestore comes with it at no extra infrastructure cost, token refresh is handled automatically by the Firebase JS SDK (no re-prompt on session expiry), and the Firebase console provides a ready-made user management UI. For a personal project, the Firebase project setup cost is a one-time action that pays back in reduced ongoing maintenance.

---

## Consequences

### Positive
- Anonymous users are completely unaffected — all existing endpoints remain public and unchanged
- Stateless JWT verification on the backend fits Cloud Run's ephemeral nature; no Redis or sticky sessions needed
- Firestore provides a real, queryable, per-user data store without operating a database
- Firebase handles token refresh, session persistence, and Google account linking automatically
- Firebase console gives a user list and auth event log for free
- GCS remains clean — program/Oscar data and user data are in separate systems with clear ownership

### Negative / Trade-offs
- Adds two new external dependencies: `firebase-admin` (Python) and `firebase` JS SDK (~35KB gzipped)
- Requires a Firebase project to be created and maintained alongside the existing GCP project
- Firestore pricing is usage-based; for a personal app this will be negligible but is a new billing surface
- All user-specific FastAPI endpoints must extract and verify the ID token — adds boilerplate per endpoint
- Firebase project credentials (`FIREBASE_SERVICE_ACCOUNT_KEY` or equivalent) must be added to Cloud Run env vars / secrets

### Risks and mitigations
- **Risk**: Firebase project misconfiguration (wrong authorized domains, revoked credentials) silently breaks login for all users.
  **Mitigation**: Anonymous access is the default path; login failure degrades gracefully to anonymous mode. Authorized domains must include the Cloud Run URL and localhost.
- **Risk**: Firebase JS SDK bundle size increases frontend load time.
  **Mitigation**: Firebase modular SDK (v9+) supports tree-shaking; only `auth` and `firestore` modules need to be imported.
- **Risk**: Firestore data model designed now may not fit future personalization features well.
  **Mitigation**: User document structure is intentionally deferred until features are defined. The ADR establishes the system choice; schema is an implementation detail decided feature-by-feature.

---

## Options considered

### Option A: Firebase Authentication + Firestore _(chosen)_
Frontend-side OAuth via Firebase SDK; stateless JWT verification in FastAPI via `firebase-admin`; user data in Firestore. Chosen because it bundles auth, token refresh, and a real user data store into one ecosystem with minimal operational overhead.

### Option B: FastAPI backend OAuth + server-side sessions
FastAPI handles the full Authorization Code flow; sessions stored server-side. Rejected because Cloud Run is stateless — this would require Redis or sticky sessions, adding infrastructure that contradicts the zero-database, JSON-on-GCS architecture.

### Option C: Google One Tap + `google-auth` JWT verification (no Firebase)
Lighter alternative with no Firebase project. Rejected because it provides no user data store — preferences would have to go into GCS user-keyed JSON files, mixing user data with program data. Also lacks automatic token refresh, which would require re-prompting users on session expiry.

---

## Revisit triggers

This decision should be revisited if:
- User data requirements grow to need relational queries or complex transactions that Firestore handles poorly (e.g., multi-user shared lists, social features)
- Firebase pricing becomes meaningful at actual usage levels (currently expected to stay in the free tier)
- The project migrates away from Google Cloud infrastructure entirely, making Firebase an outlier dependency
