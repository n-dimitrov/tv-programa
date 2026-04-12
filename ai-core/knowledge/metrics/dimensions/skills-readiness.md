# Skills Readiness (Dimension 2 — Weight: 25%)

Measures whether the team has built a reusable skill library that covers their development task types and enables the AI to execute those tasks with consistent autonomy. Skills are the execution layer — without them, defined workflows have no AI leverage.

See [ADR-0004](../../architecture/adr/ADR-0004-metrics-weights.md) for the rationale behind this weight.

---

## Sub-Metrics

### Agentic Skills Coverage

**Definition**: Percentage of the team's identified recurring development task types that have a corresponding Claude Code skill defined in `.claude/skills/`.

**Formula**: `(task_types_with_corresponding_skill / total_identified_task_types) × 100`

**Target**: No explicit threshold — track as a trend. Full coverage of the five canonical lifecycle phases (onboard, architect, planner, builder-role, reviewer) is the L2 baseline.

**Data source**: Hybrid — automated count of `.claude/skills/` directories; manual identification of task types not yet covered.

**Collection**: Hybrid, quarterly — count skill directories (`ls .claude/skills/ | wc -l`) and cross-reference with task taxonomy from quarterly assessment.

**Frequency**: Quarterly (quarterly-template.md Section 2)

**Dimension weight**: 0.30

**Scoring**: Direct percentage mapping. 0–100.

---

### Skill Reuse Rate

**Definition**: Fraction of AI sessions that invoke a named skill rather than using ad-hoc prompting. Operationalized as the percentage of `run-log.jsonl` entries where `skill != "unknown"`. See [glossary.md](../glossary.md#agentic-session) for the definition of an Agentic Session.

**Formula**: `(sessions where skill != "unknown") / total_sessions × 100`

**Target**: >70%

**Data source**: `ai-core/meta/run-log.jsonl` — field `skill`.

**Collection**: Automated, computed by `ai-core/hooks/compute-metrics.sh`

**Frequency**: Weekly (output: `ai-core/meta/metrics-snapshots/YYYY-MM-DD.json`, field `skill_reuse_rate`)

**Dimension weight**: 0.25

**Scoring**: Direct percentage mapping. 70% maps to 70; 100% = 100.

---

### End-to-End Skill Capability

**Definition**: Whether the team has executed at least one complete lifecycle path — a sequence covering at least four of the five canonical ai-sdlc skills (onboard, architect, planner, builder-role, reviewer) — for a real feature during the assessment period. See [glossary.md](../glossary.md#complete-lifecycle-path) for the full definition.

**Formula**: `(complete_lifecycle_paths_executed / total_features_attempted) × 100`

**Target**: At least 1 complete lifecycle path per quarter = L2 threshold.

**Data source**: Manual, quarterly — identify features from the period and check `run-log.jsonl` for matching skill sequences. An automated signal (grouping entries by overlapping `files_changed`) can assist but requires manual verification.

**Collection**: Manual, quarterly (quarterly-template.md Section 2)

**Frequency**: Quarterly

**Dimension weight**: 0.25

**Scoring**: Boolean at the L2 threshold (1+ complete path = 100, 0 = 0). For teams with multiple features, use the direct ratio × 100.

---

### AI Execution Autonomy

**Definition**: The percentage of AI sessions that reach a successful outcome without requiring the human to intervene and restart within the same day. See [glossary.md](../glossary.md#ai-execution-autonomy) for the full definition.

**Formula**: `success_sessions_without_same-day_retry / total_sessions × 100`

A same-day retry is detected when two `run-log.jsonl` entries within 24 hours share >70% keyword overlap in `task_summary` and the first entry had `outcome != "success"`.

**Target**: >75% (recommended; no explicit target in the base framework)

**Data source**: `ai-core/meta/run-log.jsonl` — fields `outcome`, `task_summary`, `timestamp`.

**Collection**: Automated (approximated by `wip_stability` in `compute-metrics.sh`; exact retry detection requires the full session log)

**Frequency**: Weekly (output: `ai-core/meta/metrics-snapshots/YYYY-MM-DD.json`, field `wip_stability` as proxy)

**Dimension weight**: 0.20

**Scoring**: Direct percentage mapping. 0–100.

---

## Dimension Score Formula

```
Skills_Score = 0.30 × Agentic_Skills_Coverage
             + 0.25 × Skill_Reuse_Rate
             + 0.25 × End_to_End_Skill_Capability
             + 0.20 × AI_Execution_Autonomy
```

Sub-metric weights sum to 1.0: `0.30 + 0.25 + 0.25 + 0.20 = 1.00`

---

## Data Sources Summary

| Sub-metric | Source | Method | Frequency |
|---|---|---|---|
| Agentic Skills Coverage | `.claude/skills/` dir count + manual task list | Hybrid | Quarterly |
| Skill Reuse Rate | `run-log.jsonl` (`skill` field) | Automated | Weekly |
| End-to-End Skill Capability | Manual session review + `run-log.jsonl` | Manual | Quarterly |
| AI Execution Autonomy | `run-log.jsonl` (`outcome` + `task_summary`) | Automated (proxy) | Weekly |
