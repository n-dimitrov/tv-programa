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

### Load order (follow this sequence)

**1. Stable knowledge — always load before starting any task**
- `ai-core/knowledge/architecture/overview.md` — system topology and key boundaries
- `ai-core/knowledge/patterns/coding-patterns.md` — shared patterns all builders must follow

**2. Active memory — load after knowledge, before starting any task**
- `ai-core/memory/patterns.md` — emergent patterns from recent sessions
- `ai-core/memory/anti-patterns.md` — what has been tried and caused problems

**3. On demand — load only when relevant**
- `ai-core/knowledge/architecture/adr/README.md` — before any architectural change
- `ai-core/memory/learnings.md` — when debugging a recurring issue or uncertain about an approach
- `ai-core/knowledge/domain.md` — when modeling new entities or business logic

**4. Never load proactively**
- `ai-core/meta/run-log.jsonl` — raw data; only if asked to analyze run history

### Other rules
- Run `/aisdlc-architect` for any decision with multi-week implications
- Never write to `ai-core/meta/run-log.jsonl` directly — always call `bash ai-core/hooks/log-run.sh` with the three required arguments

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
| System topology and data flows | `ai-core/knowledge/architecture/overview.md` |
| Why [key technology] was chosen | `ai-core/knowledge/architecture/adr/ADR-000X-[name].md` |
| Component X in detail | `ai-core/knowledge/components/[name].md` |
| All components at a glance | `ai-core/knowledge/components/README.md` |
| How errors are handled | `ai-core/knowledge/patterns/coding-patterns.md#error-handling` |
| Recent session learnings | `ai-core/memory/learnings.md` |
| Approaches to avoid | `ai-core/memory/anti-patterns.md` |

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
└── ai-core/    # All project knowledge and self-evolving memory
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
- Keep the CLAUDE.md under ~100 lines — depth lives in the ai-core/ files it references
