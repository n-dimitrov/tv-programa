#!/usr/bin/env bash
# log-run.sh — Appends one JSON line to ai-core/meta/run-log.jsonl after every session.
# Called explicitly by each skill in its "Final step" section (NOT as a Stop hook).
#
# Usage: bash ai-core/hooks/log-run.sh "<skill>" "<task_summary>" "<outcome>"
#   skill:        e.g. "backend-builder"
#   task_summary: one-line description of what was done
#   outcome:      "success" | "error" | "partial"
#
# Dependencies: jq (for safe JSON construction and session metrics reading)

set -euo pipefail

if ! command -v jq &> /dev/null; then
  echo "ERROR: jq is required but not installed. Install with: brew install jq" >&2
  exit 1
fi

SKILL="${1:-unknown}"
TASK_SUMMARY="${2:-no summary}"
OUTCOME="${3:-unknown}"
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

# Capture changed files since last commit (if in a git repo)
if git rev-parse --git-dir > /dev/null 2>&1; then
  FILES_CHANGED=$(git diff --name-only HEAD 2>/dev/null || git diff --name-only 2>/dev/null || echo "")
  FILES_CHANGED=$(echo "$FILES_CHANGED" | tr '\n' ',' | sed 's/,$//')
else
  FILES_CHANGED=""
fi

# Read session metrics captured by the status line (capture-session-metrics.sh)
META_DIR="$(dirname "$0")/../meta"
SESSION_METRICS_FILE="$META_DIR/.session-metrics.json"
if [ -f "$SESSION_METRICS_FILE" ]; then
  INPUT_TOKENS=$(jq -r '.input_tokens // 0' "$SESSION_METRICS_FILE")
  OUTPUT_TOKENS=$(jq -r '.output_tokens // 0' "$SESSION_METRICS_FILE")
  COST_USD=$(jq -r '.cost_usd // 0' "$SESSION_METRICS_FILE")
  DURATION_MS=$(jq -r '.duration_ms // 0' "$SESSION_METRICS_FILE")
  API_DURATION_MS=$(jq -r '.api_duration_ms // 0' "$SESSION_METRICS_FILE")
  MODEL=$(jq -r '.model // "unknown"' "$SESSION_METRICS_FILE")
  rm -f "$SESSION_METRICS_FILE"
else
  INPUT_TOKENS=0
  OUTPUT_TOKENS=0
  COST_USD=0
  DURATION_MS=0
  API_DURATION_MS=0
  MODEL="unknown"
fi

# Build JSON safely via jq to prevent injection from user-supplied strings
mkdir -p "$META_DIR"
jq -nc \
  --arg timestamp "$TIMESTAMP" \
  --arg skill "$SKILL" \
  --arg task_summary "$TASK_SUMMARY" \
  --arg files_changed "$FILES_CHANGED" \
  --arg outcome "$OUTCOME" \
  --argjson input_tokens "$INPUT_TOKENS" \
  --argjson output_tokens "$OUTPUT_TOKENS" \
  --argjson cost_usd "$COST_USD" \
  --argjson duration_ms "$DURATION_MS" \
  --argjson api_duration_ms "$API_DURATION_MS" \
  --arg model "$MODEL" \
  '{
    timestamp: $timestamp,
    skill: $skill,
    task_summary: $task_summary,
    files_changed: $files_changed,
    outcome: $outcome,
    input_tokens: $input_tokens,
    output_tokens: $output_tokens,
    cost_usd: $cost_usd,
    duration_ms: $duration_ms,
    api_duration_ms: $api_duration_ms,
    model: $model
  }' >> "$META_DIR/run-log.jsonl"
