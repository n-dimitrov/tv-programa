#!/usr/bin/env bash
# quick-pulse.sh — 30-second health check for your AI-SDLC setup.
# Gives directional signal without the full quarterly assessment.
#
# Usage: bash ai-core/hooks/quick-pulse.sh
#
# No dependencies beyond bash and standard coreutils.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
AI_CORE="$SCRIPT_DIR/.."
SCORE=0
MAX=100

echo ""
echo "== AI-SDLC Quick Pulse ================================================"
echo ""

# ── 1. Skills exist? (20 points) ─────────────────────────────────────────────

SKILL_COUNT=0
if [ -d ".claude/skills" ]; then
  SKILL_COUNT=$(find .claude/skills -name "SKILL.md" -maxdepth 2 | wc -l | tr -d ' ')
fi

if [ "$SKILL_COUNT" -ge 5 ]; then
  SKILLS_SCORE=20
  SKILLS_STATUS="$SKILL_COUNT skills"
elif [ "$SKILL_COUNT" -ge 3 ]; then
  SKILLS_SCORE=12
  SKILLS_STATUS="$SKILL_COUNT skills (want 5+)"
elif [ "$SKILL_COUNT" -ge 1 ]; then
  SKILLS_SCORE=5
  SKILLS_STATUS="$SKILL_COUNT skills (want 5+)"
else
  SKILLS_SCORE=0
  SKILLS_STATUS="none found"
fi
SCORE=$((SCORE + SKILLS_SCORE))
echo "  1. Skills installed:     $SKILLS_STATUS [$SKILLS_SCORE/20]"

# ── 2. ADRs written? (20 points) ─────────────────────────────────────────────

ADR_COUNT=0
if [ -d "$AI_CORE/knowledge/architecture/adr" ]; then
  ADR_COUNT=$(find "$AI_CORE/knowledge/architecture/adr" -name "ADR-*.md" | wc -l | tr -d ' ')
fi

if [ "$ADR_COUNT" -ge 5 ]; then
  ADR_SCORE=20
  ADR_STATUS="$ADR_COUNT ADRs"
elif [ "$ADR_COUNT" -ge 2 ]; then
  ADR_SCORE=12
  ADR_STATUS="$ADR_COUNT ADRs (growing)"
elif [ "$ADR_COUNT" -ge 1 ]; then
  ADR_SCORE=5
  ADR_STATUS="$ADR_COUNT ADR"
else
  ADR_SCORE=0
  ADR_STATUS="none yet"
fi
SCORE=$((SCORE + ADR_SCORE))
echo "  2. ADRs documented:     $ADR_STATUS [$ADR_SCORE/20]"

# ── 3. Pattern docs populated? (20 points) ───────────────────────────────────

PATTERNS_FILE="$AI_CORE/knowledge/patterns/coding-patterns.md"
if [ -f "$PATTERNS_FILE" ]; then
  PATTERN_LINES=$(wc -l < "$PATTERNS_FILE" | tr -d ' ')
  if [ "$PATTERN_LINES" -gt 30 ]; then
    PATTERN_SCORE=20
    PATTERN_STATUS="rich ($PATTERN_LINES lines)"
  elif [ "$PATTERN_LINES" -gt 10 ]; then
    PATTERN_SCORE=12
    PATTERN_STATUS="started ($PATTERN_LINES lines)"
  else
    PATTERN_SCORE=3
    PATTERN_STATUS="sparse ($PATTERN_LINES lines)"
  fi
else
  PATTERN_SCORE=0
  PATTERN_STATUS="missing"
fi
SCORE=$((SCORE + PATTERN_SCORE))
echo "  3. Pattern docs:        $PATTERN_STATUS [$PATTERN_SCORE/20]"

# ── 4. Recent activity? (20 points) ──────────────────────────────────────────

LOG_FILE="$AI_CORE/meta/run-log.jsonl"
if [ -f "$LOG_FILE" ] && [ -s "$LOG_FILE" ]; then
  TOTAL_SESSIONS=$(wc -l < "$LOG_FILE" | tr -d ' ')
  LAST_ENTRY=$(tail -1 "$LOG_FILE")
  LAST_DATE=$(echo "$LAST_ENTRY" | grep -o '"timestamp"[[:space:]]*:[[:space:]]*"[^"]*"' | head -1 | grep -o '[0-9]\{4\}-[0-9]\{2\}-[0-9]\{2\}' || echo "unknown")

  if [ "$TOTAL_SESSIONS" -ge 10 ]; then
    ACTIVITY_SCORE=20
    ACTIVITY_STATUS="$TOTAL_SESSIONS sessions (last: $LAST_DATE)"
  elif [ "$TOTAL_SESSIONS" -ge 3 ]; then
    ACTIVITY_SCORE=12
    ACTIVITY_STATUS="$TOTAL_SESSIONS sessions (last: $LAST_DATE)"
  else
    ACTIVITY_SCORE=5
    ACTIVITY_STATUS="$TOTAL_SESSIONS sessions (just getting started)"
  fi
else
  ACTIVITY_SCORE=0
  ACTIVITY_STATUS="no run-log entries"
fi
SCORE=$((SCORE + ACTIVITY_SCORE))
echo "  4. Recent activity:     $ACTIVITY_STATUS [$ACTIVITY_SCORE/20]"

# ── 5. Memory pipeline healthy? (20 points) ──────────────────────────────────

LEARNINGS_COUNT=0
ANTIPATTERNS_COUNT=0

if [ -f "$AI_CORE/memory/learnings.md" ]; then
  LEARNINGS_COUNT=$(grep -c '#candidate-for-promotion\|#ready-for-promotion\|#watching' "$AI_CORE/memory/learnings.md" 2>/dev/null || echo 0)
fi
if [ -f "$AI_CORE/memory/anti-patterns.md" ]; then
  ANTIPATTERNS_COUNT=$(grep -c 'FAILED:' "$AI_CORE/memory/anti-patterns.md" 2>/dev/null || echo 0)
fi

MEMORY_TOTAL=$((LEARNINGS_COUNT + ANTIPATTERNS_COUNT))
if [ "$MEMORY_TOTAL" -ge 5 ]; then
  MEMORY_SCORE=20
  MEMORY_STATUS="$LEARNINGS_COUNT learnings, $ANTIPATTERNS_COUNT anti-patterns"
elif [ "$MEMORY_TOTAL" -ge 2 ]; then
  MEMORY_SCORE=12
  MEMORY_STATUS="$LEARNINGS_COUNT learnings, $ANTIPATTERNS_COUNT anti-patterns"
elif [ "$MEMORY_TOTAL" -ge 1 ]; then
  MEMORY_SCORE=5
  MEMORY_STATUS="$LEARNINGS_COUNT learnings, $ANTIPATTERNS_COUNT anti-patterns"
else
  MEMORY_SCORE=0
  MEMORY_STATUS="empty (nothing captured yet)"
fi
SCORE=$((SCORE + MEMORY_SCORE))
echo "  5. Memory pipeline:     $MEMORY_STATUS [$MEMORY_SCORE/20]"

# ── Summary ──────────────────────────────────────────────────────────────────

echo ""
echo "  ── Score: $SCORE / $MAX ──"
echo ""

if [ "$SCORE" -ge 70 ]; then
  echo "  Level: Autonomous — framework is well-established"
elif [ "$SCORE" -ge 40 ]; then
  echo "  Level: Agentic — good foundation, keep building"
else
  echo "  Level: Foundational — run /aisdlc-onboard to get started"
fi

# Actionable next step
echo ""
if [ "$SKILLS_SCORE" -lt 12 ]; then
  echo "  Next step: Run /aisdlc-onboard to set up skills and docs"
elif [ "$ADR_SCORE" -lt 12 ]; then
  echo "  Next step: Run /aisdlc-architect for your first architectural decision"
elif [ "$PATTERN_SCORE" -lt 12 ]; then
  echo "  Next step: Run /aisdlc-onboard on existing codebase to extract patterns"
elif [ "$ACTIVITY_SCORE" -lt 12 ]; then
  echo "  Next step: Use builder skills for your next feature to build run history"
elif [ "$MEMORY_SCORE" -lt 12 ]; then
  echo "  Next step: Run /aisdlc-reviewer after your next build to start capturing learnings"
else
  echo "  Next step: Run bash ai-core/hooks/compute-metrics.sh for full metrics"
fi

echo ""
echo "=================================================================="
