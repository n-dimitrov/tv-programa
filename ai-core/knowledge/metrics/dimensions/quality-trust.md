# Quality & Trust (Dimension 5 — Weight: 10%)

Measures the reliability and trustworthiness of AI-generated outputs — how often they are accepted without rework, how often they require correction, and whether they introduce defects that escape review. This is the lowest-weighted dimension intentionally: quality is an outcome metric, not an enablement metric. Early-stage teams building their workflow and skill foundations should not be penalized for quality gaps.

See [ADR-0004](../../architecture/adr/ADR-0004-metrics-weights.md) for the rationale behind this weight.

> **Note**: Although Quality & Trust carries only 10% of the composite score, it should be monitored as a standalone health signal regardless of composite score. A team with a high AI Readiness Score but low Quality & Trust has a compounding quality debt that the composite score may not surface clearly.

---

## Sub-Metrics

### AI Acceptance Rate

**Definition**: Percentage of AI sessions with a successful outcome that did not require a rework session within 48 hours. Measures how often the AI's output is accepted as-is or with only minor edits.

**Formula**: `(success_sessions_without_rework / total_success_sessions) × 100`

A rework session is detected as a `run-log.jsonl` entry within 48 hours of a prior success entry whose `task_summary` has >70% keyword overlap with the prior entry, OR whose `task_summary` contains rework keywords (`fix`, `redo`, `revert`, `correct`, `retry`). See [glossary.md](../glossary.md#rework-session).

**Target**: No explicit threshold — track as a trend. Below 70% is a signal that prompts or skills need improvement.

**Data source**: `ai-core/meta/run-log.jsonl` — fields `outcome`, `task_summary`, `timestamp`.

**Collection**: Automated, computed by `ai-core/hooks/compute-metrics.sh`

**Frequency**: Weekly (output: `ai-core/meta/metrics-snapshots/YYYY-MM-DD.json`, field `ai_acceptance_rate`)

**Dimension weight**: 0.40

**Scoring**: Direct percentage mapping. 0–100.

---

### Rework Rate

**Definition**: Percentage of total AI sessions that are classified as rework sessions — sessions that correct, redo, or retry work from a prior session.

**Formula**: `(rework_sessions / total_sessions) × 100`

A rework session is any entry in `run-log.jsonl` whose `task_summary` contains rework keywords (`fix`, `redo`, `revert`, `correct`, `retry`, `again`, `wrong`) or whose `task_summary` has >70% keyword overlap with a prior entry within 48 hours following a non-success outcome. See [glossary.md](../glossary.md#rework-session).

**Target**: No explicit threshold — lower is better. Above 30% indicates systemic quality issues.

**Data source**: `ai-core/meta/run-log.jsonl` — fields `task_summary`, `timestamp`, `outcome`.

**Collection**: Automated, computed by `ai-core/hooks/compute-metrics.sh`

**Frequency**: Weekly (output: `ai-core/meta/metrics-snapshots/YYYY-MM-DD.json`, field `rework_rate`)

**Dimension weight**: 0.35

**Scoring**: Inverted percentage — `100 - rework_rate`. A 0% rework rate scores 100; a 30% rework rate scores 70; a 100% rework rate scores 0.

---

### Defect Escape Rate

**Definition**: Percentage of AI-authored changes that introduced a defect caught *after* the reviewer skill approved the change — in QA or production rather than during code review.

**Formula**: `(post-review_defects_in_AI_sessions / total_AI_sessions_reviewed) × 100`

**Target**: No explicit threshold — lower is better. Above 5% indicates the reviewer skill or reviewer workflow is not catching AI-introduced errors.

**Data source**: Manual, quarterly — the team logs post-review defects that were attributable to AI-authored changes. Count is entered in the quarterly assessment template. Total AI sessions reviewed = `run-log.jsonl` entries where `skill` contains "reviewer".

**Collection**: Manual, quarterly (quarterly-template.md Section 5)

**Frequency**: Quarterly

**Dimension weight**: 0.25

**Scoring**: Inverted percentage — `100 - defect_escape_rate`. A 0% escape rate scores 100; a 5% rate scores 95; a 20% rate scores 80. Capped at 0 (negative scores are not possible).

---

## Dimension Score Formula

```
Quality_Score = 0.40 × AI_Acceptance_Rate
              + 0.35 × (100 - Rework_Rate)
              + 0.25 × (100 - Defect_Escape_Rate)
```

Sub-metric weights sum to 1.0: `0.40 + 0.35 + 0.25 = 1.00`

Note: Rework Rate and Defect Escape Rate are inverted before aggregation — lower raw values produce higher sub-metric scores.

---

## Data Sources Summary

| Sub-metric | Source | Method | Frequency |
|---|---|---|---|
| AI Acceptance Rate | `run-log.jsonl` (outcome + task_summary + timestamp) | Automated | Weekly |
| Rework Rate | `run-log.jsonl` (task_summary keyword + timestamp) | Automated | Weekly |
| Defect Escape Rate | Manual defect log / reviewer session count | Manual | Quarterly |
