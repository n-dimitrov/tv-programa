# Implementation Checklist — Extended

Use this when a feature is complex (spans multiple components, introduces new infrastructure, or requires careful sequencing). The SKILL.md has a quick checklist for simple features; this one is for cases where more rigor is warranted.

---

## Before starting

- [ ] Read `CLAUDE.md` and `docs/patterns/coding-patterns.md` (non-negotiable)
- [ ] Read the ADR index (`docs/architecture/adr/README.md`) and any relevant ADRs
- [ ] Read the component doc (`docs/components/[name].md`) for any component you'll significantly modify
- [ ] If touching a shared module: understand who else depends on it (check the component doc's "Depended on by" section)
- [ ] If adding a new dependency: verify it's consistent with the project's dependency philosophy (check CLAUDE.md or relevant ADR)

---

## Planning

- [ ] Written out files to create and files to modify
- [ ] Traced data flow end-to-end (entry point → business logic → persistence → response)
- [ ] Identified which existing patterns each part of the implementation will follow
- [ ] Flagged anything that has no existing pattern (so you can grep for closest analogs)
- [ ] User has confirmed the plan

---

## During implementation

### Error handling
- [ ] Errors propagated using the project's established pattern (not mixed patterns)
- [ ] User-facing error messages match the project's tone and format
- [ ] No swallowed errors (errors logged and/or re-raised, not silently ignored)
- [ ] HTTP status codes match what the project uses for similar error conditions

### Data access
- [ ] Database access follows the project's data access pattern (ORM / repository / raw SQL — not mixed)
- [ ] Queries are safe against injection (parameterized queries, ORM escaping)
- [ ] Transaction boundaries are correct — writes that should be atomic are wrapped together
- [ ] No N+1 queries introduced (check for loops that query inside iterations)

### Auth and security
- [ ] Auth checks happen at the right layer (check existing patterns — don't add auth in a place that bypasses the normal auth boundary)
- [ ] User input is validated at the system boundary (not deep in business logic)
- [ ] Sensitive data is not logged
- [ ] New endpoints follow the project's access control model

### Naming and structure
- [ ] File, function, and variable names follow the project's conventions (check patterns doc)
- [ ] New files live in the right directories (check existing file organization)
- [ ] No deep nesting or complexity beyond what's already common in this codebase

### Testing
- [ ] Tests written at the same level as the surrounding codebase (unit / integration / e2e — match the project)
- [ ] Test file naming matches the project's convention
- [ ] Test coverage is proportional to risk (complex logic gets more tests; simple pass-through code needs fewer)
- [ ] No tests that will be brittle or require frequent maintenance (avoid testing implementation details)

---

## After implementing

### Documentation updates

- [ ] **`docs/patterns/coding-patterns.md`**: Updated if a new pattern was introduced — include a real code snippet
- [ ] **`docs/components/[name].md`**: Updated if a component's public interface or behavior changed significantly
- [ ] **`docs/architecture/overview.md`**: Updated if the topology or data flow changed
- [ ] **ADR**: Written if the implementation introduced a decision with lasting structural implications

### Code review readiness

- [ ] Code is self-explanatory or has comments explaining *why* (not *what*)
- [ ] No TODO comments without associated issues or explicit deferral rationale
- [ ] No leftover debug code, console.logs, or commented-out blocks

---

## Signs you should pause and consult the user

Stop and check in if:
- You're about to introduce a library that's not already in the project
- You're about to create a new architectural layer (a new type of directory or module that doesn't exist)
- You realize the feature as described conflicts with an existing ADR
- You discover the feature requires changing a shared module that many things depend on
- The existing patterns are ambiguous or contradictory and you have to choose between them

In these cases, explain what you found and what decision needs to be made before proceeding.
