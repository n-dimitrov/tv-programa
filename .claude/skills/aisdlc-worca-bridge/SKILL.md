---
name: aisdlc-worca-bridge
description: "Generate .claude/agents/ overrides that inject aisdlc project knowledge into worca pipeline agents. Auto-detects which agents exist and which knowledge files are populated. Re-runnable — safe to run as knowledge grows. Use after /aisdlc-onboard or whenever new ADRs, patterns, or components are added. Trigger phrases: 'bridge aisdlc', 'wire knowledge into pipeline', 'connect aisdlc to worca', 'aisdlc-worca-bridge'."
---

# aisdlc-worca-bridge

Wire aisdlc project knowledge into worca pipeline agents by generating `.claude/agents/` overrides with `<!-- append -->` sections. Auto-detects which agents and knowledge files exist — no hardcoded assumptions.

---

## Step 1: Validate prerequisites

Check that both systems are present:

1. **`aisdlc/INDEX.md`** must exist. If missing → stop: "Run `/aisdlc-onboard` first — there's no knowledge to bridge."
2. Detect worca by checking **all three markers** (in order):
   a. Read `.claude/settings.json` — does it have a `"worca"` key?
   b. Does `.claude/worca/` directory exist?
   c. Does `.claude/worca/agents/core/` contain any `.md` files?

   If **none** of the three are found → stop: "No worca pipeline detected. Run `worca init` first."
   If (a) or (b) pass but (c) fails → warn: "worca config found but no agent templates in `.claude/worca/agents/core/`. Run `worca init --upgrade` to refresh the runtime copy."

---

## Step 2: Discover available agents

List all `.md` files in `.claude/worca/agents/core/`:

```bash
ls .claude/worca/agents/core/*.md
```

**Parse agent names** from filenames. There are two file types:
- `<agent>.md` — system prompt (e.g. `planner.md`, `coordinator.md`)
- `<stage>.block.md` — user message template (e.g. `plan.block.md`)

Only system-prompt files (`<agent>.md`, NOT `*.block.md`) are candidates for overrides. Extract the agent name from each: `planner`, `coordinator`, `implementer`, `tester`, `reviewer`, `guardian`, `learner`, `plan_reviewer`, etc.

Build a list: `discovered_agents = ["planner", "coordinator", ...]`

Report to the user: "Detected worca agents: [list]"

---

## Step 3: Scan aisdlc for populated files

Read each knowledge file and classify as **populated** or **stub**.

**Populated** = has real content beyond template headers — more than 5 non-empty, non-header, non-comment lines and does not consist solely of `[TBD]` placeholders.

**Stub** = template-only content (`[TBD]`, placeholder text, fewer than 5 substantive lines).

Files to scan:

```
aisdlc/INDEX.md
aisdlc/knowledge/architecture/overview.md
aisdlc/knowledge/architecture/adr/README.md
aisdlc/knowledge/components/README.md
aisdlc/knowledge/patterns/coding-patterns.md
aisdlc/knowledge/conventions.md
aisdlc/knowledge/domain.md
aisdlc/knowledge/ownership.md
aisdlc/memory/anti-patterns.md
aisdlc/memory/learnings.md
aisdlc/memory/patterns.md
```

Also scan for any role-specific pattern files that exist:
```bash
ls aisdlc/knowledge/patterns/*-patterns.md 2>/dev/null
```

Build a map: `{ file_path: "populated" | "stub" }`.

Report to the user: "Found N populated knowledge files, M stubs."

---

## Step 4: Check for existing agent overrides

Read `.claude/agents/` directory if it exists. For each agent override file that already exists:

- Check if it contains a `## Project Knowledge (aisdlc)` section (this skill's marker)
- If **yes**: this skill previously generated it — safe to replace that section
- If **no**: the override has user-written content — preserve it and append

This makes the skill safely re-runnable without clobbering manual overrides.

---

## Step 5: Build the override plan — PRESENT TO USER BEFORE WRITING

### Agent → Knowledge mapping

For each discovered agent, determine which aisdlc files it should read based on its **role category**. Match agent names to categories:

**Planning roles** (`planner`, `plan_reviewer`):
```
Required (if populated):
  - aisdlc/INDEX.md
  - aisdlc/knowledge/architecture/overview.md
  - aisdlc/knowledge/domain.md
Conditional (if populated):
  - aisdlc/knowledge/architecture/adr/README.md — before architectural decisions
  - aisdlc/knowledge/components/README.md — when work touches multiple components
  - aisdlc/knowledge/ownership.md — when assessing blast radius
  - aisdlc/memory/anti-patterns.md — to avoid known failure modes
```

**Coordination roles** (`coordinator`):
```
Required (if populated):
  - aisdlc/INDEX.md
  - aisdlc/knowledge/components/README.md
  - aisdlc/knowledge/architecture/overview.md
Conditional (if populated):
  - aisdlc/knowledge/ownership.md — for task assignment context
```

**Implementation roles** (`implementer`):
```
Required (if populated):
  - aisdlc/knowledge/patterns/coding-patterns.md
  - aisdlc/knowledge/conventions.md
Conditional (if populated):
  - aisdlc/knowledge/patterns/<role>-patterns.md — any role-specific patterns found
  - aisdlc/memory/patterns.md — emergent patterns from recent sessions
  - aisdlc/memory/anti-patterns.md — what to avoid
```

**Review roles** (`reviewer`):
```
Required (if populated):
  - aisdlc/knowledge/conventions.md
  - aisdlc/knowledge/patterns/coding-patterns.md
Conditional (if populated):
  - aisdlc/knowledge/architecture/adr/README.md — check changes against decisions
  - aisdlc/memory/anti-patterns.md — known failure modes
```

**Test roles** (`tester`):
```
Conditional (if populated):
  - aisdlc/knowledge/conventions.md — testing conventions section
```

**Guardian / PR roles** (`guardian`):
```
Conditional (if populated):
  - aisdlc/knowledge/conventions.md — commit and PR conventions
```

**Learning roles** (`learner`):
```
Conditional (if populated):
  - aisdlc/memory/learnings.md — existing learnings to build on
  - aisdlc/memory/patterns.md — patterns already captured
  - aisdlc/memory/anti-patterns.md — failures already recorded
```

**Unknown agents** (names not matching any category above):
```
Conditional (if populated):
  - aisdlc/INDEX.md — basic project context
```

For each agent, filter the mapping to include only **populated** files from Step 3. If an agent has zero populated files to inject, skip it entirely.

### Present the plan to the user

**Do NOT write any files yet.** Present a summary table and ask for confirmation:

```
Proposed agent overrides:

| Agent         | Override file                   | Required reads | Conditional reads | Action     |
|---|---|---|---|---|
| planner       | .claude/agents/planner.md       | 3 files        | 4 files           | Create new |
| coordinator   | .claude/agents/coordinator.md   | 3 files        | 1 file            | Create new |
| implementer   | .claude/agents/implementer.md   | 2 files        | 2 files           | Create new |
| reviewer      | .claude/agents/reviewer.md      | 2 files        | 2 files           | Create new |
| tester        | .claude/agents/tester.md        | —              | 1 file            | Create new |
| guardian      | .claude/agents/guardian.md      | —              | 1 file            | Create new |

Agents skipped (no populated knowledge relevant to their role):
- learner (memory files are empty stubs)

Stub files not injected (populate to enrich agent context):
- aisdlc/knowledge/patterns/backend-patterns.md
- aisdlc/memory/anti-patterns.md
- ...

Proceed with generating these overrides? You can remove agents from the list or adjust before I write.
```

Wait for the user to confirm, modify, or reject before proceeding to Step 6.

---

## Step 6: Generate agent overrides (only after user approval)

Create `.claude/agents/` directory if it doesn't exist.

For each approved agent, generate an override file.

### Override file format

```markdown
<!-- append -->

## Project Knowledge (aisdlc)

Before starting your work, read these project knowledge files for context.
They contain architecture decisions, coding patterns, and conventions
established for this project.

### Required reading

Read these files using the Read tool before proceeding:

- `aisdlc/INDEX.md` — project overview, key facts, constraints
- `aisdlc/knowledge/architecture/overview.md` — system topology and boundaries
[... only populated files from the approved plan ...]

### Conditional reading

Read these when relevant to your current task:

- `aisdlc/knowledge/architecture/adr/README.md` — check before any architectural change
[... only populated files from the approved plan ...]
```

If an agent has no "Required reading" files, omit that subsection.
If an agent has no "Conditional reading" files, omit that subsection.

### Rules for generated overrides

1. Start with `<!-- append -->` — never replace the base agent prompt
2. Use the marker heading `## Project Knowledge (aisdlc)` — this is how re-runs detect previous output
3. Only list files that are **populated** — never send agents to read stubs
4. Keep instructions concise — agents have limited turns
5. For the implementer, note that role-specific pattern files extend `coding-patterns.md`

### Handling existing overrides

When writing each agent override file:

1. If the file **does not exist**: write the full `<!-- append -->` override
2. If the file **exists and contains `## Project Knowledge (aisdlc)`**: replace everything from that heading to the next `##` heading (or end of file) with the new content. Preserve everything before it.
3. If the file **exists but has no `## Project Knowledge (aisdlc)` section**: append the new section at the end of the file

---

## Step 7: Verify and report

After generating all overrides:

1. List all files created/updated with their full paths
2. Show which knowledge files each agent will read
3. Tell the user: "These overrides take effect on the next pipeline run. No code changes needed."
4. If any knowledge files are stubs, suggest: "Populate these stubs to give agents more context on the next bridge run: [list]"
5. Remind: "Re-run `/aisdlc-worca-bridge` after adding new ADRs, patterns, or components to update the overrides."

---

## Step 8: Update aisdlc meta

If `aisdlc/meta/onboarding-report.md` exists, append a section:

```markdown
## Bridge Configuration (aisdlc-worca-bridge)

**Date:** <YYYY-MM-DD>
**Agents discovered:** <list>
**Agent overrides generated:** <count>
**Knowledge files wired:** <count populated> / <count total>
```

---

## Final step — always do this last

```bash
bash aisdlc/hooks/log-run.sh "aisdlc-worca-bridge" "<one-line summary>" "success|error|partial"
```

Example: `bash aisdlc/hooks/log-run.sh "aisdlc-worca-bridge" "Generated 5 agent overrides wiring 8 aisdlc knowledge files into pipeline" "success"`

If the user rejected the plan or the skill was interrupted, use `"partial"` as the outcome.
