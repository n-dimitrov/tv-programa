# Context Readiness (Dimension 3 — Weight: 20%)

Measures whether the project's knowledge is documented, structured, and accessible enough for the AI to retrieve and apply it correctly without per-session coaching. Context readiness is the amplifier layer — it compounds the value of skills and workflows by reducing setup overhead.

See [ADR-0004](../../architecture/adr/ADR-0004-metrics-weights.md) for the rationale behind this weight.

---

## Sub-Metrics

### Documentation Coverage

**Definition**: Percentage of active skills, components, and architectural decisions that have a corresponding documentation artifact — a `SKILL.md`, a component doc in `ai-core/knowledge/components/`, or an ADR.

**Formula**: `(documented_artifacts / total_tracked_artifacts) × 100`

**Target**: >85%

**Data source**: Hybrid — automated count of `SKILL.md` files and ADRs; manual identification of skills, components, or decisions that exist but lack documentation.

**Collection**: Hybrid, quarterly — `ls .claude/skills/*/SKILL.md | wc -l` for skill docs; `ls ai-core/knowledge/architecture/adr/ADR-*.md | wc -l` for ADRs; manual component inventory.

**Frequency**: Quarterly (quarterly-template.md Section 3)

**Dimension weight**: 0.30

**Scoring**: Direct percentage mapping. 85% maps to 85; 100% = 100.

---

### Machine-Readable Context

**Definition**: Percentage of files in the project's knowledge directories (`ai-core/knowledge/`, `CLAUDE.md`, `.claude/skills/`) that are stored in structured, machine-parseable formats — Markdown (`.md`), JSON (`.json`), or JSONL (`.jsonl`) — rather than binary, image, or unstructured formats.

**Formula**: `(structured_knowledge_files / total_knowledge_files) × 100`

Where structured = `.md`, `.json`, `.jsonl`, `.sh` (scripts are readable); unstructured = `.pdf`, `.docx`, `.png`, `.pptx`, etc.

**Target**: >70%

**Data source**: Automated — file extension analysis across `ai-core/knowledge/` and `.claude/skills/`. Computed by `ai-core/hooks/compute-metrics.sh`.

**Collection**: Automated, quarterly (run as part of the quarterly assessment; output in `metrics-snapshots/`)

**Frequency**: Quarterly

**Dimension weight**: 0.30

**Scoring**: Direct percentage mapping. 70% maps to 70; 100% = 100.

---

### Context Retrieval Success Rate

**Definition**: The fraction of AI sessions where the AI demonstrably applied documented context — CLAUDE.md, ADRs, patterns — correctly without the human needing to re-provide already-documented information. See [glossary.md](../glossary.md#context-retrieval-success-rate) for the full definition.

**Formula (hybrid)**:
- **Automated signal**: `sessions where task_summary contains ADR or pattern keywords / total_sessions × 100`
  - ADR keywords: "ADR-", "decision", "per ADR"
  - Pattern keywords: "per pattern", "coding-pattern", "per convention"
- **Manual audit**: Quarterly review of 10 sampled sessions — for each, did the AI correctly apply the relevant context without coaching?
- **Final value**: Use manual audit value. If automated signal and manual audit differ by >15 points, flag `[DISCREPANCY]` in the quarterly assessment.

**Target**: >75% (recommended; no explicit target in the base framework)

**Data source**: `ai-core/meta/run-log.jsonl` (automated signal) + quarterly manual session audit.

**Collection**: Hybrid, quarterly

**Frequency**: Quarterly (quarterly-template.md Section 3)

**Dimension weight**: 0.25

**Scoring**: Direct percentage mapping from manual audit result. 0–100.

---

### Specification Quality Score

**Definition**: Average quality score across all ADRs on a 3-point rubric: (1) has all required template sections present (Context, Decision, Consequences, Options Considered, Revisit Triggers), (2) has at least one concrete revisit trigger that references a measurable condition, (3) was written before or during implementation — not post-hoc. Maximum score per ADR = 3; minimum = 0.

**Formula**: `(Σ rubric_score_per_ADR / (3 × total_ADRs)) × 100`

**Target**: No explicit threshold — track as a trend. A score below 60 indicates ADRs are being written as formalities rather than genuine decision records.

**Data source**: Manual quarterly review of each ADR file against the rubric.

**Collection**: Manual, quarterly (quarterly-template.md Section 3)

**Frequency**: Quarterly

**Dimension weight**: 0.15

**Scoring**: Direct percentage from formula. 0–100.

---

## Dimension Score Formula

```
Context_Score = 0.30 × Documentation_Coverage
              + 0.30 × Machine_Readable_Context
              + 0.25 × Context_Retrieval_Success_Rate
              + 0.15 × Specification_Quality_Score
```

Sub-metric weights sum to 1.0: `0.30 + 0.30 + 0.25 + 0.15 = 1.00`

---

## Data Sources Summary

| Sub-metric | Source | Method | Frequency |
|---|---|---|---|
| Documentation Coverage | SKILL.md + ADR count + manual inventory | Hybrid | Quarterly |
| Machine-Readable Context | File extension analysis (automated) | Automated | Quarterly |
| Context Retrieval Success Rate | `run-log.jsonl` signal + manual session audit | Hybrid | Quarterly |
| Specification Quality Score | Manual ADR rubric review | Manual | Quarterly |
