# INDEX.md Template — Existing Codebase

Use this template when generating `aisdlc/INDEX.md` for a project that already has source code. Fill every section with specifics from discovery. Do not leave placeholder text — if you genuinely could not determine something, mark it `[VERIFY]`. The user's root `CLAUDE.md` should reference this file in its load order.

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

### Load order (follow this sequence)

**1. Stable knowledge — always load before starting any task**
- `aisdlc/knowledge/architecture/overview.md` — system topology and key boundaries
- `aisdlc/knowledge/patterns/coding-patterns.md` — shared patterns all builders must follow

**2. Active memory — load after knowledge, before starting any task**
- `aisdlc/memory/patterns.md` — emergent patterns from recent sessions
- `aisdlc/memory/anti-patterns.md` — what has been tried and caused problems

**3. On demand — load only when relevant**
- `aisdlc/knowledge/architecture/adr/README.md` — before any architectural change
- `aisdlc/memory/learnings.md` — when debugging a recurring issue or uncertain about an approach
- `aisdlc/knowledge/domain.md` — when modeling new entities or business logic

**4. Never load proactively**
- `aisdlc/meta/run-log.jsonl` — raw data; only if asked to analyze run history

### Other rules
- Run `/aisdlc-architect` for any decision with multi-week implications
- Never write to `aisdlc/meta/run-log.jsonl` directly — always call `bash aisdlc/hooks/log-run.sh` with the three required arguments

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
| System topology and data flows | `aisdlc/knowledge/architecture/overview.md` |
| Why [key technology] was chosen | `aisdlc/knowledge/architecture/adr/ADR-000X-[name].md` |
| Component X in detail | `aisdlc/knowledge/components/[name].md` |
| All components at a glance | `aisdlc/knowledge/components/README.md` |
| How errors are handled | `aisdlc/knowledge/patterns/coding-patterns.md#error-handling` |
| Recent session learnings | `aisdlc/memory/learnings.md` |
| Approaches to avoid | `aisdlc/memory/anti-patterns.md` |

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
└── aisdlc/    # All project knowledge and self-evolving memory
    ├── knowledge/  # Stable: architecture, patterns, components, domain
    ├── memory/     # Evolving: learnings, patterns, anti-patterns
    ├── meta/       # Audit: run logs, usage stats, evolution history
    └── hooks/      # Automation: log-run, extract-learning, summarize-failure
```
```

---

## Notes for the generator

- **Key facts are the most important section** — they should reflect non-obvious truths extracted from reading the code, not things any developer would assume
- If something is ambiguous or you genuinely couldn't determine it, mark it `[VERIFY]` rather than guessing
- The Documentation map should only reference files that actually exist or will be generated in this run
- Commands: extract from package.json scripts, Makefile targets, README, or CI config. If you can't find them, mark `[VERIFY]`
- Keep INDEX.md under ~100 lines — depth lives in the aisdlc/ files it references
