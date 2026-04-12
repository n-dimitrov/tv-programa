---
name: aisdlc-reviewer
description: Review code changes against established patterns, ADRs, and project conventions. Use this skill after a builder skill has implemented changes, when the user asks for a code review, wants to check if something follows patterns, or needs to verify architectural compliance before merging. Trigger whenever code has been written and needs validation against the documented standards. Catches pattern drift, architectural violations, security boundary issues, and missing doc updates before they reach production.
---

# Reviewer

Validate that what was built matches how this codebase is supposed to work. The reviewer's job is to surface deviations from established patterns and ADRs — not to rewrite code, but to give the builder precise, actionable feedback so they can correct course.

---

## Step 1: Load context

Read:
1. **`CLAUDE.md`** — constraints, stack, critical facts
2. **`ai-core/knowledge/patterns/coding-patterns.md`** — the standard every builder is expected to follow
3. **Role-specific pattern file** — `ai-core/knowledge/patterns/<role>-patterns.md` if it exists for the role that built this code
4. **`ai-core/memory/patterns.md`** — emergent patterns from recent sessions that may not yet be in the knowledge files
5. **`ai-core/memory/anti-patterns.md`** — known failure modes; check if any were repeated in the code being reviewed
6. **`ai-core/knowledge/architecture/adr/README.md`** — scan for ADRs relevant to the changed area
7. Load specific ADRs that govern the code being reviewed

**If files are missing, handle gracefully:**
- **`CLAUDE.md` missing** → Warn but proceed: "No CLAUDE.md found — reviewing without project context. Run `/aisdlc-onboard` to establish baseline." You can still check code quality and security.
- **Pattern docs missing or sparse** → Note in the review: "No established patterns documented — can't verify adherence. Recommend running `/aisdlc-onboard` to extract patterns." Focus review on security, correctness, and obvious anti-patterns.
- **Memory files missing** → Proceed. No prior memory to check against.

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

## Step 7: Capture memory signals

**If the reviewed code introduced a genuinely new correct pattern:**
- Append a validation entry to `ai-core/memory/learnings.md`:
  ```
  [YYYY-MM-DD] reviewer — Validated: <pattern name>. Used correctly in <file>. #candidate-for-promotion
  ```

**If the reviewed code repeated a known failure mode from `ai-core/memory/anti-patterns.md`:**
- Flag it as a blocking finding (the builder should have checked anti-patterns)

**If the reviewed code revealed a new failure mode not yet captured:**
- Add it to `ai-core/memory/anti-patterns.md`:
  ```
  [YYYY-MM-DD] FAILED: <what was done wrong> — <why it's wrong> [Session: reviewer / <task>]
  ```

**If an existing pattern doc is wrong or outdated:**
- Update `ai-core/knowledge/patterns/coding-patterns.md` (or the role-specific file)
- Note it in the review: "The pattern doc for X was incorrect — updated to match what the codebase actually does."

**Promotion tagging:**
Scan `ai-core/memory/learnings.md` for entries tagged `#candidate-for-promotion`. If any has been validated 2+ times (multiple `[Validated ...]` annotations or repeated appearance across sessions), retag it `#ready-for-promotion`.

If any entries were retagged, tell the user: "X entries in memory/learnings.md are ready for promotion — run `/aisdlc-promote` when convenient."

> **Note:** The reviewer does not perform promotions itself. Promotion (moving memory to stable knowledge) is handled by `/aisdlc-promote` to keep the reviewer focused on code quality.

---

## Final step — always do this last

Before closing the session, log it:
```bash
bash ai-core/hooks/log-run.sh "aisdlc-reviewer" "<one-line summary of what was reviewed and outcome>" "success|error|partial"
```

Example: `bash ai-core/hooks/log-run.sh "aisdlc-reviewer" "Reviewed auth PR — approved with 2 pattern violations fixed" "success"`

Then capture a learning — reviewer sessions surface pattern violations and quality signals:
```bash
bash ai-core/hooks/extract-learning.sh "aisdlc-reviewer" "<one-line summary of what was reviewed and outcome>"
```

If the outcome was `error` or `partial`, also capture the failure so it feeds `anti-patterns.md`:
```bash
bash ai-core/hooks/summarize-failure.sh "aisdlc-reviewer" "<one-line summary>" "<what went wrong>"
```

---

## Reference files

None. The review steps above are self-contained. For security-sensitive or compliance-relevant reviews, load the relevant ADRs and any compliance docs from `ai-core/knowledge/`.
