# CLAUDE.md Template — New Project

Use this template when generating CLAUDE.md for a project that doesn't have existing source code yet. Fill in the bracketed placeholders from the user interview. Do not leave placeholder text in the output.

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

- Patterns are being established — run `/architect` before making structural decisions
- Run `/implement` to add features; it will enforce patterns as they emerge
- Read any ADR before working in the area it covers

## Key facts

[3-7 non-obvious things a collaborator needs to know. Examples:]
- [The primary data model is X; everything else is derived from it]
- [Auth is handled at the gateway layer — services trust the forwarded identity header]
- [All background work goes through the jobs/ module, never inline in request handlers]

_Note: This section will grow as architectural decisions are made via `/architect`._

## Documentation map

| Want to understand... | Read... |
|---|---|
| Architecture decisions | `docs/architecture/adr/README.md` |
| Component breakdown | `docs/components/README.md` |
| Coding patterns | `docs/patterns/coding-patterns.md` |

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
└── docs/          # Architecture decisions, component docs, patterns
```
```

---

## Notes for the generator

- Keep Key facts to genuinely non-obvious things — don't document the framework's own conventions
- If the user mentioned constraints (performance requirements, compliance, team conventions), put them in Key facts
- Commands: include only commands the user explicitly mentioned; mark unknowns as `# [TBD]`
- The docs/ will be mostly empty at first — that's fine and expected
