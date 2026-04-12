# AI Readiness Metrics Framework

Measurable framework for assessing how ready a team is to adopt and scale AI-driven (agentic) software development. The framework covers five dimensions, produces a composite 0–100 score, and maps to three maturity levels.

**Core principle**: AI readiness is not about tools — it is about structured workflows, reusable skills, and high-quality context.

For the full background and the original skeleton that prompted this operationalization, see [AI_Readiness_Metrics_Framework.md](../../../AI_Readiness_Metrics_Framework.md) at the repo root.

---

## Composite Score Formula

```
AI Readiness Score = 0.30 × Workflow
                   + 0.25 × Skills
                   + 0.20 × Context
                   + 0.15 × Adoption
                   + 0.10 × Quality
```

Each dimension score is 0–100. The composite score is 0–100 rounded to one decimal place.

Weight rationale: see [ADR-0004](../architecture/adr/ADR-0004-metrics-weights.md).

---

## Maturity Levels

| Score | Level | Label | Interpretation |
|---|---|---|---|
| 0–39 | L1 | Foundational | Ad-hoc AI use; workflows undefined or undocumented; skills not reusable |
| 40–69 | L2 | Agentic | Structured workflows; partial skill and context coverage; AI is used regularly but not end-to-end |
| 70–100 | L3 | Autonomous | Full lifecycle skill coverage; machine-readable context; AI executes end-to-end with minimal human intervention |

---

## Dimension Index

| Dimension | Weight | File | Key signal |
|---|---|---|---|
| [Workflow Readiness](dimensions/workflow-readiness.md) | 30% | `dimensions/workflow-readiness.md` | Are workflows defined and automatable? |
| [Skills Readiness](dimensions/skills-readiness.md) | 25% | `dimensions/skills-readiness.md` | Does the team have reusable skills covering their task types? |
| [Context Readiness](dimensions/context-readiness.md) | 20% | `dimensions/context-readiness.md` | Is project knowledge documented and machine-readable? |
| [AI Adoption](dimensions/ai-adoption.md) | 15% | `dimensions/ai-adoption.md` | How broadly and frequently is AI used in daily work? |
| [Quality & Trust](dimensions/quality-trust.md) | 10% | `dimensions/quality-trust.md` | How reliable and accepted are AI outputs? |

---

## Data Source Index

| Data source | Feeds | Update frequency |
|---|---|---|
| `ai-core/meta/run-log.jsonl` | Skills Reuse Rate, WIP Stability, Pull Readiness, AI Execution Autonomy, AI Usage Rate, AI Contribution Ratio, Skill Invocation Frequency, AI Acceptance Rate, Rework Rate, Token Usage, Cost, Duration | Per-session (written by `log-run.sh`) |
| `ai-core/meta/.session-metrics.json` | Transient per-session token/cost/duration (read by `log-run.sh`, then deleted) | Per-response (written by `capture-session-metrics.sh` status line) |
| `ai-core/meta/metrics-snapshots/` | Aggregated weekly automated metrics + usage metrics | Weekly (written by `compute-metrics.sh`) |
| `.claude/skills/` directory | Agentic Skills Coverage, Documentation Coverage | Quarterly (manual count) |
| `ai-core/knowledge/architecture/adr/` | Specification Quality Score, Documentation Coverage | Quarterly (manual rubric) |
| Manual quarterly assessment | Workflow Definition Coverage, Workflow Automation Ratio, End-to-End Skill Capability, Context Retrieval Success Rate, Defect Escape Rate, team size | Quarterly (quarterly-template.md) |

---

## `run-log.jsonl` Schema

Each line is a JSON object with the following fields. Written by `ai-core/hooks/log-run.sh`.

| Field | Type | Source | Description |
|---|---|---|---|
| `timestamp` | string | `log-run.sh` | ISO 8601 UTC timestamp of session end |
| `skill` | string | skill argument | Skill name (e.g. `"aisdlc-builder"`) or `"unknown"` |
| `task_summary` | string | skill argument | One-line description of what was done |
| `files_changed` | string | `git diff` | Comma-separated list of changed files, or `""` |
| `outcome` | string | skill argument | `"success"`, `"error"`, or `"partial"` |
| `input_tokens` | number | status line | Cumulative input tokens for the session |
| `output_tokens` | number | status line | Cumulative output tokens for the session |
| `cost_usd` | number | status line | Total API cost in USD |
| `duration_ms` | number | status line | Wall-clock session duration in milliseconds |
| `api_duration_ms` | number | status line | Time spent waiting for API responses in milliseconds |
| `model` | string | status line | Model display name (e.g. `"Claude Sonnet 4.5"`) |

Token/cost/duration fields are `0` when the status line (`capture-session-metrics.sh`) is not configured.

Example entry:
```json
{"timestamp":"2026-04-05T16:00:48Z","skill":"aisdlc-onboard","task_summary":"Generated CLAUDE.md and ai-core/ for payments-service","files_changed":"CLAUDE.md,ai-core/knowledge/domain.md","outcome":"success","input_tokens":45200,"output_tokens":12300,"cost_usd":0.0234,"duration_ms":180000,"api_duration_ms":45000,"model":"Claude Sonnet 4.5"}
```

---

## Aggregation Rules

### Sub-metric scores
Each sub-metric produces a 0–100 score:
- **Percentage-based** metrics: score = raw percentage value
- **Ratio-based** metrics: score = ratio × 100
- **Inverted metrics** (Rework Rate, Defect Escape Rate): score = 100 − raw percentage
- **Boolean metrics** (End-to-End Skill Capability): Yes = 100, No = 0
- **Normalized count** metrics (Skill Invocation Frequency): `min(value / cap, 1.0) × 100` with cap = 10 invocations/person/week

### Dimension score
Each dimension score is the weighted average of its sub-metric scores using the weights defined in the dimension file. Sub-metric weights within each dimension always sum to 1.0.

Example (Workflow Readiness):
```
Workflow = 0.30 × Workflow_Definition_Coverage
         + 0.25 × Workflow_Automation_Ratio
         + 0.25 × Pull_Readiness_Score
         + 0.20 × WIP_Stability
```

### Missing data
- If a sub-metric has no data for the current period (e.g., first-ever assessment), use 0 and flag `[INSUFFICIENT_DATA]` in the assessment output.
- If prior quarter data exists, use it as a fallback and flag `[USING_PRIOR_QUARTER]`.

### Hybrid metric disagreement
When a hybrid metric's automated signal and manual audit differ by more than 15 points, flag `[DISCREPANCY: auto=X, manual=Y]` in the quarterly assessment. Use the manual value as the authoritative score.

### Rounding
Dimension scores and the final composite score are rounded to one decimal place.

---

## Assessment Cadence

| Cadence | Action | Tool |
|---|---|---|
| Per-session | Log session to `run-log.jsonl` | `ai-core/hooks/log-run.sh` (called by each skill, not a hook) |
| Weekly | Compute automated metrics snapshot | `ai-core/hooks/compute-metrics.sh` |
| Quarterly | Complete self-assessment for all manual/hybrid metrics | `ai-core/knowledge/metrics/assessment/quarterly-template.md` |
| Quarterly | Compute final AI Readiness Score from automated + manual inputs | `assessment/quarterly-template.md` Score Computation section |

---

## Reference Files

| File | When to read |
|---|---|
| `glossary.md` | When a term in a dimension file is unclear or undefined |
| `dimensions/workflow-readiness.md` | When assessing or improving Workflow dimension |
| `dimensions/skills-readiness.md` | When assessing or improving Skills dimension |
| `dimensions/context-readiness.md` | When assessing or improving Context dimension |
| `dimensions/ai-adoption.md` | When assessing or improving Adoption dimension |
| `dimensions/quality-trust.md` | When assessing or improving Quality dimension |
| `assessment/quarterly-template.md` | During quarterly self-assessment |
| `../architecture/adr/ADR-0004-metrics-weights.md` | When the weight rationale is questioned or dimensions are being added |
| `ai-core/meta/metrics-snapshots/` | When analyzing historical trend data (do not load proactively) |
