---
name: reviewer
description: Review code changes against established patterns, ADRs, and project conventions. Use this skill after a builder skill has implemented changes, when the user asks for a code review, wants to check if something follows patterns, or needs to verify architectural compliance before merging. Trigger whenever code has been written and needs validation against the documented standards. Catches pattern drift, architectural violations, security boundary issues, and missing doc updates before they reach production.
---

# Reviewer

Validate that what was built matches how this codebase is supposed to work. The reviewer's job is to surface deviations from established patterns and ADRs — not to rewrite code, but to give the builder precise, actionable feedback so they can correct course.

---

## Step 1: Load context

Read:
1. **`CLAUDE.md`** — constraints, stack, critical facts
2. **`docs/patterns/coding-patterns.md`** — the standard every builder is expected to follow
3. **Role-specific pattern file** — `docs/patterns/<role>-patterns.md` if it exists for the role that built this code
4. **`docs/architecture/adr/README.md`** — scan for ADRs relevant to the changed area
5. Load specific ADRs that govern the code being reviewed

If pattern docs are missing or sparse, note that in the review — it means the team hasn't established clear expectations yet, which is itself a risk.

---

## Step 2: Understand what was built

Read the changed files. Understand:
- What feature or fix does this implement?
- Which components does it touch?
- What data does it create, read, update, or delete?
- What are the entry and exit points?

Do not review code you haven't read. Read all changed files before forming any opinion.

---

## Step 3: Check pattern adherence

For each changed file, check:

**File organization**
- Is the file in the right directory per the project's structure? (Check existing structure, not conventions you assume.)
- Is the naming consistent with how similar files are named?

**Error handling**
- Does the code handle errors the same way as the rest of the codebase? (Same propagation style, same wrapping, same surface to callers.)
- Are errors swallowed anywhere? (Caught but not logged or re-raised.)

**Data access**
- Is data accessed through the project's established data access layer? (No raw SQL outside the repository layer, no ORM calls outside the service layer — whatever the pattern is.)
- Are there N+1 queries hidden in loops?

**Logging**
- Does logging follow the format and level conventions? (Check `coding-patterns.md` for what INFO/WARN/ERROR mean in this project.)
- Is sensitive data excluded from logs?

**Configuration**
- Are new config values accessed through the established config pattern? (Not hardcoded, not read from env directly if the project uses a config wrapper.)

**Auth**
- Are auth checks at the right boundary? (Not deeper in business logic if the pattern is to check at the handler level.)
- Does the code trust any input it shouldn't?

---

## Step 4: Check architectural compliance

For each relevant ADR:
- Does the code violate the decision documented in the ADR?
- Does the code introduce a dependency or pattern that an ADR explicitly ruled out?

Flag any violation clearly: name the ADR, quote the relevant constraint, and describe what in the code conflicts with it.

---

## Step 5: Check for common issues

Regardless of project-specific patterns, check for:

- **Security**: User input validated at system boundary? No injection vectors? Sensitive data not logged or returned in API responses?
- **New libraries**: Did the builder introduce a library not already in the project? (Requires explicit approval per the builder skill contract.)
- **New architectural layers**: Did the builder create a new type of directory or abstraction? (Requires an ADR.)
- **Unnecessary abstraction**: Is there a helper, utility, or abstraction built for a single use case? (Should be just the code, per framework guidelines.)

---

## Step 6: Deliver structured feedback

Organize findings by severity:

**Blocking** — must be fixed before this can be merged:
- ADR violations
- Security issues
- Pattern deviations that will cause bugs or inconsistency

**Warning** — should be addressed, can be deferred with justification:
- Minor pattern inconsistencies that don't cause bugs
- Missing or incomplete doc updates
- Code that works but makes the codebase harder to understand

**Suggestion** — optional improvements:
- Clarity improvements
- Minor naming suggestions

For each finding:
```
[BLOCKING] src/handlers/payment.go:L45
Error is swallowed without logging. All errors in this layer are wrapped with
fmt.Errorf("context: %w", err) per coding-patterns.md#error-handling.
Fix: wrap and return, or log and handle explicitly.
```

End the review with a summary: "X blocking, Y warnings, Z suggestions." If there are no blockers, say so explicitly.

---

## Step 7: Update docs if warranted

If the reviewed code introduced a **genuinely new pattern** that is correct and should be followed in future:
- Add it to the appropriate patterns doc with a real code example
- Note it in the review: "This is a new pattern — I've added it to docs/patterns/coding-patterns.md so future builders can follow it."

If the reviewed code reveals that an **existing pattern doc is wrong or outdated**:
- Update the doc
- Note it in the review: "The pattern doc for X was incorrect — updated to match what the codebase actually does."

---

## Reference files

- `references/review-checklist.md` — expanded checklist for security-sensitive or compliance-relevant reviews
