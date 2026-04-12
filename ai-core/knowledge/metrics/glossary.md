# Metrics Glossary

Formal definitions for all terms used in the AI Readiness Metrics Framework. When a term appears in a dimension file or assessment template, its authoritative definition is here.

---

## Core Terms

### AI Readiness Score

The final composite score for a team's AI readiness, computed as:

```
AI Readiness Score = 0.30 × Workflow + 0.25 × Skills + 0.20 × Context + 0.15 × Adoption + 0.10 × Quality
```

Ranges 0–100. Maps to L1 (0–39), L2 (40–69), or L3 (70–100) maturity levels.

### Dimension Score

A 0–100 score for one of the five readiness dimensions, computed as the weighted average of its constituent sub-metric scores using the sub-metric weights defined in the dimension file.

### Sub-Metric Score

A 0–100 score for a single measurable indicator within a dimension. For percentage-based metrics, the score equals the percentage value directly. For ratio-based metrics, multiply by 100. For boolean metrics (yes/no), Yes = 100, No = 0.

---

## Defined Terms (Previously Undefined)

### Pull Readiness Score

A composite 0–100 score measuring whether AI-produced work is complete enough for review and merge without requiring the reviewer to reconstruct lost context.

**Formula:** `(sessions where outcome == "success" AND task_summary != "") / total_sessions × 100`

**Data source:** `ai-core/meta/run-log.jsonl` — automated, computed weekly.

**Interpretation:** A high Pull Readiness Score means that AI sessions reliably produce a named, successful outcome that can be traced by a reviewer. A low score means sessions frequently produce empty or failed outputs that leave reviewers without context.

**Target:** >80%

---

### AI Execution Autonomy

The percentage of AI sessions that reach a successful outcome without requiring the human to intervene and restart or manually redirect the session within the same day.

**Formula:** `success_sessions_without_same-day_retry / total_sessions × 100`

A "same-day retry" is a second `run-log.jsonl` entry within 24 hours whose `task_summary` has >70% keyword overlap with a prior entry that had `outcome != "success"`.

**Data source:** `ai-core/meta/run-log.jsonl` — automated, computed weekly.

**Interpretation:** Measures the AI's ability to complete tasks independently. Low autonomy indicates that prompts or context are insufficient to guide the AI through a full task without human course-correction.

**Target:** >75% (no explicit target in framework; this value is recommended)

---

### Context Retrieval Success Rate

The fraction of AI sessions where the AI demonstrably loaded and applied the correct context — CLAUDE.md, relevant ADRs, patterns — as evidenced by session outcomes and task summaries that reference documented decisions.

**Formula (hybrid):**
- **Automated signal:** `sessions where task_summary contains ADR/pattern keywords / total_sessions × 100`
- **Manual audit:** Quarterly review of 10 sampled sessions: how many correctly applied documented context without the human re-providing it?
- **Final value:** If automated and manual differ by >15 points, flag for review and use the manual value.

**Data source:** `ai-core/meta/run-log.jsonl` (automated) + quarterly session audit (manual).

**Interpretation:** A high rate means the documentation structure is working — the AI can find and apply the right context without coaching. A low rate means CLAUDE.md load order, ADR coverage, or pattern documentation needs attention.

**Target:** >75% (no explicit target in framework; this value is recommended)

---

## Session Classification Terms

### Agentic Session

Any Claude Code invocation that is logged to `ai-core/meta/run-log.jsonl` with a named skill — i.e., where `skill != "unknown"`. Non-agentic sessions are ad-hoc prompts that bypassed the skill system.

**Used in:** Skill Reuse Rate, AI Usage Rate, Skill Invocation Frequency.

### Rework Session

A session in `run-log.jsonl` that is identified as correcting or repeating a prior session's work. A session is classified as a rework session when either:

1. Its `task_summary` contains one or more of these keywords: `fix`, `redo`, `revert`, `correct`, `retry`, `again`, `wrong`
2. Its `task_summary` has >70% keyword overlap with a prior session's `task_summary` within 48 hours, AND the prior session had `outcome != "success"`

**Used in:** Rework Rate, AI Acceptance Rate.

### Complete Lifecycle Path

A sequence of skill invocations within a single development cycle (branch or feature) that covers at least four of the five canonical ai-sdlc skills: `onboard`, `architect`/`aisdlc-architect`, `planner`/`aisdlc-planner`, a builder-role skill, and `reviewer`/`aisdlc-reviewer`.

Identified by grouping `run-log.jsonl` entries by overlapping `files_changed` values within a bounded time window (typically one sprint).

**Used in:** End-to-End Skill Capability.

---

## Usage Metrics

### Token Usage

The number of tokens consumed during a Claude Code session, split into `input_tokens` (prompt context sent to the model) and `output_tokens` (model-generated response). Captured by the `capture-session-metrics.sh` status line and persisted to `run-log.jsonl` by `log-run.sh`.

**Used in:** `usage_metrics` section of weekly snapshots — `total_input_tokens`, `total_output_tokens`, `avg_tokens_per_session`.

### Session Cost

The cumulative API cost in USD for a single Claude Code session, as reported by the Claude Code status line (`cost.total_cost_usd`).

**Used in:** `usage_metrics.total_cost_usd`, `usage_metrics.avg_cost_per_session` in weekly snapshots.

### Session Duration

Wall-clock time in milliseconds from session start to the last Claude response (`cost.total_duration_ms`). A companion field `api_duration_ms` measures only the time spent waiting for API responses.

**Used in:** `usage_metrics.total_duration_ms`, `usage_metrics.avg_duration_per_session_ms` in weekly snapshots.

---

## Metric Collection Terms

### Automated Metric

A sub-metric whose value is computed directly from `ai-core/meta/run-log.jsonl` by `ai-core/hooks/compute-metrics.sh` without human input. Updated weekly.

### Manual Metric

A sub-metric that requires human observation and entry in `ai-core/knowledge/metrics/assessment/quarterly-template.md`. Updated quarterly.

### Hybrid Metric

A sub-metric with both an automated signal (from `run-log.jsonl`) and a manual component (from the quarterly assessment). If the two values differ by more than 15 points, the discrepancy is flagged for review and the manual value takes precedence.
