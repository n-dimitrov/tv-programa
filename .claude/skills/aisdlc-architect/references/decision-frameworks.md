# Decision Frameworks

Structured approaches for architectural decisions where options are genuinely close or the trade-offs are hard to articulate. Use these when Step 3 of the aisdlc-context-architect workflow isn't yielding clear differentiation.

---

## When to use a framework

Use a framework when:
- Two options seem roughly equivalent and you can't articulate why one is better
- The decision involves multiple stakeholders with different priorities
- The trade-offs span multiple dimensions (performance, cost, maintainability, team skill)
- The user is stuck and needs a structured way to think through the options

Do NOT use a framework to avoid making a recommendation. The goal is still a concrete recommendation — frameworks just help you get there.

---

## Framework 1: Weighted Criteria Matrix

Good for: Multi-dimensional trade-offs with clear success criteria.

**Steps:**

1. List the 4-6 criteria that matter most for this specific decision (from the constraints and success criteria in Step 2)
2. Assign weights (must sum to 100%): e.g., Performance 30%, Maintainability 25%, Cost 20%, Team familiarity 15%, Migration risk 10%
3. Score each option 1-5 on each criterion
4. Multiply score × weight for each cell; sum across criteria for the total

**Example:**

| Criterion | Weight | Option A | Option B | Option C |
|---|---|---|---|---|
| Query performance | 30% | 5 → 1.5 | 3 → 0.9 | 4 → 1.2 |
| Operational complexity | 25% | 2 → 0.5 | 4 → 1.0 | 3 → 0.75 |
| Ecosystem maturity | 20% | 5 → 1.0 | 4 → 0.8 | 2 → 0.4 |
| Team familiarity | 15% | 4 → 0.6 | 2 → 0.3 | 3 → 0.45 |
| Migration effort | 10% | 2 → 0.2 | 4 → 0.4 | 3 → 0.3 |
| **Total** | | **3.8** | **3.4** | **3.1** |

Present the matrix to the user and explain the weights chosen. The weights are the most important part — if the user disagrees with them, recalculate.

---

## Framework 2: Reversibility Analysis

Good for: Decisions where you're uncertain and the cost of being wrong varies.

Map each option on two axes:
- **Reversibility**: How easy is it to undo this in 6-12 months? (Easy / Hard / Near-impossible)
- **Confidence**: How confident are you this is the right choice? (High / Medium / Low)

| | High confidence | Medium confidence | Low confidence |
|---|---|---|---|
| Easy to reverse | Choose it | Choose it | Choose it — learn fast |
| Hard to reverse | Choose it | Get more info first | Pause — de-risk first |
| Near-impossible | Choose it | Get much more info | Don't decide yet |

For near-impossible-to-reverse decisions with medium/low confidence: identify the cheapest way to increase confidence before committing (a prototype, a spike, a pilot with real traffic).

---

## Framework 3: Two-Way vs. One-Way Door

Inspired by Jeff Bezos's framework. Simpler than Framework 2.

- **Two-way door**: The decision can be undone at reasonable cost. Default to moving fast, making the choice, and revisiting if it's wrong.
- **One-way door**: The decision is effectively irreversible (data migration, public API commitment, major vendor lock-in). Slow down, involve more stakeholders, document more carefully.

Most architectural decisions are two-way doors dressed up as one-way doors. Ask: "What would it actually take to undo this in 12 months?" If the answer is "a week of work," it's a two-way door.

---

## Framework 4: "Regret Minimization" for Long-Horizon Decisions

Good for: Technology or platform choices with 3-5+ year implications.

For each option, ask: "In 5 years, under what circumstances would I most regret this choice?"

Write out the regret scenario for each option:
- **Option A regret scenario**: "We chose X, the ecosystem stagnated, and we're stuck maintaining a deprecated dependency while the rest of the industry moved on."
- **Option B regret scenario**: "We built our own Y, underestimated the maintenance burden, and it became a distraction from the actual product."

Then: which regret scenario is most likely? Which is most painful? The option whose regret scenario is both least likely and least painful is the safer long-term bet.

---

## Framework 5: Staffing the Decision

Good for: Decisions where team skills and hiring are constraints.

Ask:
1. Who on the current team can operate this well today? (not learn it — operate it right now)
2. If that person leaves, how hard is it to replace them for this specific technology?
3. What does the hiring market look like for this skill?
4. Is this a technology the team wants to grow in, or a means to an end?

This framework often changes conclusions from "technically optimal" to "sustainably good." A technically inferior choice that the team owns deeply often outperforms a technically superior choice that only one person understands.

---

## Notes on using frameworks in the aisdlc-context-architect workflow

- Present the framework *and* your recommendation. Don't hide behind the framework — use it to justify the recommendation.
- If the framework contradicts your intuition, dig into why. Sometimes intuition is picking up on a factor you haven't articulated yet.
- Keep the framework output in the ADR's "Options considered" section so future readers can see the analysis.
