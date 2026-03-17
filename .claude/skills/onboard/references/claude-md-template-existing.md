# CLAUDE.md Template — Existing Codebase

Use this template when generating CLAUDE.md for a project that already has source code. Fill every section with specifics from discovery. Do not leave placeholder text — if you genuinely could not determine something, mark it `[VERIFY]`.

---

```markdown
# [Project Name]

[2-3 sentences: what it does, who uses it, what problem it solves. Be specific — not "a web application" but "a multi-tenant SaaS dashboard that aggregates metrics from X, Y, Z and serves them to operations teams."]

## Quick context

- **Type**: [web app / API service / CLI / library / monorepo]
- **Stack**: [language version, framework + version, key libraries]
- **Database**: [e.g., PostgreSQL 15, Redis for cache/queues]
- **Deployment**: [e.g., Kubernetes on GKE, AWS ECS, Heroku]
- **Repo structure**: [e.g., single service, monorepo with packages/, services/]
- **Phase**: [Active development / Maintenance / Migration to X]

## How to work in this codebase

- Read `docs/patterns/coding-patterns.md` BEFORE implementing anything — patterns are established and enforced
- Read relevant ADRs before making architectural changes: `docs/architecture/adr/README.md`
- Run `/architect` for any decision with multi-week implications
- Run `/implement` to get pattern-aware implementation assistance

## Key facts

[5-10 non-obvious, critical facts extracted from the codebase. These should be things that would bite a new contributor who didn't know them. Examples:]

1. [Auth tokens are validated in `middleware/auth.go` — services downstream receive a pre-validated user struct, never raw tokens]
2. [All database writes go through the Repository layer in `internal/repository/` — never write SQL outside that package]
3. [Background jobs use the `jobs/` package with the Bull queue — never do async work inline in HTTP handlers]
4. [The `shared/` package is imported by all services — changes there have wide blast radius]
5. [Feature flags are managed via `config/features.go` — check there before adding env-based conditionals]
6. [VERIFY: X — could not confirm from code]

## Documentation map

| Want to understand... | Read... |
|---|---|
| System topology and data flows | `docs/architecture/overview.md` |
| Why [key technology] was chosen | `docs/architecture/adr/ADR-000X-[name].md` |
| Component X in detail | `docs/components/[name].md` |
| All components at a glance | `docs/components/README.md` |
| How errors are handled | `docs/patterns/coding-patterns.md#error-handling` |
| How to write a new [route/model/job] | `docs/patterns/coding-patterns.md` |

## Commands

```bash
[start dev server command]    # [brief description]
[run tests command]           # [brief description]
[run linter command]          # [brief description]
[build command]               # [brief description]
[migration command]           # [brief description if applicable]
```

## Directory map

```
[project-name]/
├── [dir 1]     # [what lives here]
├── [dir 2]     # [what lives here]
├── [dir 3]     # [what lives here]
└── docs/       # Architecture (ADRs + overview), component docs, coding patterns
```
```

---

## Notes for the generator

- **Key facts are the most important section** — they should reflect non-obvious truths extracted from reading the code, not things any developer would assume
- If something is ambiguous or you genuinely couldn't determine it, mark it `[VERIFY]` rather than guessing
- The Documentation map should only reference files that actually exist or will be generated in this run
- Commands: extract from package.json scripts, Makefile targets, README, or CI config. If you can't find them, mark `[VERIFY]`
- Keep the CLAUDE.md under ~100 lines — depth lives in the docs/ files it references
