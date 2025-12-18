#!/bin/bash
# Run application locally with local file storage

set -e

# Load local environment
if [ -f .env.local ]; then
    export $(cat .env.local | grep -v '^#' | xargs)
fi

# Create data directories if they don't exist
mkdir -p data/programs

# Activate virtual environment
source venv/bin/activate

# Run the application
python app.py
