# Ownership

Single-developer project.

## Team / role assignments

| Area | Owner | Notes |
|---|---|---|
| Full stack | Niki Dimitrov | Solo developer — all areas |

## Shared / high-blast-radius areas

- `storage.py` — used by every module that reads/writes data
- `data/movies-min.json` + `data/oscars-min.json` — Oscar reference data, changes affect all matching
- `app.py` — all API endpoints in one file; changes can affect any feature
