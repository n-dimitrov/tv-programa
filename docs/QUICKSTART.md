# Quick Start Guide

## Setup (First Time Only)

### 1. Install Backend Dependencies
```bash
pip install -r requirements.txt
```

### 2. Install Frontend Dependencies
```bash
cd frontend
npm install
cd ..
```

## Running the Application

### Terminal 1: Start Backend (Port 8000)
```bash
./start-backend.sh
```

Or manually:
```bash
source venv/bin/activate
python app.py
```

### Terminal 2: Start Frontend (Port 3000)
```bash
cd frontend
npm start
```

Or:
```bash
cd frontend
./start-frontend.sh
```

## Access the Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs

## First Steps

1. **Fetch Program Data**:
   - Open http://localhost:8000/docs
   - Click "Try it out" on `/api/fetch`
   - Click "Execute" to fetch programs for yesterday
   - Wait for completion

2. **View Programs**:
   - Go to http://localhost:3000
   - Click "Programs" tab
   - Select a date from the tabs
   - Browse channels and their programs

3. **Manage Channels**:
   - Click "Manage Channels" tab
   - Toggle channels on/off
   - Click "Save All Changes"

## Features

✅ 7-day rolling window (auto-cleanup)
✅ Day tabs for easy browsing
✅ Channel management with search
✅ Beautiful, responsive UI
✅ REST API for automation
✅ Interactive API documentation

## Common Commands

### Fetch Programs via API
```bash
curl -X POST "http://localhost:8000/api/fetch?date_path=Вчера"
```

### Get All Channels
```bash
curl "http://localhost:8000/api/channels"
```

### Get Active Channels Only
```bash
curl "http://localhost:8000/api/channels/active"
```

### Get Programs for Specific Date
```bash
curl "http://localhost:8000/api/programs?date=2025-12-18"
```

## Troubleshooting

**Backend won't start**
- Check port 8000 is free: `lsof -i :8000`
- Kill existing process: `kill -9 <PID>`

**Frontend won't start**
- Check port 3000 is free: `lsof -i :3000`
- Clear cache: `cd frontend && npm cache clean --force`

**No programs showing**
- Fetch data first using the `/api/fetch` endpoint
- Check `data/programs/` directory for JSON files

**CORS errors**
- Backend is configured to accept all origins (development only)
- For production, update CORS settings in `app.py`

## Next Steps

1. Set up automatic scheduling:
   - Cron job (Linux/Mac)
   - Windows Task Scheduler
   - GitHub Actions
   - Other tools

2. Customize:
   - Modify colors in `frontend/src/App.css`
   - Update channel list in `tv_channels.json`
   - Adjust API endpoints as needed

3. Deploy:
   - Backend: Run on server with PM2/Gunicorn
   - Frontend: Build with `npm run build`
   - Serve static files from backend

For detailed information, see [README.md](README.md)
