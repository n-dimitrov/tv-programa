# AI Readiness Quarterly Assessment

Complete this template once per quarter. Automated metrics are pulled from `ai-core/meta/metrics-snapshots/` (run `bash ai-core/hooks/compute-metrics.sh` first). Manual metrics require observation and counting described in each section.

---

## Assessment Header

```
Quarter:          Q[N] YYYY
Period:           YYYY-MM-DD to YYYY-MM-DD
Assessor(s):
Team size (developers actively using Claude Code):
Prior quarter AI Readiness Score:
Assessment date:
```

---

## Automated Metrics (from compute-metrics.sh)

Run `bash ai-core/hooks/compute-metrics.sh` before filling this section. Copy values from the output JSON.

```
skill_reuse_rate:           _____%    (Skills: Skill Reuse Rate)
wip_stability:              _____%    (Workflow: WIP Stability)
pull_readiness_proxy:       _____%    (Workflow: Pull Readiness Score)
rework_rate:                _____%    (Quality: Rework Rate — raw, will be inverted)
ai_acceptance_rate:         _____%    (Quality: AI Acceptance Rate)
skill_invocation_count:     _____     (Adoption: total sessions for the period)
```

### Usage Metrics (from compute-metrics.sh — informational, not scored)

These metrics track resource consumption. They do not feed into the AI Readiness Score but help the team monitor cost efficiency over time.

```
total_input_tokens:         _____
total_output_tokens:        _____
total_cost_usd:             $_____
total_duration_ms:          _____
avg_cost_per_session:       $_____
avg_tokens_per_session:     _____
avg_duration_per_session_ms: _____
```

**Quarter-over-quarter trends** (fill after second quarter):

```
Avg cost/session change:    $_____ → $_____   (↑/↓ ___%)
Avg tokens/session change:  _____ → _____     (↑/↓ ___%)
Cost efficiency (cost per successful session): $_____
  Formula: total_cost_usd / sessions where outcome == "success"
```

---

## Section 1: Workflow Readiness (Weight: 30%)

Reference: [dimensions/workflow-readiness.md](../dimensions/workflow-readiness.md)

### 1A — Workflow Definition Coverage (manual, weight 0.30)

List all recurring workflow types your team executes (e.g., feature development, bug fix, code review, hotfix, deployment, onboarding):

| Workflow type | Has documented definition with entry/exit criteria? |
|---|---|
| | Yes / No |
| | Yes / No |
| | Yes / No |
| | Yes / No |
| | Yes / No |

```
Total workflow types identified:            _____
Workflows with complete documentation:      _____
Workflow Definition Coverage = (doc / total) × 100 = _____%
```

### 1B — Workflow Automation Ratio (manual, weight 0.25)

For each documented workflow, count its total steps and the steps executed by a Claude Code skill or registered hook:

| Workflow | Total steps | Automated steps |
|---|---|---|
| | | |
| | | |
| | | |

```
Total steps across all workflows:           _____
Automated steps:                            _____
Workflow Automation Ratio = (auto / total) × 100 = _____%
```

### 1C — Pull Readiness Score (automated, weight 0.25)

```
Value from compute-metrics.sh (pull_readiness_proxy): _____%
```

### 1D — WIP Stability (automated, weight 0.20)

```
Value from compute-metrics.sh (wip_stability): _____%
```

### Workflow Dimension Score

```
Workflow_Score = 0.30 × [1A] + 0.25 × [1B] + 0.25 × [1C] + 0.20 × [1D]
              = 0.30 × _____ + 0.25 × _____ + 0.25 × _____ + 0.20 × _____
              = _____
```

---

## Section 2: Skills Readiness (Weight: 25%)

Reference: [dimensions/skills-readiness.md](../dimensions/skills-readiness.md)

### 2A — Agentic Skills Coverage (hybrid, weight 0.30)

```
Number of directories in .claude/skills/:   _____   (run: ls .claude/skills/ | wc -l)
```

List recurring development task types your team performs:

| Task type | Has a corresponding .claude/skills/ entry? |
|---|---|
| | Yes / No |
| | Yes / No |
| | Yes / No |
| | Yes / No |
| | Yes / No |

```
Total task types identified:                _____
Task types with a skill:                    _____
Agentic Skills Coverage = (with_skill / total) × 100 = _____%
```

### 2B — Skill Reuse Rate (automated, weight 0.25)

```
Value from compute-metrics.sh (skill_reuse_rate): _____%
```

### 2C — End-to-End Skill Capability (manual, weight 0.25)

Review the features or tasks completed this quarter. For each, check which canonical lifecycle skills were invoked (cross-reference run-log.jsonl):

| Feature / task | onboard | architect | planner | builder | reviewer | Complete? |
|---|---|---|---|---|---|---|
| | ☐ | ☐ | ☐ | ☐ | ☐ | Yes / No |
| | ☐ | ☐ | ☐ | ☐ | ☐ | Yes / No |
| | ☐ | ☐ | ☐ | ☐ | ☐ | Yes / No |

```
Features attempted:                         _____
Complete lifecycle paths (≥4 of 5 skills):  _____
End-to-End Skill Capability = (complete / attempted) × 100 = _____%
(If 0 complete paths: score = 0)
```

### 2D — AI Execution Autonomy (automated proxy, weight 0.20)

```
Value from compute-metrics.sh (wip_stability as proxy): _____%
```

### Skills Dimension Score

```
Skills_Score = 0.30 × [2A] + 0.25 × [2B] + 0.25 × [2C] + 0.20 × [2D]
             = 0.30 × _____ + 0.25 × _____ + 0.25 × _____ + 0.20 × _____
             = _____
```

---

## Section 3: Context Readiness (Weight: 20%)

Reference: [dimensions/context-readiness.md](../dimensions/context-readiness.md)

### 3A — Documentation Coverage (hybrid, weight 0.30)

```
SKILL.md files present:                     _____   (run: ls .claude/skills/*/SKILL.md | wc -l)
ADR files present:                          _____   (run: ls ai-core/knowledge/architecture/adr/ADR-*.md | wc -l)
```

List artifacts (skills, components, key decisions) that exist but lack documentation:

| Undocumented artifact | Type |
|---|---|
| | skill / component / decision |
| | skill / component / decision |

```
Total tracked artifacts (skills + components + decisions):  _____
Documented artifacts:                                       _____
Documentation Coverage = (documented / total) × 100 = _____%
```

### 3B — Machine-Readable Context (automated, weight 0.30)

```
Run: find ai-core/knowledge .claude/skills CLAUDE.md -type f | wc -l     Total: _____
Run: find ai-core/knowledge .claude/skills -name "*.md" -o -name "*.json" -o -name "*.jsonl" -o -name "*.sh" | wc -l    Structured: _____
Machine-Readable Context = (structured / total) × 100 = _____%
```

### 3C — Context Retrieval Success Rate (hybrid, weight 0.25)

**Automated signal** (from run-log.jsonl — count entries where task_summary contains "ADR-", "decision", "per pattern", "per convention"):

```
Sessions with context keywords in task_summary:   _____
Total sessions:                                   _____
Automated signal = (keyword / total) × 100 = _____%
```

**Manual audit** — Review 10 recent sessions (or all if <10). For each, did the AI correctly apply documented context (CLAUDE.md, ADRs, patterns) without you re-providing it?

| Session # | task_summary (brief) | Context correctly applied? |
|---|---|---|
| 1 | | Yes / No |
| 2 | | Yes / No |
| 3 | | Yes / No |
| 4 | | Yes / No |
| 5 | | Yes / No |
| 6 | | Yes / No |
| 7 | | Yes / No |
| 8 | | Yes / No |
| 9 | | Yes / No |
| 10 | | Yes / No |

```
Sessions with correct context application:        _____  / 10
Manual audit rate = _____%
```

If automated signal and manual audit differ by >15 points: flag `[DISCREPANCY: auto=___%, manual=___%]` and use manual value.

```
Context Retrieval Success Rate (final): _____%
```

### 3D — Specification Quality Score (manual, weight 0.15)

Review each ADR created or updated this quarter against the 3-point rubric:

| ADR | All sections present? (1pt) | Concrete revisit trigger? (1pt) | Written before implementation? (1pt) | Score /3 |
|---|---|---|---|---|
| ADR-000X | Yes/No | Yes/No | Yes/No | |
| ADR-000X | Yes/No | Yes/No | Yes/No | |
| ADR-000X | Yes/No | Yes/No | Yes/No | |

```
Total ADRs reviewed:                        _____
Sum of rubric scores:                       _____
Specification Quality Score = (sum / (3 × total)) × 100 = _____%
(If no ADRs this quarter: use prior quarter value or flag [INSUFFICIENT_DATA])
```

### Context Dimension Score

```
Context_Score = 0.30 × [3A] + 0.30 × [3B] + 0.25 × [3C] + 0.15 × [3D]
              = 0.30 × _____ + 0.30 × _____ + 0.25 × _____ + 0.15 × _____
              = _____
```

---

## Section 4: AI Adoption (Weight: 15%)

Reference: [dimensions/ai-adoption.md](../dimensions/ai-adoption.md)

### 4A — AI Usage Rate (hybrid, weight 0.40)

```
AI sessions in period (skill_invocation_count from compute-metrics.sh):   _____
Total development sessions (git commits in period):                        _____
  (run: git log --oneline --since="YYYY-MM-DD" --until="YYYY-MM-DD" | wc -l)
AI Usage Rate = (AI sessions / total sessions) × 100 = _____%
```

### 4B — AI Contribution Ratio (hybrid, weight 0.35)

```
Distinct files in run-log files_changed (all periods):   _____
  (from compute-metrics.sh output, or manual count from run-log.jsonl)
Distinct files changed in git this quarter:              _____
  (run: git diff --name-only HEAD~N | sort -u | wc -l for the period)
AI Contribution Ratio = (run-log files / git files) × 100 = _____%
```

### 4C — Skill Invocation Frequency (hybrid, weight 0.25)

```
Total AI sessions (skill_invocation_count):    _____
Team size:                                     _____   (from assessment header)
Weeks in period:                               _____   (typically 13 for a quarter)
Invocations per person per week = total / team_size / weeks = _____
Score = min(invocations_per_person_per_week / 10, 1.0) × 100 = _____%
```

### Adoption Dimension Score

```
Adoption_Score = 0.40 × [4A] + 0.35 × [4B] + 0.25 × [4C]
               = 0.40 × _____ + 0.35 × _____ + 0.25 × _____
               = _____
```

---

## Section 5: Quality & Trust (Weight: 10%)

Reference: [dimensions/quality-trust.md](../dimensions/quality-trust.md)

### 5A — AI Acceptance Rate (automated, weight 0.40)

```
Value from compute-metrics.sh (ai_acceptance_rate): _____%
```

### 5B — Rework Rate (automated, weight 0.35)

```
Value from compute-metrics.sh (rework_rate): _____%   (raw)
Inverted score = 100 - rework_rate = _____%
```

### 5C — Defect Escape Rate (manual, weight 0.25)

Log any defects this quarter that were attributable to AI-authored changes AND were caught after the reviewer skill approved them (i.e., caught in QA or production):

| Defect description | AI session that caused it | Caught in: |
|---|---|---|
| | | QA / Production |
| | | QA / Production |

```
Post-review defects from AI sessions:              _____
AI sessions reviewed (skill contains "reviewer"):  _____
  (run: grep '"reviewer"' ai-core/meta/run-log.jsonl | wc -l)
Defect Escape Rate (raw) = (defects / reviewed) × 100 = _____%
Inverted score = 100 - Defect Escape Rate = _____%
```

### Quality Dimension Score

```
Quality_Score = 0.40 × [5A] + 0.35 × (100 - [5B raw]) + 0.25 × (100 - [5C raw])
              = 0.40 × _____ + 0.35 × _____ + 0.25 × _____
              = _____
```

---

## Score Computation

```
AI Readiness Score = 0.30 × Workflow + 0.25 × Skills + 0.20 × Context
                   + 0.15 × Adoption + 0.10 × Quality

                   = 0.30 × _____ + 0.25 × _____ + 0.20 × _____
                   + 0.15 × _____ + 0.10 × _____

                   = _____
```

**Maturity level**: L1 (0–39) / L2 (40–69) / L3 (70–100) → ___

**Prior quarter score**: _____
**Quarter-over-quarter delta**: _____  (positive = improvement)

---

## Dimension Breakdown

| Dimension | Score | Weight | Weighted contribution |
|---|---|---|---|
| Workflow Readiness | _____ | 30% | _____ |
| Skills Readiness | _____ | 25% | _____ |
| Context Readiness | _____ | 20% | _____ |
| AI Adoption | _____ | 15% | _____ |
| Quality & Trust | _____ | 10% | _____ |
| **AI Readiness Score** | | | **_____** |

---

## Retrospective

**What improved most this quarter?**

[Free text]

**What is the biggest blocker to reaching the next maturity level?**

[Free text — identify the single dimension or sub-metric holding the score back most]

**Which metrics were hardest to collect this quarter?**

[Free text — flag any sub-metrics that should be automated in a future iteration]

**Data quality flags** (any `[INSUFFICIENT_DATA]`, `[USING_PRIOR_QUARTER]`, or `[DISCREPANCY]` entries from this assessment):

[List flags]
