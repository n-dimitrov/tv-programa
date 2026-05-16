---
name: aisdlc-promote
description: Promote validated learnings and patterns from aisdlc/memory/ to aisdlc/knowledge/. Use this skill when the reviewer flags entries as #ready-for-promotion, when the user wants to graduate learnings to stable knowledge, or to clean up stale memory entries. Trigger phrases: "promote learnings", "graduate patterns", "clean up memory", "promote to knowledge", "what's ready for promotion".
---

# aisdlc-promote

Move validated insights from `aisdlc/memory/` (the buffer) to `aisdlc/knowledge/` (the permanent record). This is the human-gated step that prevents unvalidated observations from becoming authoritative guidance.

---

## Step 1: Scan memory files

Read all three memory files:

1. **`aisdlc/memory/learnings.md`** — look for entries tagged `#ready-for-promotion`
2. **`aisdlc/memory/patterns.md`** — look for entries with `Status: #ready-for-promotion`
3. **`aisdlc/memory/anti-patterns.md`** — look for entries that reference missing ADRs or reveal architectural constraints

Also read:
4. **`aisdlc/knowledge/patterns/coding-patterns.md`** — understand what's already in stable knowledge (avoid duplicates)
5. **`aisdlc/meta/evolution-log.md`** — understand promotion history

If no entries are ready for promotion, tell the user: "Nothing ready for promotion right now. Entries need 2+ reviewer validations before they qualify. Check back after your next `/aisdlc-reviewer` session."

---

## Step 2: Present candidates

For each promotable entry, show:

```
## Candidates for promotion

### 1. [Learning/Pattern summary]
Source: aisdlc/memory/learnings.md (or patterns.md)
First observed: [date]
Validations: [count and dates]
Proposed destination: aisdlc/knowledge/patterns/coding-patterns.md (or role-specific file)
Action: Add as new pattern section / Extend existing pattern / Create new file

### 2. ...
```

For anti-patterns that reveal missing constraints:
```
### 3. [Anti-pattern summary]
Source: aisdlc/memory/anti-patterns.md
Recurrence: [how many times this failure appeared]
Proposed action: Create ADR via /aisdlc-architect (constraint not yet formalized)
```

Ask the user: "Which of these should I promote? You can approve all, pick specific numbers, or skip any."

---

## Step 3: Execute promotions

For each approved promotion:

**Learnings → Knowledge:**
1. Add the insight to the appropriate `aisdlc/knowledge/patterns/` file with a real code example (if one exists from the original session)
2. Tag the original entry in `aisdlc/memory/learnings.md` as `[Promoted to <target-file> — YYYY-MM-DD]`
3. Append to `aisdlc/meta/evolution-log.md`:
   ```
   [YYYY-MM-DD] Promoted: <summary> → <target-file> | Validations: <count> | Source: memory/learnings.md
   ```

**Patterns → Knowledge:**
1. Move the full pattern (description + code example) to `aisdlc/knowledge/patterns/coding-patterns.md` or the appropriate role-specific file
2. Update the entry in `aisdlc/memory/patterns.md` to `Status: [Promoted to knowledge/patterns/... — YYYY-MM-DD]`
3. Append to `aisdlc/meta/evolution-log.md`

**Anti-patterns → ADR:**
1. Tell the user: "This anti-pattern suggests a missing architectural constraint. Run `/aisdlc-architect` to formalize it as an ADR."
2. Add `[See ADR-XXXX]` annotation to the anti-pattern entry once the ADR exists

---

## Step 4: Clean up expired entries

Scan `aisdlc/memory/learnings.md` for entries tagged `[Promoted ...]` that are older than 30 days. Remove them from the file (they've served their purpose — the insight lives in knowledge now).

Report: "Cleaned up X expired entries from learnings.md."

---

## Final step — always do this last

```bash
bash aisdlc/hooks/log-run.sh "aisdlc-promote" "Promoted N learnings, M patterns. Cleaned K expired entries." "success|error|partial"
```
