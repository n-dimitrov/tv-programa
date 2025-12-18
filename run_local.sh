#!/bin/bash
set -e

echo "🚀 TV Program Manager - Local Development Server"
echo "=================================================="

# Check if venv exists, if not create it
if [ ! -d "venv" ]; then
    echo "📦 Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
echo "🔧 Activating virtual environment..."
source venv/bin/activate

# Install Python dependencies
echo "📚 Installing Python dependencies..."
pip install -q -r requirements.txt

# Build React frontend if not already built
if [ ! -d "frontend/build" ]; then
    echo "🎨 Building React frontend..."
    cd frontend
    npm install --silent
    npm run build
    cd ..
else
    echo "✓ React frontend already built"
fi

# Start the server
echo ""
echo "✨ Starting server on http://localhost:8000"
echo "📱 Frontend: http://localhost:8000"
echo "📖 API Docs: http://localhost:8000/docs"
echo ""
echo "Press Ctrl+C to stop"
echo ""

python app.py
