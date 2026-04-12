# Ownership

Who owns what — teams, services, and areas of the codebase.

## Team / role assignments

| Area | Owner | Notes |
|---|---|---|
| All code | Niki Dimitrov | Solo developer — personal project |

## Shared / high-blast-radius areas

- `storage.py` — used by every backend module; changes affect all data access
- `data/movies-min.json` / `data/oscars-min.json` — reference data; changes affect all Oscar matching
- `config.ts` — API URL resolution; changes affect all frontend API calls
