---
name: onboard
description: Bootstrap a project's AI-SDLC documentation by generating CLAUDE.md and a docs/ structure. Use this skill when a user wants to set up Claude Code for a new or existing project, asks to "onboard" a codebase, wants Claude to understand their project, needs a CLAUDE.md generated, or wants to initialize the AI-SDLC framework in their repo. Trigger for both brand-new projects (interview mode) and existing codebases (discovery mode).
---

# Onboard

Generate a project's `CLAUDE.md` and `docs/` skeleton so that Claude Code becomes a useful, context-aware collaborator from the first interaction.

There are two modes — detect which applies before doing anything else:

- **New project**: No meaningful source code exists yet. Run the interview.
- **Existing codebase**: Source code, config files, or a package manifest is present. Run discovery.

---

## Mode A: New Project (Interview)

Ask the user these questions (you can batch them into one message):

1. What is this project? (2-3 sentence description)
2. What is the tech stack? (language, framework, key libraries)
3. What is the repo structure going to look like? (monorepo? single service?)
4. Are there any non-obvious constraints or conventions to know upfront?
5. What are the 3-5 most important dev commands? (start, test, build, etc.)

Once you have answers, generate:

- `CLAUDE.md` using the **new project template** — read `references/claude-md-template-new.md`
- Empty `docs/` skeleton (see Directory Skeleton below)

Tell the user: "This is your starting skeleton. Run `/architect` when you're ready to make your first architectural decision, and `/implement` when you start building features. Both skills will fill in the docs as you go."

---

## Mode B: Existing Codebase (Reconnaissance)

Work through these phases in order. The goal is to extract reality from the code, not invent plausible-sounding facts.

### Phase 1: Wide Reconnaissance (parallel reads)

Read all of these simultaneously to get a broad picture:

- Package manifests: `package.json`, `pyproject.toml`, `Cargo.toml`, `go.mod`, `pom.xml`, `build.gradle` — whatever exists
- Entry points: `main.*`, `index.*`, `app.*`, `server.*`, `cmd/*/main.go`
- CI configs: `.github/workflows/`, `.gitlab-ci.yml`, `Dockerfile`, `docker-compose.yml`
- Top-level directory listing (use Glob `*` and `**/*` with depth limit)
- Existing docs if any: `README.md`, `docs/`, `wiki/`, `ADR/`

After Phase 1, write down what you know and what you don't. You'll fill gaps in Phase 2.

### Phase 2: Domain Deep-Dives (targeted reads)

For each major directory/module you found, read 2-4 key files:
- Pick the largest or most central files (not test files, not generated files)
- Look for: data models, API surface, database schemas, auth patterns, background jobs

Use the `references/exploration-guide.md` for heuristics on what to read in common project types (Rails, Django, Next.js, Go services, etc.).

### Phase 3: Pattern Extraction

Extract the following from the code you've read. These go directly into `docs/patterns/coding-patterns.md` with real code examples:

- **File organization**: Where do models/controllers/services/routes live?
- **Error handling**: How are errors propagated and surfaced? (exceptions, Result types, error codes?)
- **Data access**: ORM? Raw SQL? Repository pattern? Direct DB calls?
- **Logging**: What library? What format? What log levels are used?
- **Configuration**: Env vars? Config files? Feature flags?
- **Auth**: How is auth handled at the request boundary?

For each pattern: quote a real code snippet from the codebase. Never invent examples.

### Phase 4: Architecture Synthesis

Based on everything read, synthesize:

- **Topology**: What are the major components and how do they relate? (services, workers, databases, external APIs)
- **Data flows**: For the main use cases, trace data from entry point to persistence and back
- **Key boundaries**: What are the explicit seams in the codebase? (module boundaries, service boundaries, public interfaces)

### Phase 5: Generate Outputs

Generate all of the following:

**`CLAUDE.md`** — use `references/claude-md-template-existing.md`. Fill every section with specifics from the codebase. Do not leave placeholder text.

**`docs/architecture/overview.md`** — topology diagram (ASCII is fine), data flow description, key boundaries, external dependencies.

**`docs/architecture/adr/ADR-0001-existing-decisions.md`** — document 3-7 significant decisions already baked into the codebase (the framework choice, the database choice, the auth approach, etc.). These are decisions-already-made, not proposals. Status: `Accepted`.

**`docs/components/[name].md`** — one file per major component/service identified. Use the component doc format from `references/exploration-guide.md`.

**`docs/patterns/coding-patterns.md`** — populated with real examples from Phase 3.

### Phase 6: Human Review Gate

After generating, surface all uncertainties. Format them as a list:

```
[VERIFY] I couldn't determine the deployment target — is this Kubernetes, ECS, or bare metal?
[VERIFY] The auth middleware in middleware/auth.go references a JWT_SECRET but I couldn't find where tokens are issued — is there a separate auth service?
[VERIFY] I saw both Postgres and Redis used — I assumed Postgres is primary storage and Redis is cache/queue, but confirm.
```

Tell the user: "Please review the generated docs and confirm or correct the [VERIFY] items. These represent gaps where I had to make assumptions."

---

## Directory Skeleton

Always create this structure (even for new projects, as empty files):

```
docs/
├── architecture/
│   ├── overview.md
│   └── adr/
│       └── README.md          # ADR index — just a table with columns: #, Title, Status, Date
├── components/
│   └── README.md              # Component registry — one line per component: name | description | doc link
└── patterns/
    └── coding-patterns.md     # Populated for existing projects; "patterns TBD — being established" for new
```

---

## Reference files

- `references/claude-md-template-new.md` — template for new projects
- `references/claude-md-template-existing.md` — template for existing codebases (richer, more sections)
- `references/exploration-guide.md` — heuristics for reading common project types, component doc format
