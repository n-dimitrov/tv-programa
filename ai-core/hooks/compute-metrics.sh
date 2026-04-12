#!/usr/bin/env bash
# compute-metrics.sh — Reads run-log.jsonl and outputs automated metric values to a
# dated JSON snapshot in ai-core/meta/metrics-snapshots/.
#
# Run weekly (or manually before a quarterly assessment) to generate the automated
# metrics that feed into the AI Readiness Metrics Framework.
#
# Usage:
#   bash ai-core/hooks/compute-metrics.sh [LOG_FILE] [DATE_RANGE] [OUTPUT_FILE]
#
#   LOG_FILE:    Path to run-log.jsonl (default: ai-core/meta/run-log.jsonl)
#   DATE_RANGE:  YYYY-MM-DD:YYYY-MM-DD filter (default: last 7 days)
#   OUTPUT_FILE: Output JSON path (default: ai-core/meta/metrics-snapshots/YYYY-MM-DD.json)
#
# Dependencies: jq (JSON parsing), bc (arithmetic), bash 3.2+
# Follows conventions from ai-core/hooks/log-run.sh (set -euo pipefail, dirname paths).

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
META_DIR="$SCRIPT_DIR/../meta"
SNAPSHOTS_DIR="$META_DIR/metrics-snapshots"

# ── Arguments ────────────────────────────────────────────────────────────────

LOG_FILE="${1:-$META_DIR/run-log.jsonl}"
DATE_RANGE="${2:-}"
OUTPUT_FILE="${3:-$SNAPSHOTS_DIR/$(date -u +"%Y-%m-%d").json}"

# ── Validate dependencies ─────────────────────────────────────────────────────

if ! command -v jq &> /dev/null; then
  echo "ERROR: jq is required but not installed. Install with: brew install jq" >&2
  exit 1
fi

if ! command -v bc &> /dev/null; then
  echo "ERROR: bc is required but not installed." >&2
  exit 1
fi

# ── Validate log file ─────────────────────────────────────────────────────────

if [ ! -f "$LOG_FILE" ]; then
  echo "ERROR: Log file not found: $LOG_FILE" >&2
  exit 1
fi

mkdir -p "$SNAPSHOTS_DIR"

# ── Date range setup ──────────────────────────────────────────────────────────

if [ -n "$DATE_RANGE" ]; then
  PERIOD_START="${DATE_RANGE%%:*}"
  PERIOD_END="${DATE_RANGE##*:}"
else
  # Default: last 7 days
  PERIOD_END=$(date -u +"%Y-%m-%d")
  PERIOD_START=$(date -u -v-7d +"%Y-%m-%d" 2>/dev/null || date -u -d "7 days ago" +"%Y-%m-%d")
fi

COMPUTED_AT=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

echo "Computing metrics for period: $PERIOD_START to $PERIOD_END"
echo "Log file: $LOG_FILE"

# ── Filter log to date range ──────────────────────────────────────────────────
# Extract entries within the date range. Entries outside range are ignored.

FILTERED_ENTRIES=$(jq -r --arg start "$PERIOD_START" --arg end "$PERIOD_END" \
  'select(.timestamp >= ($start + "T") and .timestamp <= ($end + "T23:59:59Z"))' \
  "$LOG_FILE" 2>/dev/null || true)

# If no date filter produced results, use all entries
if [ -z "$FILTERED_ENTRIES" ]; then
  FILTERED_ENTRIES=$(cat "$LOG_FILE" 2>/dev/null || true)
fi

# If still empty (empty log file), output a zero-state snapshot and exit
if [ -z "$FILTERED_ENTRIES" ]; then
  echo "No entries in run-log.jsonl for the period. Outputting zero-state snapshot."
  SNAPSHOT=$(jq -n \
    --arg computed_at "$COMPUTED_AT" \
    --arg period_start "$PERIOD_START" \
    --arg period_end "$PERIOD_END" \
    '{
      computed_at: $computed_at,
      period_start: $period_start,
      period_end: $period_end,
      session_count: 0,
      automated_metrics: {
        skill_reuse_rate: 0.0,
        wip_stability: 0.0,
        pull_readiness_proxy: 0.0,
        rework_rate: 0.0,
        ai_acceptance_rate: 0.0,
        skill_invocation_count: 0
      },
      usage_metrics: {
        total_input_tokens: 0,
        total_output_tokens: 0,
        total_cost_usd: 0,
        total_duration_ms: 0,
        total_api_duration_ms: 0,
        avg_cost_per_session: 0,
        avg_tokens_per_session: 0,
        avg_duration_per_session_ms: 0,
        cost_per_successful_session: 0,
        tokens_per_file_changed: 0
      },
      manual_inputs_required: [
        "team_size",
        "workflow_definition_coverage",
        "workflow_automation_ratio",
        "agentic_skills_coverage",
        "end_to_end_skill_capability",
        "documentation_coverage",
        "specification_quality_score",
        "context_retrieval_success_rate",
        "defect_escape_rate"
      ],
      notes: "No entries found in run-log.jsonl for the specified period."
    }')
  echo "$SNAPSHOT" > "$OUTPUT_FILE"
  echo "Snapshot written to: $OUTPUT_FILE"
  exit 0
fi

# Write filtered entries to a temp file for repeated jq reads
TMPFILE=$(mktemp)
trap 'rm -f "$TMPFILE"' EXIT
echo "$FILTERED_ENTRIES" > "$TMPFILE"

# ── Count totals ──────────────────────────────────────────────────────────────

TOTAL=$(wc -l < "$TMPFILE" | tr -d ' ')

if [ "$TOTAL" -eq 0 ]; then
  TOTAL=1  # Prevent division by zero; metrics will all be 0
fi

# ── Skills Readiness: Skill Reuse Rate ───────────────────────────────────────
# skill != "unknown" counts as a named-skill (agentic) session

NAMED_SKILL=$(jq -r 'select(.skill != null and .skill != "" and .skill != "unknown") | .skill' "$TMPFILE" | wc -l | tr -d ' ')
SKILL_REUSE_RATE=$(echo "scale=1; $NAMED_SKILL * 100 / $TOTAL" | bc)

# ── Workflow Readiness: WIP Stability ─────────────────────────────────────────
# outcome == "success" / total

SUCCESS_COUNT=$(jq -r 'select(.outcome == "success") | .outcome' "$TMPFILE" | wc -l | tr -d ' ')
WIP_STABILITY=$(echo "scale=1; $SUCCESS_COUNT * 100 / $TOTAL" | bc)

# ── Workflow Readiness: Pull Readiness (proxy) ────────────────────────────────
# outcome == "success" AND task_summary is not empty

PULL_READY=$(jq -r 'select(.outcome == "success" and .task_summary != null and .task_summary != "") | .outcome' "$TMPFILE" | wc -l | tr -d ' ')
PULL_READINESS_PROXY=$(echo "scale=1; $PULL_READY * 100 / $TOTAL" | bc)

# ── Quality: Rework Rate ──────────────────────────────────────────────────────
# task_summary contains rework keywords (case-insensitive)

REWORK_KEYWORDS="fix|redo|revert|correct|retry|again|wrong"
REWORK_COUNT=$(jq -r 'select(.task_summary != null) | .task_summary' "$TMPFILE" | grep -iE "$REWORK_KEYWORDS" | wc -l | tr -d ' ')
REWORK_RATE=$(echo "scale=1; $REWORK_COUNT * 100 / $TOTAL" | bc)

# ── Quality: AI Acceptance Rate ───────────────────────────────────────────────
# success sessions that are NOT rework sessions

SUCCESS_REWORK=$(jq -r 'select(.outcome == "success" and .task_summary != null) | .task_summary' "$TMPFILE" | grep -iE "$REWORK_KEYWORDS" | wc -l | tr -d ' ')
SUCCESS_NON_REWORK=$(echo "$SUCCESS_COUNT - $SUCCESS_REWORK" | bc)
if [ "$SUCCESS_COUNT" -gt 0 ]; then
  AI_ACCEPTANCE_RATE=$(echo "scale=1; $SUCCESS_NON_REWORK * 100 / $SUCCESS_COUNT" | bc)
else
  AI_ACCEPTANCE_RATE="0.0"
fi

# ── Skill invocation count ────────────────────────────────────────────────────

SKILL_INVOCATION_COUNT="$TOTAL"

# ── Token, Cost & Duration aggregation ───────────────────────────────────────
# These fields are populated by log-run.sh when capture-session-metrics.sh
# (status line) is active. Missing values default to 0.

TOTAL_INPUT_TOKENS=$(jq -s '[.[].input_tokens // 0] | add // 0' "$TMPFILE")
TOTAL_OUTPUT_TOKENS=$(jq -s '[.[].output_tokens // 0] | add // 0' "$TMPFILE")
TOTAL_COST_USD=$(jq -s '[.[].cost_usd // 0] | add // 0' "$TMPFILE")
TOTAL_DURATION_MS=$(jq -s '[.[].duration_ms // 0] | add // 0' "$TMPFILE")
TOTAL_API_DURATION_MS=$(jq -s '[.[].api_duration_ms // 0] | add // 0' "$TMPFILE")
AVG_COST_PER_SESSION=$(echo "scale=6; $TOTAL_COST_USD / $TOTAL" | bc)
AVG_TOKENS_PER_SESSION=$(echo "scale=0; ($TOTAL_INPUT_TOKENS + $TOTAL_OUTPUT_TOKENS) / $TOTAL" | bc)
AVG_DURATION_PER_SESSION_MS=$(echo "scale=0; $TOTAL_DURATION_MS / $TOTAL" | bc)

# ── Efficiency indicators ────────────────────────────────────────────────────
# Cost per successful session and tokens per file changed (informational, not scored)

SUCCESS_COST_USD=$(jq -s '[.[] | select(.outcome == "success") | .cost_usd // 0] | add // 0' "$TMPFILE")
if [ "$SUCCESS_COUNT" -gt 0 ]; then
  COST_PER_SUCCESS=$(echo "scale=6; $SUCCESS_COST_USD / $SUCCESS_COUNT" | bc)
else
  COST_PER_SUCCESS="0"
fi

DISTINCT_FILES=$(jq -r 'select(.files_changed != null and .files_changed != "") | .files_changed' "$TMPFILE" | tr ',' '\n' | sort -u | wc -l | tr -d ' ')
if [ "$DISTINCT_FILES" -gt 0 ]; then
  TOKENS_WITH_FILES=$(jq -s '[.[] | select(.files_changed != null and .files_changed != "") | ((.input_tokens // 0) + (.output_tokens // 0))] | add // 0' "$TMPFILE")
  TOKENS_PER_FILE=$(echo "scale=0; $TOKENS_WITH_FILES / $DISTINCT_FILES" | bc)
else
  TOKENS_PER_FILE="0"
fi

# ── Assemble output JSON ──────────────────────────────────────────────────────

SNAPSHOT=$(jq -n \
  --arg computed_at "$COMPUTED_AT" \
  --arg period_start "$PERIOD_START" \
  --arg period_end "$PERIOD_END" \
  --argjson session_count "$TOTAL" \
  --argjson skill_reuse_rate "$SKILL_REUSE_RATE" \
  --argjson wip_stability "$WIP_STABILITY" \
  --argjson pull_readiness_proxy "$PULL_READINESS_PROXY" \
  --argjson rework_rate "$REWORK_RATE" \
  --argjson ai_acceptance_rate "$AI_ACCEPTANCE_RATE" \
  --argjson skill_invocation_count "$SKILL_INVOCATION_COUNT" \
  --argjson total_input_tokens "$TOTAL_INPUT_TOKENS" \
  --argjson total_output_tokens "$TOTAL_OUTPUT_TOKENS" \
  --argjson total_cost_usd "$TOTAL_COST_USD" \
  --argjson total_duration_ms "$TOTAL_DURATION_MS" \
  --argjson total_api_duration_ms "$TOTAL_API_DURATION_MS" \
  --argjson avg_cost_per_session "$AVG_COST_PER_SESSION" \
  --argjson avg_tokens_per_session "$AVG_TOKENS_PER_SESSION" \
  --argjson avg_duration_per_session_ms "$AVG_DURATION_PER_SESSION_MS" \
  --argjson cost_per_success "$COST_PER_SUCCESS" \
  --argjson tokens_per_file "$TOKENS_PER_FILE" \
  '{
    computed_at: $computed_at,
    period_start: $period_start,
    period_end: $period_end,
    session_count: $session_count,
    automated_metrics: {
      skill_reuse_rate: $skill_reuse_rate,
      wip_stability: $wip_stability,
      pull_readiness_proxy: $pull_readiness_proxy,
      rework_rate: $rework_rate,
      ai_acceptance_rate: $ai_acceptance_rate,
      skill_invocation_count: $skill_invocation_count
    },
    usage_metrics: {
      total_input_tokens: $total_input_tokens,
      total_output_tokens: $total_output_tokens,
      total_cost_usd: $total_cost_usd,
      total_duration_ms: $total_duration_ms,
      total_api_duration_ms: $total_api_duration_ms,
      avg_cost_per_session: $avg_cost_per_session,
      avg_tokens_per_session: $avg_tokens_per_session,
      avg_duration_per_session_ms: $avg_duration_per_session_ms,
      cost_per_successful_session: $cost_per_success,
      tokens_per_file_changed: $tokens_per_file
    },
    manual_inputs_required: [
      "team_size",
      "workflow_definition_coverage",
      "workflow_automation_ratio",
      "agentic_skills_coverage",
      "end_to_end_skill_capability",
      "documentation_coverage",
      "specification_quality_score",
      "context_retrieval_success_rate",
      "defect_escape_rate"
    ]
  }')

echo "$SNAPSHOT" > "$OUTPUT_FILE"

# ── Print summary ─────────────────────────────────────────────────────────────

echo ""
echo "── Automated Metrics Summary ────────────────────────────────"
echo "  Period:                 $PERIOD_START → $PERIOD_END"
echo "  Sessions analyzed:      $TOTAL"
echo ""
echo "  Skills Readiness"
echo "    Skill Reuse Rate:     ${SKILL_REUSE_RATE}%   (target >70%)"
echo ""
echo "  Workflow Readiness"
echo "    WIP Stability:        ${WIP_STABILITY}%"
echo "    Pull Readiness:       ${PULL_READINESS_PROXY}%   (target >80%)"
echo ""
echo "  Quality & Trust"
echo "    Rework Rate:          ${REWORK_RATE}%   (lower is better)"
echo "    AI Acceptance Rate:   ${AI_ACCEPTANCE_RATE}%"
echo ""
echo "  AI Adoption"
echo "    Skill invocations:    $SKILL_INVOCATION_COUNT  sessions"
echo ""
echo "  Usage & Cost"
TOTAL_TOKENS=$((TOTAL_INPUT_TOKENS + TOTAL_OUTPUT_TOKENS))
TOTAL_MINS=$(echo "scale=1; $TOTAL_DURATION_MS / 60000" | bc)
echo "    Total tokens:         $TOTAL_TOKENS  (in: $TOTAL_INPUT_TOKENS, out: $TOTAL_OUTPUT_TOKENS)"
echo "    Total cost:           \$${TOTAL_COST_USD}"
echo "    Total duration:       ${TOTAL_MINS} min"
echo "    Avg cost/session:     \$${AVG_COST_PER_SESSION}"
echo "    Avg tokens/session:   $AVG_TOKENS_PER_SESSION"
echo "    Cost/success session: \$${COST_PER_SUCCESS}"
echo "    Tokens/file changed:  $TOKENS_PER_FILE"
echo ""
echo "  Manual inputs required for full score:"
echo "    team_size, workflow_definition_coverage, workflow_automation_ratio,"
echo "    agentic_skills_coverage, end_to_end_skill_capability,"
echo "    documentation_coverage, specification_quality_score,"
echo "    context_retrieval_success_rate, defect_escape_rate"
echo ""
echo "  Full snapshot: $OUTPUT_FILE"
echo "  Next: open ai-core/knowledge/metrics/assessment/quarterly-template.md"
echo "────────────────────────────────────────────────────────────"
