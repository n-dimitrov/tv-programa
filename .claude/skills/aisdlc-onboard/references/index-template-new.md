# INDEX.md Template — New Project

Use this template when generating `aisdlc/INDEX.md` for a project that doesn't have existing source code yet. Fill in the bracketed placeholders from the user interview. Do not leave placeholder text in the output. The user's root `CLAUDE.md` should reference this file in its load order.

---

```markdown
# [Project Name]

[2-3 sentence description of what this project does and who it's for.]

## Quick context

- **Type**: [web app / API service / CLI tool / library / monorepo / etc.]
- **Stack**: [language, framework, key libraries]
- **Phase**: Greenfield — patterns being established
- **Repo structure**: [single service / monorepo with X packages / etc.]

## How to work in this codebase

### Load order

**1. Stable knowledge — load before starting any task**
- `aisdlc/knowledge/patterns/coding-patterns.md` — shared patterns (sparse at first; grows as decisions are made)

**2. Active memory — load after knowledge**
- `aisdlc/memory/anti-patterns.md` — what has been tried and failed

**3. On demand**
- `aisdlc/knowledge/architecture/adr/README.md` — before any structural decision
- `aisdlc/memory/learnings.md` — when uncertain about an approach

### Other rules
- Run `/aisdlc-context-architect` before making structural decisions — patterns are still being established
- Read any ADR before working in the area it covers
- Never write to `aisdlc/meta/run-log.jsonl` directly — always call `bash aisdlc/hooks/log-run.sh` with the three required arguments

## Key facts

[3-7 non-obvious things a collaborator needs to know. Examples:]
- [The primary data model is X; everything else is derived from it]
- [Auth is handled at the gateway layer — services trust the forwarded identity header]
- [All background work goes through the jobs/ module, never inline in request handlers]

_Note: This section will grow as architectural decisions are made via `/aisdlc-context-architect`._

## Documentation map

| Want to understand... | Read... |
|---|---|
| Architecture decisions | `aisdlc/knowledge/architecture/adr/README.md` |
| Component breakdown | `aisdlc/knowledge/components/README.md` |
| Coding patterns | `aisdlc/knowledge/patterns/coding-patterns.md` |
| Recent session learnings | `aisdlc/memory/learnings.md` |

## Commands

```bash
[command to start dev server]
[command to run tests]
[command to run linter]
[command to build for production]
```

## Directory map

```
[project-name]/
├── [src dir]      # [description]
├── [test dir]     # [description]
├── [config files] # [description]
└── aisdlc/       # Knowledge, memory, meta, hooks
    ├── knowledge/ # Architecture, patterns, components
    ├── memory/    # Evolving learnings and anti-patterns
    ├── meta/      # Run logs and evolution tracking
    └── hooks/     # Automation scripts
```
```

---

## Notes for the generator

- Keep Key facts to genuinely non-obvious things — don't document the framework's own conventions
- If the user mentioned constraints (performance requirements, compliance, team conventions), put them in Key facts
- Commands: include only commands the user explicitly mentioned; mark unknowns as `# [TBD]`
- The aisdlc/knowledge/ will be mostly empty at first — that's fine and expected
