#!/usr/bin/env bash
# extract-learning.sh — After a builder or reviewer session, asks Claude to capture
# anything worth remembering. Appends to ai-core/memory/learnings.md.
#
# Only fires for builder and reviewer sessions (high-signal).
# Requires the `claude` CLI to be installed and authenticated.
#
# Usage: bash ai-core/hooks/extract-learning.sh "<skill>" "<task_summary>"

set -euo pipefail

SKILL="${1:-unknown}"
TASK_SUMMARY="${2:-no summary}"
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
DATE=$(date -u +"%Y-%m-%d")

# Only fire for builder and reviewer sessions
case "$SKILL" in
  *builder*|reviewer) ;;
  *) echo "Skipping extract-learning for skill: $SKILL"; exit 0 ;;
esac

# Tight prompt — bounded response, no long context
PROMPT="A Claude Code session just completed.
Skill: $SKILL
Task: $TASK_SUMMARY

In 1-2 sentences maximum, did anything happen in this session that future sessions should know about?
If nothing surprising or non-obvious occurred, reply with exactly: NOTHING
If something is worth capturing, reply with a single line in this format:
[$DATE] $SKILL — <insight> #candidate-for-promotion"

RESULT=$(echo "$PROMPT" | claude -p --max-tokens 100 2>/dev/null || echo "NOTHING")

if [ "$RESULT" != "NOTHING" ] && [ -n "$RESULT" ]; then
  echo "$RESULT" >> "$(dirname "$0")/../memory/learnings.md"
  echo "Learning captured: $RESULT"
else
  echo "No learning captured for this session."
fi
