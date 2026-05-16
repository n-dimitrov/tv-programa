# Conventions

Cross-cutting conventions for this project.

## Naming conventions

- **Python files**: `snake_case.py` at repo root — no packages
- **React components**: `PascalCase.tsx` in `frontend/src/components/`
- **CSS files**: Component-scoped, named to match component (`ProgramsView.css`)
- **Data files**: `kebab-case.json` in `data/` directory
- **Daily program files**: `YYYY-MM-DD.json` in `data/programs/`
- **Monthly summaries**: `YYYY-MM_oscar_monthly.json` in `data/summaries/`

## Code style

- Python: No formatter enforced. Standard PEP 8 conventions followed loosely.
- TypeScript: ESLint via Create React App defaults (`react-app`, `react-app/jest`).
- No pre-commit hooks configured.

## Commit and PR conventions

- Commit messages: Imperative mood, concise description
- No branch naming convention enforced — single developer project
- Deploys triggered manually via `./scripts/deploy-gcp.sh`

## Language

- UI text is in **Bulgarian** (button labels, headers, error messages)
- Code comments, variable names, and docs are in **English**
- Oscar data and TMDB metadata are in **English**

## API conventions

- All API routes prefixed with `/api/`
- GET for reads, POST for actions (fetch, generate, exclude), PUT for updates, DELETE for removals
- Responses are JSON with consistent structure: `{"status": "success", ...}` or `HTTPException`
