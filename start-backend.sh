#!/bin/bash

# Start FastAPI backend server
echo "Starting TV Program Manager Backend..."
echo "API will be available at http://localhost:8000"
echo "API Docs at http://localhost:8000/docs"
echo ""

source venv/bin/activate
python app.py
