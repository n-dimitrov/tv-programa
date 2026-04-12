#!/bin/bash
# Generate Oscar monthly summary from daily program files
# Usage: ./scripts/generate-monthly-summary.sh [YEAR] [MONTH]
# Example: ./scripts/generate-monthly-summary.sh 2026 3

set -e

# Load environment variables from .env.cloud if it exists
if [ -f ".env.cloud" ]; then
    export $(grep -v '^#' .env.cloud | xargs)
fi

# Defaults to current year/month
CURRENT_YEAR=$(date +%Y)
CURRENT_MONTH=$(date +%m)

YEAR=${1:-$CURRENT_YEAR}
MONTH=${2:-$((10#$CURRENT_MONTH))}  # Strip leading zero

# Validate month
if [ "$MONTH" -lt 1 ] || [ "$MONTH" -gt 12 ]; then
    echo "Error: Invalid month $MONTH (must be 1-12)"
    exit 1
fi

# Determine service URL
SERVICE_URL="${CLOUD_RUN_URL:-http://localhost:8000}"

MONTH_PAD=$(printf "%02d" $MONTH)

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 Generating Oscar Monthly Summary"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Period: ${YEAR}-${MONTH_PAD}"
echo "Target: data/summaries/${YEAR}-${MONTH_PAD}_oscar_monthly.json"
echo ""

# Call generation endpoint
echo "Calling POST ${SERVICE_URL}/api/oscars/monthly/generate..."
RESPONSE=$(curl -s -X POST "${SERVICE_URL}/api/oscars/monthly/generate?year=${YEAR}&month=${MONTH}")
HTTP_STATUS=$?

if [ $HTTP_STATUS -eq 0 ]; then
    echo "✓ Summary generated successfully"
    echo ""
    echo "Response:"
    echo "$RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$RESPONSE"
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "✓ Summary saved to: data/summaries/${YEAR}-${MONTH_PAD}_oscar_monthly.json"
    echo ""
    echo "Next steps:"
    echo "  1. Review the summary file"
    echo "  2. Make manual edits if needed"
    echo "  3. Archive the month: ./scripts/archive-month.sh"
else
    echo "✗ Failed to generate summary (HTTP error)"
    echo "$RESPONSE"
    exit 1
fi
