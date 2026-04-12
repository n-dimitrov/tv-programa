---
name: devops-builder
description: "Implement infrastructure and deployment changes — Dockerfile, Cloud Run config, GCS setup, shell scripts, CI/CD — following established patterns. Use when a user wants to change deployment, Docker config, or operational scripts."
---

# aisdlc-builder (Builder Skill Template)

This is the **base template** for role-specific builder skills. When you adopt this framework, do not use it as-is — copy and rename it once per builder role on your team.

## Naming convention

```
aisdlc-builder/     ← this template (ai-sdlc source)
    ↓ copy & rename per role
backend-builder/
frontend-builder/
mobile-builder/
devops-builder/
ios-builder/
data-builder/
```

After copying, update two things in each copy's `SKILL.md`:
1. `name:` frontmatter → e.g. `backend-builder`
2. `description:` frontmatter → scope it to the role (see examples at end of this file)

Each role-specific builder skill can also load its own pattern file (e.g. `backend-builder` loads `ai-core/knowledge/patterns/backend-patterns.md`) in addition to the shared `ai-core/knowledge/patterns/coding-patterns.md`.

---

## Step 1: Load context (mandatory — do not skip)

Before writing any code, read all of these:

1. **`CLAUDE.md`** — understand the project's constraints, stack, and any critical facts
2. **`ai-core/knowledge/patterns/coding-patterns.md`** — shared patterns that apply across all builder roles; every pattern here must be followed
3. **Role-specific pattern file** — if a `ai-core/knowledge/patterns/<role>-patterns.md` exists for this builder role, read it; it overrides or extends the shared patterns for this domain
4. **`ai-core/memory/anti-patterns.md`** — check for known failed approaches in this codebase before proposing an implementation strategy

**If files are missing, handle gracefully:**
- **`CLAUDE.md` missing** → Stop. Tell the user: "This project hasn't been onboarded yet. Run `/aisdlc-onboard` first." This is the only hard stop — without CLAUDE.md, you have no project context.
- **`ai-core/knowledge/patterns/coding-patterns.md` missing or empty** → Warn but proceed. Tell the user: "No coding patterns documented yet. I'll grep the codebase for existing patterns as I go, but consider running `/aisdlc-onboard` to extract them systematically."
- **`ai-core/memory/anti-patterns.md` missing** → Proceed. No anti-patterns means nothing has failed yet.
- **ADR index missing** → Proceed. Note: "No ADRs found — if this feature involves structural decisions, consider running `/aisdlc-architect` first."

Then check for an active plan:
5. **`ai-core/plans/`** — if this directory exists, check for any plan with `Status: active` that assigns tasks to your builder role. If found, load it to understand your task's context, dependencies, and expected outputs.

Then check for relevant ADRs:
6. **`ai-core/knowledge/architecture/adr/README.md`** — scan for ADRs that constrain this feature area
7. Load specific ADRs that directly apply (e.g. backend-builder implementing auth should load the auth ADR; frontend-builder adding a new route should load any routing/SSR ADR)

---

## Step 2: State the implementation plan

Before writing code, write out:

**What you're building**: One sentence describing the feature/fix.

**Files to create**: List with purpose of each.

**Files to modify**: List with what changes and why.

**Data flow**: Trace how data moves through the new code — from entry point through any services, to persistence, and back.

**Pattern alignment**: For each major decision, name the existing pattern it follows. Example:
- "New API handler follows the pattern in `handlers/users.go:L45` — same middleware chain, same error wrapping"
- "State update follows the Redux slice pattern in `store/auth.slice.ts:L22`"
- "Database access goes through the Repository layer per ADR-0003"

Then ask: "Does this plan look right, or should I adjust the approach before I start?"

Wait for confirmation. Do not start implementing until the user agrees.

---

## Step 3: Implement following discovered patterns

**If patterns exist** (`ai-core/knowledge/patterns/coding-patterns.md` or the role-specific pattern file has real content):
- Follow them exactly — same error handling style, same logging calls, same data access path, same naming conventions
- When in doubt between two approaches, grep the codebase for the most common pattern and use that

**If no pattern exists for something you need to do**:
- Do not invent a pattern from scratch
- Grep the codebase for the closest analogous example
- Tell the user what you found and what pattern you're deriving from it

**Never**:
- Use a library not already in the project without explicit user approval
- Introduce a new architectural layer without an ADR
- Create abstraction for a one-time operation
- Add error handling for scenarios that can't happen given existing invariants

---

## Step 4: After implementing, update docs and capture learnings

**If you introduced a novel pattern** not in the pattern docs:
Add it to `ai-core/knowledge/patterns/coding-patterns.md` (shared) or `ai-core/knowledge/patterns/<role>-patterns.md` (role-specific) with a real code example from what you just wrote.

**If you created or significantly changed a component**:
Update or create `ai-core/knowledge/components/[name].md` — updated public interface, new implementation notes, reference to governing ADR.

**If you made a structural change that affects the architecture overview**:
Update `ai-core/knowledge/architecture/overview.md` — topology section if you added/changed how components interact.

**If you used a non-obvious approach that worked well**:
Append a one-liner to `ai-core/memory/learnings.md`:
```
[YYYY-MM-DD] <role> — <what worked and why> #candidate-for-promotion
```
Keep it brief — this is a signal for the reviewer, not a full pattern doc.

---

## Step 5: Implementation checklist

Before declaring done, verify:

- [ ] All new code follows patterns from `ai-core/knowledge/patterns/coding-patterns.md` and the role-specific pattern file
- [ ] `ai-core/memory/anti-patterns.md` was checked — no known failure modes were repeated
- [ ] Error handling matches the project's established style
- [ ] No new libraries introduced without user approval
- [ ] Tests follow the project's test patterns
- [ ] Pattern docs updated if a new pattern was introduced
- [ ] `ai-core/knowledge/components/` updated if a component was created or significantly changed

Read `references/implementation-checklist.md` for the expanded checklist when the feature spans multiple components.

---

## Description examples for instantiated skills

When you copy this template, replace the frontmatter description with a role-scoped version:

**backend-builder:**
```
description: Implement backend features — APIs, services, database access, background jobs — following established patterns. Use when a user wants to build or fix something on the server side. Loads backend-specific patterns before writing any code.
```

**frontend-builder:**
```
description: Implement frontend features — UI components, state management, routing, API integration — following established patterns. Use when a user wants to build or fix something in the UI layer. Loads frontend-specific patterns before writing any code.
```

**mobile-builder:**
```
description: Implement mobile features — screens, navigation, native integrations, offline behavior — following established patterns. Use when a user wants to build or fix something in the mobile app. Loads mobile-specific patterns before writing any code.
```

---

## Final step — always do this last

Before closing the session, log it — use the actual role name you renamed this skill to:
```bash
bash ai-core/hooks/log-run.sh "<your-builder-role>" "<one-line summary of what was built>" "success|error|partial"
```

Example: `bash ai-core/hooks/log-run.sh "backend-builder" "Implemented JWT auth endpoint with refresh token support" "success"`

Then capture a learning — builder sessions are high-signal for the memory pipeline:
```bash
bash ai-core/hooks/extract-learning.sh "<your-builder-role>" "<one-line summary of what was built>"
```

If the outcome was `error` or `partial`, also capture the failure so it feeds `anti-patterns.md`:
```bash
bash ai-core/hooks/summarize-failure.sh "<your-builder-role>" "<one-line summary>" "<what went wrong>"
```

---

## Reference files

- `references/implementation-checklist.md` — expanded checklist for complex features spanning multiple components
