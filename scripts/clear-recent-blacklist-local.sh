#!/bin/bash
# Clear Oscar blacklist entries from the last N days (LOCAL STORAGE)

DAYS=${1:-2}

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# Run Python script with local storage
cd "$PROJECT_DIR"
python3 scripts/clear-recent-blacklist.py "$DAYS" local
