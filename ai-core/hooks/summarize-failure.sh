#!/usr/bin/env bash
# summarize-failure.sh — When a session fails or is abandoned, captures what was
# attempted and why it failed. Appends to ai-core/memory/anti-patterns.md.
#
# Usage: bash ai-core/hooks/summarize-failure.sh "<skill>" "<task_summary>" "<error_context>"

set -euo pipefail

SKILL="${1:-unknown}"
TASK_SUMMARY="${2:-no summary}"
ERROR_CONTEXT="${3:-no error context}"
DATE=$(date -u +"%Y-%m-%d")

PROMPT="A Claude Code session failed or was abandoned.
Skill: $SKILL
Task: $TASK_SUMMARY
Error context: $ERROR_CONTEXT

In 1-2 sentences, what approach failed and why? This will be saved to prevent the same mistake.
Reply with a single line in this format:
[$DATE] FAILED: <what was tried> — <why it failed> [Session: $SKILL / $TASK_SUMMARY]
If the failure is not informative (e.g. user cancelled intentionally), reply with: SKIP"

RESULT=$(echo "$PROMPT" | claude -p --max-tokens 100 2>/dev/null || echo "SKIP")

if [ "$RESULT" != "SKIP" ] && [ -n "$RESULT" ]; then
  echo "$RESULT" >> "$(dirname "$0")/../memory/anti-patterns.md"
  echo "Anti-pattern captured: $RESULT"
else
  echo "No anti-pattern captured for this session."
fi
