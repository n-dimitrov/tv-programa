---
name: aisdlc-onboard
description: Bootstrap a project's AI-SDLC documentation by generating CLAUDE.md and an `ai-core/` folder structure. Use this skill when a user wants to set up Claude Code for a new or existing project, asks to "onboard" a codebase, wants Claude to understand their project, needs a CLAUDE.md generated, or wants to initialize the AI-SDLC framework in their repo. Trigger for both brand-new projects (interview mode) and existing codebases (discovery mode).
---

# aisdlc-onboard

Generate a project's `CLAUDE.md` and `ai-core/` skeleton so that Claude Code becomes a useful, context-aware collaborator from the first interaction.

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
- Full `ai-core/` skeleton (see Directory Skeleton below)

Then create role-specific builder skills (see **Builder Instantiation** below).

Tell the user: "This is your starting skeleton. Run `/aisdlc-architect` when you're ready to make your first architectural decision, and your builder skill (e.g. `/backend-builder`) when you start building features. Both skills will fill in the docs as you go."

---

## Mode B: Existing Codebase (Reconnaissance)

Work through these phases in order. The goal is to extract reality from the code, not invent plausible-sounding facts.

### Phase 1: Wide Reconnaissance (parallel reads)

Read all of these simultaneously to get a broad picture:

- Package manifests: `package.json`, `pyproject.toml`, `Cargo.toml`, `go.mod`, `pom.xml`, `build.gradle` — whatever exists
- Entry points: `main.*`, `index.*`, `app.*`, `server.*`, `cmd/*/main.go`
- CI configs: `.github/workflows/`, `.gitlab-ci.yml`, `Dockerfile`, `docker-compose.yml`
- Top-level directory listing (use Glob `*` and `**/*` with depth limit)
- Existing docs if any: `README.md`, `ai-core/`, `wiki/`, `ADR/`

After Phase 1, write down what you know and what you don't. You'll fill gaps in Phase 2.

### Phase 2: Domain Deep-Dives (targeted reads)

For each major directory/module you found, read 2-4 key files:
- Pick the largest or most central files (not test files, not generated files)
- Look for: data models, API surface, database schemas, auth patterns, background jobs

Use the `references/exploration-guide.md` for heuristics on what to read in common project types (Rails, Django, Next.js, Go services, etc.).

### Phase 3: Pattern Extraction

Extract the following from the code you've read. These go directly into `ai-core/knowledge/patterns/coding-patterns.md` with real code examples:

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

**`ai-core/knowledge/architecture/overview.md`** — topology diagram (ASCII is fine), data flow description, key boundaries, external dependencies.

**`ai-core/knowledge/architecture/adr/ADR-0001-existing-decisions.md`** — document 3-7 significant decisions already baked into the codebase (the framework choice, the database choice, the auth approach, etc.). These are decisions-already-made, not proposals. Status: `Accepted`.

**`ai-core/knowledge/components/[name].md`** — one file per major component/service identified. A "major component" is anything with a distinct responsibility boundary: a service, a background worker, a significant library module, or a subsystem with its own data model. Rule of thumb: if it has its own directory or would warrant its own ADR, it's a component. Use the component doc format from `references/exploration-guide.md`.

**`ai-core/knowledge/components/README.md`** — component registry table. Add one row per component generated above:
```markdown
| Component | Description | Doc |
|---|---|---|
| [name] | [one-line purpose] | [name.md](./[name].md) |
```

**`ai-core/knowledge/patterns/coding-patterns.md`** — populated with real examples from Phase 3.

**`ai-core/knowledge/conventions.md`** — cross-cutting naming, formatting, commit style extracted from the codebase or team norms. Mark unknowns `[VERIFY]`.

**`ai-core/knowledge/domain.md`** — core entities, key relationships, ubiquitous language extracted from the code. Mark unknowns `[VERIFY]`.

Also create all memory, meta, and hook stubs (see Directory Skeleton below) — even for existing projects, these start empty.

### Phase 6: Builder Instantiation

Create role-specific builder skills based on the detected stack (see **Builder Instantiation** below).

### Phase 7: Human Review Gate

After generating, surface all uncertainties. Format them as a list:

```
[VERIFY] I couldn't determine the deployment target — is this Kubernetes, ECS, or bare metal?
[VERIFY] The auth middleware references a JWT_SECRET but I couldn't find where tokens are issued — is there a separate auth service?
[VERIFY] I saw both Postgres and Redis — I assumed Postgres is primary storage and Redis is cache/queue, but confirm.
```

Tell the user: "Please review the generated docs and confirm or correct the [VERIFY] items. These represent gaps where I had to make assumptions."

---

## Builder Instantiation

After onboarding (both modes), create role-specific builder skills based on the detected or stated tech stack. Do not leave this as a manual `cp` step.

**How to detect roles:**
- Backend language/framework detected (Go, Python/Django/FastAPI, Node.js/Express, Java/Spring, Ruby/Rails) → create `backend-builder`
- Frontend framework detected (React, Vue, Angular, Next.js, Svelte) → create `frontend-builder`
- Mobile framework detected (React Native, Flutter, Swift/UIKit, Kotlin) → create `mobile-builder`
- Infrastructure files detected (Dockerfile, Terraform, Pulumi, k8s manifests, CI configs) → create `devops-builder`
- Data pipeline files detected (dbt, Airflow, Spark configs) → create `data-builder`

**For each detected role:**
1. Copy `.claude/skills/aisdlc-builder/` to `.claude/skills/<role>-builder/`
2. Update the `name:` frontmatter to `<role>-builder`
3. Update the `description:` frontmatter using the role-scoped descriptions at the end of the builder template
4. Create an empty `ai-core/knowledge/patterns/<role>-patterns.md` stub with a header: `# <Role> Patterns\n\nRole-specific patterns for <role>-builder. Extends ai-core/knowledge/patterns/coding-patterns.md.`

**Ask the user to confirm** the detected roles before creating: "Based on your stack, I'll create these builder roles: [list]. Add or remove any?"

If no stack is detected or the project is too early, create a single `fullstack-builder` as a catch-all.

---

## Directory Skeleton

Always create this full structure (empty stubs for new projects, populated knowledge for existing):

```
ai-core/
├── knowledge/
│   ├── architecture/
│   │   ├── overview.md
│   │   └── adr/
│   │       └── README.md          # ADR index — table: #, Title, Status, Date
│   ├── components/
│   │   └── README.md              # Component registry — one line per component
│   ├── patterns/
│   │   └── coding-patterns.md     # Populated for existing; "TBD" for new
│   ├── conventions.md             # Cross-cutting naming and style rules
│   ├── domain.md                  # Domain model and ubiquitous language
│   └── ownership.md               # Team/service ownership map
├── plans/                         # Feature plans from /aisdlc-planner (starts empty)
├── memory/
│   ├── learnings.md               # Starts empty (with standard header)
│   ├── patterns.md                # Starts empty (with standard header)
│   └── anti-patterns.md          # Starts empty (with standard header)
├── meta/
│   ├── run-log.jsonl              # Starts empty
│   ├── skill-usage.json           # Starts as {"skills": {}}
│   ├── evolution-log.md           # Starts empty (with standard header)
│   └── onboarding-report.md       # Generated by this skill — full onboarding summary
└── hooks/
    ├── log-run.sh                 # Functional script — make executable
    ├── capture-session-metrics.sh # Status line — captures token/cost/time per session
    ├── extract-learning.sh        # Functional script — make executable
    └── summarize-failure.sh       # Functional script — make executable
```

After creating the hooks, register the status line in `.claude/settings.local.json`:
```json
{
  "status_line": "bash ai-core/hooks/capture-session-metrics.sh"
}
```

The `status_line` command runs after each Claude Code response. It receives a JSON object on stdin with token counts, cost, and duration — and writes the cumulative values to `ai-core/meta/.session-metrics.json`. When a skill calls `log-run.sh` at session end, it reads this file and includes the metrics in `run-log.jsonl`.

> **Note:** `log-run.sh` is **not** registered as a Stop hook — it requires positional arguments (`<skill>`, `<task_summary>`, `<outcome>`) that the hook API cannot provide. Each skill calls it explicitly in its "Final step" section. The same applies to `extract-learning.sh` and `summarize-failure.sh`.

> **Note:** `extract-learning.sh` and `summarize-failure.sh` are **not** registered as automatic hooks — they require positional arguments (`<skill>`, `<task_summary>`, etc.) and must be called explicitly by builder and reviewer skills in their "Final step" section.

---

## Onboarding Report

After completing onboarding (either mode), generate a comprehensive report at `ai-core/meta/onboarding-report.md` using this structure:

```markdown
# Onboarding Report

**Date:** <YYYY-MM-DD>
**Mode:** <New Project | Existing Codebase>
**Project:** <project name>

## Summary

<2-3 sentence overview of what was onboarded>

## Tech Stack

- **Language(s):** <list>
- **Framework(s):** <list>
- **Key Dependencies:** <list 3-5 most important>
- **Infrastructure:** <deployment target, databases, external services>

## Discovery Process (Existing Codebase Only)

### Phase 1: Reconnaissance
<List what files/manifests were read in initial scan>

### Phase 2: Domain Deep-Dives
<List which modules/directories were explored and key files read>

### Phase 3: Patterns Found
<Summarize the coding patterns extracted>

### Phase 4: Architecture
<Brief summary of topology and data flows identified>

## Interview Responses (New Project Only)

1. **Project Description:** <answer>
2. **Tech Stack:** <answer>
3. **Repo Structure:** <answer>
4. **Constraints/Conventions:** <answer>
5. **Dev Commands:** <answer>

## Generated Artifacts

### Documentation
- [ ] `CLAUDE.md`
- [ ] `ai-core/knowledge/architecture/overview.md`
- [ ] `ai-core/knowledge/architecture/adr/README.md`
- [ ] `ai-core/knowledge/components/README.md`
- [ ] `ai-core/knowledge/patterns/coding-patterns.md`
- [ ] `ai-core/knowledge/conventions.md`
- [ ] `ai-core/knowledge/domain.md`
- [ ] `ai-core/knowledge/ownership.md`

### Components Documented
<List each component with link: [component-name](../knowledge/components/component-name.md)>

### ADRs Created
<List ADRs created during onboarding>

### Builder Skills Instantiated
<List builder skills created, e.g., backend-builder, frontend-builder>

## Uncertainties & Verification Needed

<List all [VERIFY] items that require human review>

## Next Steps

1. Review this report and all generated documentation
2. Correct any [VERIFY] items in the knowledge base
3. Run `/aisdlc-architect` when making your first architectural decision
4. Use your builder skill (e.g., `/backend-builder`) when starting feature work

## Metrics

- **Files Read:** <count>
- **Documentation Generated:** <count of MD files>
- **Total Lines Generated:** <approximate count>
- **Time Spent:** <estimate in minutes>
```

Present the report location to the user: "Onboarding complete! Full report saved to `ai-core/meta/onboarding-report.md`. Please review the [VERIFY] items and update the knowledge base as needed."

---

## Final step — always do this last

Before closing the session, log it:
```bash
bash ai-core/hooks/log-run.sh "aisdlc-onboard" "<one-line summary of what was onboarded>" "success|error|partial"
```

Example: `bash ai-core/hooks/log-run.sh "aisdlc-onboard" "Generated CLAUDE.md and ai-core/ for payments-service" "success"`

If the outcome was `error` or `partial`, also capture the failure so it feeds `anti-patterns.md`:
```bash
bash ai-core/hooks/summarize-failure.sh "aisdlc-onboard" "<one-line summary>" "<what went wrong>"
```

---

## Reference files

- `references/claude-md-template-new.md` — template for new projects
- `references/claude-md-template-existing.md` — template for existing codebases (richer, more sections)
- `references/exploration-guide.md` — heuristics for reading common project types, component doc format
