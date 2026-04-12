# Workflow Readiness (Dimension 1 — Weight: 30%)

Measures whether the team's development workflows are defined, documented, and structured enough for AI to operate within them reliably. This is the highest-weighted dimension because workflows are the prerequisite layer — skills and context have no structure to attach to without them.

See [ADR-0004](../../architecture/adr/ADR-0004-metrics-weights.md) for the rationale behind this weight.

---

## Sub-Metrics

### Workflow Definition Coverage

**Definition**: Percentage of the team's recurring development workflow types that have a documented, step-by-step definition with explicit entry criteria, exit criteria, and assigned skill or role per step.

**Formula**: `(workflows_with_documented_definition / total_identified_workflow_types) × 100`

**Target**: >90%

**Data source**: Manual count — list all recurring workflow types your team executes (feature development, bug fix, code review, deployment, hotfix, etc.) and count how many have a written definition with the required elements.

**Collection**: Manual, quarterly

**Frequency**: Quarterly (quarterly-template.md Section 1)

**Dimension weight**: 0.30

**Scoring**: Direct percentage mapping. 90% maps to ~85 on a 0–100 scale; 100% = 100.

---

### Workflow Automation Ratio

**Definition**: Fraction of total workflow steps across all defined workflows that are executed by a Claude Code skill or registered hook rather than manual human action.

**Formula**: `(automated_steps / total_defined_steps_across_all_workflows) × 100`

**Target**: No explicit threshold — higher is better. Track as a trend metric quarter-over-quarter.

**Data source**: Manual count — for each documented workflow, count total steps and count those executed by a skill or hook. Cross-reference with `run-log.jsonl` session count as a sanity check.

**Collection**: Manual, quarterly (with automated sanity check)

**Frequency**: Quarterly (quarterly-template.md Section 1)

**Dimension weight**: 0.25

**Scoring**: Direct percentage mapping. 0–100.

---

### Pull Readiness Score

**Definition**: The percentage of AI sessions that produce a named, successful output with a task summary — indicating the work is traceable and ready for review. See [glossary.md](../glossary.md#pull-readiness-score) for the full definition.

**Formula**: `(sessions where outcome == "success" AND task_summary != "") / total_sessions × 100`

**Target**: >80%

**Data source**: `ai-core/meta/run-log.jsonl` — fields `outcome` and `task_summary`.

**Collection**: Automated, computed by `ai-core/hooks/compute-metrics.sh`

**Frequency**: Weekly (output: `ai-core/meta/metrics-snapshots/YYYY-MM-DD.json`, field `pull_readiness_proxy`)

**Dimension weight**: 0.25

**Scoring**: Direct percentage mapping. 80% maps to 80; 100% = 100.

---

### WIP Stability

**Definition**: The proportion of started AI sessions that reach a successful outcome without being abandoned, errored, or requiring a rework session within the same period. Inverse of churn rate.

**Formula**: `(sessions where outcome == "success") / total_sessions × 100`

**Target**: No explicit threshold — higher is better. A value below 60% signals significant instability.

**Data source**: `ai-core/meta/run-log.jsonl` — field `outcome`.

**Collection**: Automated, computed by `ai-core/hooks/compute-metrics.sh`

**Frequency**: Weekly (output: `ai-core/meta/metrics-snapshots/YYYY-MM-DD.json`, field `wip_stability`)

**Dimension weight**: 0.20

**Scoring**: Direct percentage mapping. 0–100.

---

## Dimension Score Formula

```
Workflow_Score = 0.30 × Workflow_Definition_Coverage
              + 0.25 × Workflow_Automation_Ratio
              + 0.25 × Pull_Readiness_Score
              + 0.20 × WIP_Stability
```

Sub-metric weights sum to 1.0: `0.30 + 0.25 + 0.25 + 0.20 = 1.00`

---

## Data Sources Summary

| Sub-metric | Source | Method | Frequency |
|---|---|---|---|
| Workflow Definition Coverage | Manual count | Manual | Quarterly |
| Workflow Automation Ratio | Manual count + run-log sanity | Manual | Quarterly |
| Pull Readiness Score | `run-log.jsonl` | Automated | Weekly |
| WIP Stability | `run-log.jsonl` | Automated | Weekly |

Missing data handling: If a manual metric has no data (first quarter assessment), score = 0 and flag `[INSUFFICIENT_DATA]` in the quarterly template. Automated metrics always have a value if `run-log.jsonl` has at least one entry.
