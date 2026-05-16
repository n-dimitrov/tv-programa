#!/usr/bin/env bash
# capture-session-metrics.sh — Status line script that persists cumulative
# token/cost/time metrics to a JSON file after each Claude Code response.
#
# Claude Code pipes a JSON object to stdin with context_window, cost, and
# rate_limits data. This script:
#   1. Writes the latest cumulative metrics to /tmp/.aisdlc-session-metrics-$USER.json
#   2. Outputs a one-line status for the terminal status bar
#
# Registered as the "statusLine" command in .claude/settings.local.json
# by the aisdlc-onboard skill. The companion log-run.sh reads the temp
# metrics file at session end.

set -euo pipefail

INPUT=$(cat)

# Extract fields (default to 0 if missing)
INPUT_TOKENS=$(echo "$INPUT"  | jq -r '.context_window.total_input_tokens // 0')
OUTPUT_TOKENS=$(echo "$INPUT" | jq -r '.context_window.total_output_tokens // 0')
COST_USD=$(echo "$INPUT"      | jq -r '.cost.total_cost_usd // 0')
DURATION_MS=$(echo "$INPUT"   | jq -r '.cost.total_duration_ms // 0')
API_DURATION_MS=$(echo "$INPUT" | jq -r '.cost.total_api_duration_ms // 0')
MODEL=$(echo "$INPUT"         | jq -r '.model.display_name // "unknown"')

# Persist to a user-scoped temp file so log-run.sh can always find it,
# regardless of which directory either script is called from.
METRICS_FILE="/tmp/.aisdlc-session-metrics-${USER:-session}.json"
jq -n \
  --argjson input_tokens "$INPUT_TOKENS" \
  --argjson output_tokens "$OUTPUT_TOKENS" \
  --argjson cost_usd "$COST_USD" \
  --argjson duration_ms "$DURATION_MS" \
  --argjson api_duration_ms "$API_DURATION_MS" \
  --arg model "$MODEL" \
  --arg updated_at "$(date -u +"%Y-%m-%dT%H:%M:%SZ")" \
  '{
    input_tokens: $input_tokens,
    output_tokens: $output_tokens,
    cost_usd: $cost_usd,
    duration_ms: $duration_ms,
    api_duration_ms: $api_duration_ms,
    model: $model,
    updated_at: $updated_at
  }' > "$METRICS_FILE"

# Format status line output
TOTAL_TOKENS=$((INPUT_TOKENS + OUTPUT_TOKENS))
MINS=$(echo "$DURATION_MS" | awk '{printf "%.1f", $1/60000}')
COST_FMT=$(printf "%.4f" "$COST_USD")

echo "[$MODEL] ${TOTAL_TOKENS} tok | \$${COST_FMT} | ${MINS}m"
