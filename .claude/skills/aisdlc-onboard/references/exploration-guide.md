# Exploration Guide

Heuristics for reading existing codebases efficiently. Use during Phase 2 (Domain Deep-Dives) of the aisdlc-context-onboard discovery process.

---

## General Heuristics

**Read these first in any project:**
- The largest non-generated file (often the most central module)
- Any file named `base.`, `core.`, `common.`, `shared.`, `utils.` — these reveal cross-cutting patterns
- The database schema (migrations, models, schema.rb, schema.prisma, etc.)
- The main router or route registration file
- One complete request handler (entry to response) for the most common resource type

**Skip these:**
- Generated files (`*.generated.*`, `vendor/`, `node_modules/`, `.build/`, `dist/`)
- Pure test files — read them only to understand expected behavior, not for patterns
- Lock files

**Signs you've read enough:**
- You can trace a request from entry point to database and back
- You know how errors are propagated
- You know where auth happens
- You understand what the major data models are

---

## By Project Type

### Node.js / TypeScript (Express, Fastify, NestJS)

Key files to read:
- `src/index.ts` or `src/app.ts` — server setup, middleware registration
- Route files in `src/routes/` or `src/controllers/`
- `src/middleware/` — auth, error handling, validation
- `src/models/` or `src/entities/` — data models
- `src/services/` — business logic layer if present
- `prisma/schema.prisma` or `src/db/migrations/` — database schema

Patterns to extract:
- How is middleware applied? (global vs. per-route)
- Is there a service/repository separation?
- How are async errors caught? (try/catch, express-async-errors, etc.)

### Python (Django, FastAPI, Flask)

Key files to read:
- `settings.py` or `config.py` — installed apps, middleware, database config
- `urls.py` (Django) or `main.py` / `app.py` (FastAPI/Flask) — routing
- `models.py` — data models
- `views.py` or `routers/` — request handlers
- `middleware.py` or `dependencies.py` — cross-cutting concerns
- `migrations/` — schema evolution (read the latest migration)

Patterns to extract:
- ORM usage patterns (Django ORM vs. SQLAlchemy)
- How are permissions/auth checked? (decorators, middleware, dependency injection?)
- How are errors raised and caught?

### Go

Key files to read:
- `main.go` or `cmd/*/main.go` — entry point, server setup
- `internal/handler/` or `internal/api/` — HTTP handlers
- `internal/service/` — business logic
- `internal/repository/` — data access
- `internal/middleware/` — cross-cutting concerns
- `internal/model/` or `internal/domain/` — types

Patterns to extract:
- Error wrapping conventions (`fmt.Errorf("context: %w", err)`)
- How context is threaded through layers
- Struct embedding patterns
- Interface definitions at package boundaries

### Ruby on Rails

Key files to read:
- `config/routes.rb` — routing
- `app/models/` (pick 2-3 central models) — associations, validations, scopes
- `app/controllers/application_controller.rb` — before_actions, auth
- `app/controllers/` (pick 1-2 resource controllers)
- `app/services/` or `app/interactors/` if present — business logic
- `db/schema.rb` — full database schema

Patterns to extract:
- Service object pattern vs. fat model vs. fat controller
- How auth is enforced (Pundit, CanCanCan, custom before_action)
- Background job library (Sidekiq, Delayed::Job, GoodJob)

### Monorepos (Nx, Turborepo, Go workspaces, etc.)

Read the root first:
- `nx.json`, `turbo.json`, `pnpm-workspace.yaml`, or `go.work` — workspace config
- Root `package.json` scripts — understand the meta-commands
- `packages/` or `apps/` directory listing — identify the modules

Then treat each package as its own mini-project and apply the relevant per-type heuristics above.

Key questions for monorepos:
- Which packages are shared libraries vs. applications?
- Is there a shared types/models package that everything imports?
- How do inter-package dependencies flow?

---

## Component Doc Format

For each major component identified, generate `ai-core/knowledge/components/[name].md` with this structure:

```markdown
# [Component Name]

**Location**: `[directory or file path]`
**Owner**: [team or individual, if determinable; else omit]
**Status**: [Active / Deprecated / Being replaced by X]

## Purpose

[One paragraph: what this component does and why it exists. Not what it is, but what problem it solves.]

## Public interface

[The surface area other parts of the system interact with. Not a full API reference — just the key entry points, exported functions, or HTTP endpoints. 5-15 items max.]

- `functionName(params)` — brief description
- `POST /resource` — brief description

## Dependencies

**Depends on:**
- [Component or external service] — why

**Depended on by:**
- [Component] — in what way

## Key implementation notes

[3-7 non-obvious facts, gotchas, or important constraints. Things that would trip up someone new to this code.]

- [e.g., "All writes are deferred to an async queue — callers should not assume changes are immediately visible"]
- [e.g., "The cache TTL is hardcoded to 5 minutes — there's a TODO to make this configurable"]

## Related ADRs

- [ADR-000X](../architecture/adr/ADR-000X-name.md) — [one-line summary of relevance]
```

---

## Filling the ADR-0001-existing-decisions.md

This ADR documents decisions already baked into the codebase. Find them by looking for:

- The framework itself (why Rails vs. Django vs. Express?)
- The database choice (Postgres vs. MySQL vs. Mongo?)
- The auth approach (JWT vs. sessions vs. OAuth?)
- The deployment platform (Kubernetes vs. serverless vs. VMs?)
- Monorepo vs. polyrepo choice
- API style (REST vs. GraphQL vs. gRPC?)

For each decision, document it as **already made** (Status: Accepted). The Context should describe the situation at the time. The Decision should be a statement of what was chosen. Consequences should be honest about trade-offs observed in the codebase.

Mark any decision where you genuinely can't infer the rationale with `[VERIFY] — Could not determine original rationale from code.`
