---
name: planner
description: Plan feature implementation before any code is written. Use this skill when a user has a feature, change, or task to build and needs it broken down into concrete tasks, sequenced by dependency, and assigned to the right builder roles. Trigger before builder skill calls for any non-trivial feature, when the user says "plan this", "break this down", "what do we need to build", or when a feature touches multiple builder roles. Prevents builders from starting work that should be done in a different order or by a different role.
---

# Planner

Break a feature or change into a concrete, sequenced work plan before any builder writes code. Planning catches dependency problems, role assignment issues, and missing architectural decisions before they become expensive mid-implementation surprises.

---

## Step 1: Load context

Read:
1. **`CLAUDE.md`** — constraints, stack, current phase
2. **`docs/patterns/coding-patterns.md`** — understand what patterns exist and what's established
3. **`docs/architecture/adr/README.md`** — scan for ADRs relevant to the feature area
4. **`docs/components/README.md`** — understand the current component landscape

If `CLAUDE.md` doesn't exist, stop and tell the user to run `/onboard` first.

---

## Step 2: Understand the feature

Ask (or extract from the conversation) the minimal set of questions needed to plan well:

- What is the user-facing outcome? (Not the implementation — what changes from the user's perspective?)
- What data is involved? (New data model? Existing model changed? Read-only?)
- What are the integration points? (Which existing components does this touch or depend on?)
- Is there a deadline or sequencing constraint? (e.g., "backend must be deployed before frontend can go to QA")

Avoid over-interviewing. If the feature is clear from context, proceed.

---

## Step 3: Check for missing architectural decisions

Before planning implementation, ask: **does this feature require a decision that hasn't been made yet?**

Look for signals:
- The feature introduces a new external dependency (→ run `/architect` first to decide which one and why)
- The feature requires a new data model or schema change at significant scale (→ run `/architect` to decide the approach)
- The feature crosses a system boundary that has no ADR governing it (→ run `/architect` first)
- The feature changes how a core cross-cutting concern works (auth, logging, error handling)

If any signal fires: **stop and tell the user** which decision needs to be made via `/architect` before planning can proceed. Do not plan around an unresolved architectural decision.

---

## Step 4: Break into tasks

Decompose the feature into tasks that are:
- **Small enough** to be completed in one session by one builder role
- **Specific enough** that the builder knows exactly what pattern to follow
- **Independently completeable** where possible (minimize blocking dependencies)

For each task:
- One-sentence description of what gets built
- Which **builder role** owns it (`backend-builder`, `frontend-builder`, `mobile-builder`, etc.)
- Which **existing pattern** it follows (from patterns docs) — if none exists, flag it
- **Inputs**: what must exist before this task starts
- **Outputs**: what this task produces that other tasks depend on

---

## Step 5: Sequence the plan

Order tasks by dependency. Show the dependency graph clearly:

```
Task 1 [backend-builder] — Create the API endpoint
  └── Task 2 [frontend-builder] — Connect UI to endpoint  (depends on Task 1)
      └── Task 3 [frontend-builder] — Add error state handling

Task 4 [backend-builder] — Add background job (independent, can run in parallel with Task 2)
```

Highlight:
- Tasks that can run in parallel (different builder roles, no shared dependency)
- Tasks that are blocking (nothing else can start until this is done)
- Tasks that require `/architect` input before starting (flag clearly)

---

## Step 6: Output the plan

Present the plan as a structured document. Ask the user to confirm before builders start.

Format:

```
## Feature: [name]

### Prerequisites
- [Any /architect decisions needed before starting]

### Tasks

**Task 1** · backend-builder
  What: [one sentence]
  Pattern: [pattern name from coding-patterns.md, or "novel — establish first"]
  Outputs: [what this produces]

**Task 2** · frontend-builder  (depends on Task 1)
  What: [one sentence]
  Pattern: [pattern name]
  Inputs: [Task 1's output]
  Outputs: [what this produces]

...

### Parallel tracks
- Track A: Task 1 → Task 2 → Task 3
- Track B: Task 4 (can start immediately, no dependencies)
```

Once the user confirms the plan, builders can start. Each builder should be pointed to their specific task(s) from this plan.
