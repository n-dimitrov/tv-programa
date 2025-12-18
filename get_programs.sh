#!/bin/bash

# TV Program Fetcher Script
# Fetches TV programs from Bulgarian National Television (BNT)

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PYTHON_SCRIPT="$SCRIPT_DIR/fetch_tv_program.py"
REQUIREMENTS="$SCRIPT_DIR/requirements.txt"

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Display usage
usage() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "OPTIONS:"
    echo "  -c, --channel CHANNEL    Channel name (default: bnt)"
    echo "  -d, --date DATE          Date path (default: Днес)"
    echo "                           Options: Вчера (yesterday), Днес (today), etc."
    echo "  -i, --install            Install/upgrade dependencies"
    echo "  -h, --help               Show this help message"
    echo ""
    echo "EXAMPLES:"
    echo "  $0                                    # Fetch yesterday's BNT programs"
    echo "  $0 --channel bnt2 --date Днес       # Fetch today's BNT2 programs"
    echo "  $0 -i                                # Install dependencies and fetch"
    exit 0
}

# Check if Python is installed
check_python() {
    if ! command -v python3 &> /dev/null; then
        echo "Error: python3 is not installed. Please install Python 3.6+"
        exit 1
    fi
    echo -e "${GREEN}✓${NC} Python3 found"
}

# Install dependencies
install_deps() {
    echo -e "${BLUE}Installing dependencies...${NC}"
    if [ -f "$REQUIREMENTS" ]; then
        pip install -q -r "$REQUIREMENTS"
        echo -e "${GREEN}✓${NC} Dependencies installed"
    else
        echo "Error: requirements.txt not found"
        exit 1
    fi
}

# Fetch programs
fetch_programs() {
    local channel="${1:-bnt}"
    local date_path="${2:-Днес}"

    echo -e "${BLUE}Fetching TV programs...${NC}"
    echo "Channel: $channel | Date: $date_path"
    echo ""

    python3 "$PYTHON_SCRIPT" "$channel" "$date_path"
}

# Parse command line arguments
CHANNEL="bnt"
DATE_PATH="Днес"
INSTALL_DEPS=false

while [[ $# -gt 0 ]]; do
    case $1 in
        -c|--channel)
            CHANNEL="$2"
            shift 2
            ;;
        -d|--date)
            DATE_PATH="$2"
            shift 2
            ;;
        -i|--install)
            INSTALL_DEPS=true
            shift
            ;;
        -h|--help)
            usage
            ;;
        *)
            echo "Unknown option: $1"
            usage
            ;;
    esac
done

# Main execution
check_python

if [ "$INSTALL_DEPS" = true ]; then
    install_deps
fi

# Check if dependencies are installed
if ! python3 -c "import requests, bs4" 2>/dev/null; then
    echo -e "${BLUE}Dependencies not found. Installing...${NC}"
    install_deps
fi

fetch_programs "$CHANNEL" "$DATE_PATH"
