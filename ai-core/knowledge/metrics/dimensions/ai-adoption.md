# AI Adoption (Dimension 4 — Weight: 15%)

Measures the depth and breadth of actual AI use across the team's development work. Adoption is a lagging indicator — it reflects the combined effect of Workflow, Skills, and Context being in place. A high adoption score on a weak foundation is not sustainable; a high adoption score on a strong foundation signals the framework is working.

See [ADR-0004](../../architecture/adr/ADR-0004-metrics-weights.md) for the rationale behind this weight.

---

## Sub-Metrics

### AI Usage Rate

**Definition**: Percentage of development sessions (commits, PRs, features) in a period where at least one Claude Code skill was invoked.

**Formula**: `(development_sessions_with_skill_invocation / total_development_sessions) × 100`

Where:
- `development_sessions_with_skill_invocation` = count of `run-log.jsonl` entries in the period
- `total_development_sessions` = total git commits in the period (proxy for total development activity)

**Target**: >80%

**Data source**: Hybrid — `run-log.jsonl` entry count (automated) divided by `git log --oneline` count for the same period (requires git access). If git is not available, total development sessions is a manual input from the quarterly assessment.

**Collection**: Hybrid, weekly

**Frequency**: Weekly (automated signal from `run-log.jsonl`; manual git count at quarterly assessment)

**Dimension weight**: 0.40

**Scoring**: Direct percentage mapping. 80% maps to 80; 100% = 100.

---

### AI Contribution Ratio

**Definition**: Fraction of files changed in a period where the change was initiated or substantially shaped by a Claude Code session — evidenced by a matching `files_changed` entry in `run-log.jsonl`.

**Formula**: `(distinct_files_in_run-log_files_changed / total_distinct_files_changed_in_git) × 100`

Where:
- `distinct_files_in_run-log_files_changed` = unique file paths across all `files_changed` fields in `run-log.jsonl` for the period
- `total_distinct_files_changed_in_git` = `git diff --name-only HEAD~N` for the equivalent period

**Target**: No explicit threshold — track as a trend.

**Data source**: Hybrid — `run-log.jsonl` `files_changed` field (automated) + `git diff` output (automated or manual).

**Collection**: Hybrid, weekly (automated in `compute-metrics.sh` when git is available)

**Frequency**: Weekly

**Dimension weight**: 0.35

**Scoring**: Direct percentage mapping. 0–100.

---

### Skill Invocation Frequency

**Definition**: Average number of distinct skill invocations per developer per week during the assessment period.

**Formula**: `total_run-log_sessions_in_period / team_size / weeks_in_period`

**Target**: No explicit threshold. Track as a trend. A value below 2 per person per week suggests AI is not yet embedded in daily workflow.

**Data source**: Hybrid — `run-log.jsonl` session count (automated) divided by team size (manual input, quarterly) and weeks in period (known).

**Collection**: Hybrid — automated session count; manual team size entry in quarterly assessment.

**Frequency**: Weekly automated aggregation; quarterly team_size update.

**Dimension weight**: 0.25

**Scoring**: Normalize to 0–100 using a soft cap. Treat 10+ invocations per person per week as 100. Formula: `min(invocations_per_person_per_week / 10, 1.0) × 100`.

---

## Efficiency Indicators (informational — not scored)

These metrics track resource consumption per unit of output. They do not contribute to the Adoption dimension score but help teams monitor whether AI usage is becoming more efficient over time.

### Cost per Successful Session

**Definition**: Average API cost for sessions that ended with `outcome == "success"`.

**Formula**: `total_cost_usd (success sessions) / count(success sessions)`

**Data source**: `ai-core/meta/run-log.jsonl` — fields `cost_usd`, `outcome`.

**Interpretation**: A decreasing trend suggests the team is writing better prompts, using more effective skills, or benefiting from improved context. A rising trend may indicate scope creep per session or inefficient retry loops.

### Tokens per File Changed

**Definition**: Average total tokens (input + output) per distinct file changed across sessions with non-empty `files_changed`.

**Formula**: `sum(input_tokens + output_tokens) / count(distinct files in files_changed)`

**Data source**: `ai-core/meta/run-log.jsonl` — fields `input_tokens`, `output_tokens`, `files_changed`.

**Interpretation**: A proxy for how much AI "thinking" is needed per unit of code change. Lower is generally better, but very low values may indicate trivial changes.

---

## Dimension Score Formula

```
Adoption_Score = 0.40 × AI_Usage_Rate
               + 0.35 × AI_Contribution_Ratio
               + 0.25 × Skill_Invocation_Frequency
```

Sub-metric weights sum to 1.0: `0.40 + 0.35 + 0.25 = 1.00`

---

## Data Sources Summary

| Sub-metric | Source | Method | Frequency |
|---|---|---|---|
| AI Usage Rate | `run-log.jsonl` count / git commit count | Hybrid | Weekly |
| AI Contribution Ratio | `run-log.jsonl` `files_changed` / git diff | Hybrid | Weekly |
| Skill Invocation Frequency | `run-log.jsonl` count / team_size / weeks | Hybrid (team_size manual) | Weekly auto + quarterly update |
