---
name: aisdlc-architect
description: Make architectural decisions and write ADRs (Architecture Decision Records). Use this skill when a user needs to choose between technical approaches, evaluate design options, make a decision about technology, data modeling, system boundaries, API design, or infrastructure — and wants the decision documented. Trigger when the user asks to "architect" something, "decide" between approaches, "write an ADR", "evaluate options", or when a decision will have lasting structural implications for the codebase.
---

# aisdlc-architect

Help make a well-reasoned architectural decision and document it as an ADR. The output is a concrete recommendation plus a written record that future contributors (human and AI) can load when working in the affected area.

The value of this skill is **project-specific reasoning** — generic pros/cons that apply to any project are useless. Every option evaluation must be grounded in the constraints, existing decisions, and patterns of this specific codebase.

---

## Step 1: Load context

Before anything else, read:

1. `CLAUDE.md` — understand the project's constraints, stack, current phase
2. `ai-core/knowledge/architecture/adr/README.md` — read the ADR index to understand decisions already made (load only this index, not every ADR)
3. Any specific ADRs that are clearly relevant to this decision (the index will tell you which)
4. `ai-core/knowledge/architecture/overview.md` if the decision touches system topology
5. `ai-core/memory/anti-patterns.md` — check for failed approaches relevant to this decision area before framing options

**If files are missing, handle gracefully:**
- **`CLAUDE.md` missing** → Stop. Tell the user: "Run `/aisdlc-onboard` first — making architectural decisions without project context risks contradicting what's already built."
- **ADR index missing** → Proceed but warn: "No ADR index found. I'll create `ai-core/knowledge/architecture/adr/README.md` when writing this ADR."
- **`ai-core/memory/anti-patterns.md` missing** → Proceed. No anti-patterns recorded yet.
- **`ai-core/knowledge/architecture/overview.md` missing** → Proceed if the decision doesn't require topology context.

---

## Step 2: Frame the decision

Before evaluating options, articulate these to the user (you can draft them and ask for confirmation):

- **The decision**: What specifically needs to be decided? (One sentence)
- **Why now**: What is forcing this decision today? (technical debt, new feature, scale, etc.)
- **Constraints**: What is non-negotiable? (existing tech stack, team skills, budget, compliance, timeline)
- **Success criteria**: How will you know this decision was right in 6 months?
- **Time horizon**: Is this reversible? (Low reversibility = more deliberation needed)

Getting constraints wrong is the most common failure mode. A decision that ignores real constraints is just creative writing.

---

## Step 3: Enumerate 2-4 options

For each option, provide:

**Name + one-line summary**

**How it fits this project** (specific, not generic):
- What existing patterns or infrastructure does it build on?
- What does it require changing that is already in place?
- How does it interact with [specific component/ADR from context]?

**Trade-offs in this context**:
- What does it make easier? (with concrete examples from this codebase)
- What does it make harder or impossible? (again, concrete)
- What does the team gain vs. give up?

**Risks specific to this project**:
- What could go wrong given the existing constraints?
- What would cause you to regret this choice?

Read `references/decision-frameworks.md` for structured frameworks to apply when options are hard to compare.

---

## Step 4: Give a concrete recommendation

State the recommendation clearly: "I recommend Option X because..."

The rationale must connect to the project's specific constraints and success criteria from Step 2. Do not hedge into "it depends" — that's the user's job if they disagree. Your job is to make the best call given the information available and say so directly.

If the decision is genuinely uncertain because you're missing information, say exactly what information would change the recommendation and ask for it before proceeding.

---

## Step 5: Get confirmation before writing the ADR

Summarize the decision and ask: "Does this match your intent? Any constraints I've missed or options I should evaluate before writing the ADR?"

Wait for confirmation. Don't write the ADR until the user agrees with the decision.

---

## Step 6: Generate the ADR and update docs

**Determine the next ADR number**: Read `ai-core/knowledge/architecture/adr/README.md` — use the next sequential number after the highest one listed.

**Create the file**: `ai-core/knowledge/architecture/adr/ADR-XXXX-short-name.md`

Use the template in `references/adr-template.md`. Fill every section with specifics — no placeholder text. Options that were considered but not chosen go in the "Options considered" section with a brief note on why they were rejected.

**After writing the ADR:**

1. **Update the ADR index** (`ai-core/knowledge/architecture/adr/README.md`): Add a row to the table with the new ADR number, title, status (Accepted), and date.

2. **Update `ai-core/knowledge/architecture/overview.md`**: If the decision changes the topology, data flow, or key boundaries described there, update the relevant section.

3. **Update component docs**: If the decision significantly changes how a component works, update its `ai-core/knowledge/components/[name].md` and add a reference to the new ADR.

4. **Check memory for promotable learnings**: Scan `ai-core/memory/learnings.md` for entries relevant to this decision. If any learning was effectively resolved by this ADR, annotate it: `[Promoted to ADR-XXXX — {date}]`.

---

## Final step — always do this last

Before closing the session, log it:
```bash
bash ai-core/hooks/log-run.sh "aisdlc-architect" "<one-line summary of the decision made>" "success|error|partial"
```

Example: `bash ai-core/hooks/log-run.sh "aisdlc-architect" "Chose JWT over sessions for stateless auth" "success"`

If the outcome was `error` or `partial`, also capture the failure so it feeds `anti-patterns.md`:
```bash
bash ai-core/hooks/summarize-failure.sh "aisdlc-architect" "<one-line summary>" "<what went wrong>"
```

---

## Reference files

- `references/adr-template.md` — the ADR file format to use
- `references/decision-frameworks.md` — structured approaches for hard tradeoff analysis (use when options are genuinely close)
