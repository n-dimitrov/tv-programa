#!/bin/bash
# Fetch today's TV programs with Oscar matching and AI validation
# Usage: ./scripts/fetch-active.sh [date] [output_file]
# Examples:
#   ./scripts/fetch-active.sh                          # today -> tv_programs_active.json
#   ./scripts/fetch-active.sh "Днес" test/today.json   # today -> test/today.json

set -e

cd "$(dirname "$0")/.."

if [ -f .env.local ]; then
    export $(cat .env.local | grep -v '^#' | xargs)
fi

source venv/bin/activate

python fetch_active_programs.py "${1:-Днес}" "${2:-tv_programs_active.json}"
