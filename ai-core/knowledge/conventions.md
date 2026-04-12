# Conventions

Cross-cutting conventions for this project. Applies to all builder roles.

## Naming conventions

- **Python files**: `snake_case.py` at project root
- **Python classes**: `PascalCase` (e.g., `TVProgramFetcher`, `OscarLookup`, `StorageProvider`)
- **Python functions**: `snake_case` with leading underscore for private (e.g., `_normalize_title`, `_load_blacklist`)
- **TypeScript components**: `PascalCase.tsx` in `frontend/src/components/`
- **CSS files**: match component name (e.g., `ProgramsView.css`)
- **API endpoints**: `/api/{resource}` with kebab-case paths (e.g., `/api/programs/7days`)
- **Data files**: descriptive names with hyphens (e.g., `movies-min.json`, `tv_channels.json`)

## Code style

- **Python**: No formatter/linter configured. Follows PEP 8 loosely. Double quotes for strings. Type hints used in function signatures but not enforced.
- **TypeScript**: ESLint via `react-app` preset. No Prettier. Functional components with hooks.
- **Indentation**: 4 spaces (Python), 2 spaces (TypeScript/JSON)

## Commit and PR conventions

- Commit messages are short, imperative style (e.g., "Fix channel sort error when oscar year is a string")
- No PR template or branch naming convention observed
- [VERIFY] No CI/CD pipeline — all deploys are manual via shell scripts
