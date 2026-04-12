# ADR Template

Use this exact structure when generating an ADR file. Replace all bracketed placeholders with specific content. No placeholder text should remain in the output.

---

```markdown
# ADR-XXXX: [Short, noun-phrase title describing the decision]

**Date**: YYYY-MM-DD
**Status**: Accepted
**Deciders**: [Who participated in this decision — names, roles, or "solo"]

---

## Context

[2-4 paragraphs describing the situation that forced this decision. Include:]
- What problem prompted this decision
- What forces are in play (technical, organizational, timeline, etc.)
- What constraints bound the solution space
- What would happen if no decision were made

This section should give a future reader enough context to understand why the decision mattered at the time, even if the codebase has evolved.

---

## Decision

**[One sentence stating exactly what was decided.]**

[2-4 paragraphs explaining the rationale. Connect the decision back to the forces in Context. Explain what made this option better than the alternatives for this specific project — not in general, but given the constraints listed above.]

---

## Consequences

### Positive
- [Concrete benefit 1 — be specific about what becomes easier or possible]
- [Concrete benefit 2]
- [...]

### Negative / Trade-offs
- [Concrete cost 1 — what becomes harder, slower, or more expensive]
- [Concrete cost 2]
- [...]

### Risks and mitigations
- **Risk**: [What could go wrong]
  **Mitigation**: [How we reduce or accept this risk]
- [...]

---

## Options considered

### Option A: [Name of chosen option]
[Brief description. Note why it was chosen.]

### Option B: [Name]
[Brief description. Note the specific reason it was rejected for this project.]

### Option C: [Name] _(if applicable)_
[Brief description. Note the specific reason it was rejected.]

---

## Revisit triggers

This decision should be revisited if:
- [Specific condition 1 — e.g., "Traffic exceeds X requests/sec and query latency exceeds Y ms"]
- [Specific condition 2 — e.g., "The team grows beyond N engineers and coordination overhead becomes a bottleneck"]
- [Specific condition 3 — e.g., "The vendor discontinues the service or changes pricing model significantly"]
```

---

## Notes for the generator

- **The decision sentence** should be unambiguous — it should be impossible to read it and not know what was decided
- **Consequences** are the most important section for future reference — be honest about trade-offs
- **Options considered** should include real alternatives that were seriously considered, not strawmen
- **Revisit triggers** make this document useful over time — vague ones ("when requirements change") are useless
- Status values: `Proposed` (under discussion), `Accepted` (active decision), `Deprecated` (no longer followed), `Superseded by ADR-XXXX`
