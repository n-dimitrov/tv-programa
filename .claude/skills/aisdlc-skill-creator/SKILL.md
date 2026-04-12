---
name: aisdlc-skill-creator
description: Create a new custom Claude Code skill, or analyze the project to recommend which skills are missing. Use when a user wants to add a skill, automate a recurring task with AI, build a new workflow, or extend the ai-sdlc lifecycle with project-specific capabilities. Also use when the user wants to discover skill gaps or get recommendations. Trigger phrases: "create a skill", "add a skill", "new skill", "automate [task] with Claude", "build a skill for [X]", "I want Claude to consistently help me with [task]", "make a skill that does [X]", "we need a skill for [domain]", "what skills should I create", "what skills am I missing", "analyze my skill gaps", "recommend skills for this project", "which skills do we need".
---

# aisdlc-skill-creator

Two modes — detect which applies before doing anything else:

- **Discovery mode**: The user wants to know *what* skills to create. Analyze the project and produce a ranked recommendation list.
- **Creation mode**: The user has a specific skill in mind. Design and generate it.

Each new skill improves **Agentic Skills Coverage** (Skills Readiness dimension, 25% weight). All sessions log to `run-log.jsonl`.

---

## Mode Detection

**Discovery mode** — user says something like: "what skills should I add", "analyze my skill gaps", "what am I missing", "recommend skills", no specific task named.

**Creation mode** — user names a task or workflow: "create a skill for X", "build a skill that does Y", "automate Z".

If unclear, ask: "Do you have a specific skill in mind, or would you like me to analyze the project and recommend where to start?"

---

## Discovery Mode

### D1: Load signals

Read these in parallel:

- `.claude/skills/` directory listing — what skills already exist
- `ai-core/meta/run-log.jsonl` — which sessions had `skill == "unknown"` (ad-hoc work that bypassed the skill system; these are the strongest signal)
- `ai-core/meta/skill-usage.json` — invocation counts per skill (low count = underused or badly described)
- `ai-core/knowledge/components/README.md` — component types in the project
- `ai-core/knowledge/patterns/coding-patterns.md` — recurring task patterns
- `CLAUDE.md` — key facts and commands

### D2: Identify gaps

From the signals, identify recurring task types that have no skill:

- **From run-log**: cluster `task_summary` values where `skill == "unknown"` — what work is happening ad-hoc?
- **From components**: for each major component, is there a skill covering its most common operations?
- **From patterns**: are any coding patterns complex enough that they'd benefit from a guided skill?
- **From skill-usage**: any existing skill with 0 invocations likely has a weak description — flag it separately

### D3: Produce recommendations

Output a ranked list. Rank by: frequency of ad-hoc occurrence first, then complexity of the task, then blast radius of doing it wrong.

Format:

```
Recommended skills for <project name>:

1. <skill-name> — <one-line purpose>
   Signal: [X] ad-hoc sessions with no skill in run-log / no skill covers <component>
   Effort: Low | Medium | High

2. <skill-name> — <one-line purpose>
   Signal: ...
   Effort: ...

Also flagged — existing skills with low usage (possible description problem):
- <skill-name>: 0 invocations — description may be too narrow to trigger reliably
```

Then ask: "Which of these would you like to build first? I can create it now."

If the user picks one, switch to Creation Mode with that skill as the starting point — skip the interview questions that are already answered.

---

## Creation Mode

### Step 1: Interview

Ask the user (batch into one message):

1. What recurring task or workflow should this skill handle?
2. What would a developer say to trigger it? (list 3–5 example phrases)
3. What is the expected output — files written, docs updated, analysis delivered?
4. Is there an existing skill this is closest to, or is it entirely new?
5. Should this skill be role-scoped (e.g., only backend devs) or project-wide?

### Step 2: Load project context

Read these before designing the skill:

- `CLAUDE.md` — load order, key facts, existing skill references
- `ai-core/knowledge/patterns/coding-patterns.md` — patterns the new skill must respect
- `ai-core/knowledge/components/README.md` — which components the skill may need to read

If the new skill is domain-specific (e.g., database, auth, API contracts), also read the relevant `ai-core/knowledge/components/[name].md`.

### Step 3: Scope the skill

Decide:

- **Name**: `<action>-<domain>` or `<domain>-<action>` (e.g., `db-migration-helper`, `api-contract-checker`, `release-notes-writer`). Kebab-case, matches the directory name.
- **Single responsibility**: one skill = one task type. If the user describes two distinct tasks, split into two skills.
- **Skill type**: if the primary output is code written to the codebase for a specific role → **Builder type**: read `blueprints/skills/aisdlc-builder/SKILL.md` as the seed in Step 5. Otherwise → **Custom type**: use `references/skill-template.md`.
- **Body vs. references/**: steps and decision logic in body; templates, checklists, schemas in `references/`. Keep body under 500 lines.
- **Context loading**: which `ai-core/knowledge/` files should the new skill load at its Step 1?

### Step 4: Draft and confirm

Before writing any files, show the user:

```
Skill name:       <name>
Type:             Builder (seeded from aisdlc-builder/) | Custom (seeded from skill-template.md)
Trigger:          "<proposed description>"
Steps:            [numbered step titles]
references/:      [list of reference files, or "none"]
Context loaded:   [which ai-core/ files the new skill reads]
Metrics impact:   +1 to Agentic Skills Coverage (Skills Readiness dimension)
```

Ask: "Does this match your intent? Any changes before I write the files?"

Do not proceed until confirmed.

### Step 5: Generate files

Read the appropriate seed (`aisdlc-builder/SKILL.md` or `references/skill-template.md`) and use it as the base. Fill every section. Do not leave placeholder text.

Write:

- `.claude/skills/<name>/SKILL.md`
- `.claude/skills/<name>/references/<file>.md` — one per reference identified in Step 3 (skip if none needed)

The `description` field is the sole trigger mechanism and the most failure-prone part. Read `references/description-guide.md` before writing it. A weak description causes undertriggering — the skill exists but never fires.

### Step 6: Register in skill-usage.json

After writing the files, add an entry to `ai-core/meta/skill-usage.json`:

```json
{
  "skills": {
    "<name>": {
      "created": "<YYYY-MM-DD>",
      "purpose": "<one-line description matching the skill's description field>",
      "invocations": 0,
      "last_used": null
    }
  }
}
```

If the file doesn't exist, create it with this structure. If it exists, merge the new entry without modifying existing ones.

### Step 7: Summarize

Tell the user:

- File paths created
- The exact trigger phrases that will activate the skill
- That the new skill counts toward Agentic Skills Coverage — visible in the next quarterly assessment under `ai-core/knowledge/metrics/dimensions/skills-readiness.md`
- How to extend the skill later: run `/aisdlc-skill-creator` again and reference the skill by name

---

## Final step — always do this last

```bash
bash ai-core/hooks/log-run.sh "aisdlc-skill-creator" "Discovery: recommended N skills | Created <name> skill for <purpose>" "success|error|partial"
```

Then capture a learning — both discovery and design sessions surface reusable patterns:

```bash
bash ai-core/hooks/extract-learning.sh "aisdlc-skill-creator" "Discovery: recommended N skills | Created <name> skill for <purpose>"
```

---

## Reference files

- `references/skill-template.md` — blank SKILL.md skeleton with inline guidance for each section
- `references/description-guide.md` — how to write trigger descriptions that fire reliably without undertriggering
