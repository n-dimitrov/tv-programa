# Getting Started with TV Program Manager

## 🚀 One-Time Setup

### Prerequisites
- Python 3.7+
- Node.js 14+ and npm
- Git (already set up)

### Installation Steps

```bash
# 1. Install Python backend dependencies
pip install -r requirements.txt

# 2. Install Node.js frontend dependencies
cd frontend
npm install
cd ..

# Done! You're ready to run the app
```

## 📺 Running the Application

### Option 1: Easy Mode (Recommended)

**Terminal 1 - Backend:**
```bash
./start-backend.sh
```

**Terminal 2 - Frontend:**
```bash
cd frontend
./start-frontend.sh
```

### Option 2: Manual Mode

**Terminal 1 - Backend:**
```bash
source venv/bin/activate  # if using virtual env
python app.py
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm start
```

## 🌐 Access Your App

- **Frontend UI**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Documentation**: http://localhost:8000/docs

## 📋 First-Time Usage

### Step 1: Fetch Program Data

Open http://localhost:8000/docs in your browser:

1. Find the **POST /api/fetch** endpoint
2. Click **"Try it out"**
3. Enter date_path (options: `Вчера`, `Днес`, `Утре`)
4. Click **"Execute"**
5. Wait for the request to complete

Or use curl:
```bash
curl -X POST "http://localhost:8000/api/fetch?date_path=Вчера"
```

### Step 2: View Programs

Open http://localhost:3000 in your browser:

1. You're in the **"Programs"** tab by default
2. Use date tabs at the top to browse different days
3. Programs are grouped by channel
4. Click any date to see that day's programs

### Step 3: Manage Channels

Click the **"Manage Channels"** tab:

1. See all available channels
2. Toggle channels on/off with checkboxes
3. Search for channels using the search box
4. Click **"Save All Changes"** to persist your settings

## 🔄 Setting Up Automatic Scheduling

You need to set up a scheduler to fetch programs automatically. Here are options:

### Option A: Cron Job (Linux/Mac)

Edit crontab:
```bash
crontab -e
```

Add this line (fetches every day at 2 AM):
```bash
0 2 * * * curl -X POST "http://localhost:8000/api/fetch?date_path=Вчера"
```

Change time as needed (format: `minute hour day month weekday`)

### Option B: Windows Task Scheduler

1. Open Task Scheduler
2. Create Basic Task
3. Set trigger: Daily at your preferred time
4. Set action: Start program with script/URL
5. Use: `curl -X POST "http://localhost:8000/api/fetch?date_path=Вчера"`

### Option C: GitHub Actions

Create `.github/workflows/fetch-programs.yml`:
```yaml
name: Fetch TV Programs
on:
  schedule:
    - cron: '0 2 * * *'  # Daily at 2 AM UTC
jobs:
  fetch:
    runs-on: ubuntu-latest
    steps:
      - name: Fetch programs
        run: curl -X POST "http://localhost:8000/api/fetch?date_path=Вчера"
```

### Option D: Other Tools

- APScheduler (Python)
- Celery (Python)
- n8n (Visual workflow)
- IFTTT
- Zapier

## 📁 Understanding the Data

### Program Files

Programs are stored in daily files:
```
data/programs/
├── 2025-12-18.json  (Today)
├── 2025-12-17.json  (Yesterday)
└── ...
```

Each file has structure:
```json
{
  "metadata": { ... },
  "programs": {
    "channel_id": {
      "channel": { "id": "...", "name": "...", "icon": "..." },
      "programs": [
        { "time": "HH:MM", "title": "...", "description": "..." }
      ]
    }
  }
}
```

### Auto-Cleanup

Files older than 7 days are automatically deleted. This keeps storage minimal.

### Channel Configuration

Edit `tv_channels.json` to manage channels:
```json
{
  "id": "bnt",
  "name": "BNT",
  "icon": "/tvlogos/bnt.png",
  "active": true  // Set to false to hide from fetching
}
```

Or use the UI to toggle channels.

## 🐛 Troubleshooting

### Backend won't start

**Error: "Port 8000 already in use"**
```bash
# Find and kill the process using port 8000
lsof -i :8000
kill -9 <PID>

# Or use different port
# Edit app.py, change: uvicorn.run(app, host="127.0.0.1", port=8001)
```

### Frontend won't start

**Error: "Node modules not found"**
```bash
cd frontend
npm install
npm start
```

**Error: "Port 3000 already in use"**
```bash
# Kill process or set different port
lsof -i :3000
kill -9 <PID>
```

### No programs showing

1. Check if you've fetched data yet (use POST /api/fetch)
2. Look in `data/programs/` directory
3. Make sure channels are marked as active in `tv_channels.json`
4. Check browser console for errors (F12)

### API not connecting (frontend to backend)

1. Ensure backend is running on port 8000
2. Check CORS settings (should work by default)
3. Try accessing http://localhost:8000 directly
4. Check browser console (F12) for error messages

### Programs not updating

1. Did you call the fetch endpoint? Use http://localhost:8000/docs
2. Check if scheduler is set up correctly
3. Verify the TV website is still working (might be down)
4. Check browser cache: Ctrl+Shift+R (hard refresh)

## 💡 Tips & Tricks

### API Endpoints You'll Use

```bash
# Fetch programs
curl -X POST "http://localhost:8000/api/fetch?date_path=Вчера"

# Get programs for specific date
curl "http://localhost:8000/api/programs?date=2025-12-18"

# Get all programs (last 7 days)
curl "http://localhost:8000/api/programs/7days"

# Get all channels
curl "http://localhost:8000/api/channels"

# Get only active channels
curl "http://localhost:8000/api/channels/active"

# Toggle a channel
curl -X POST "http://localhost:8000/api/channels/bnt/toggle"
```

### Useful Keyboard Shortcuts

- **Frontend**: Ctrl+Shift+R - Hard refresh (clear cache)
- **Backend Docs**: http://localhost:8000/docs - Try endpoints here
- **Browser DevTools**: F12 - Check errors and network requests

### Performance Tips

- Data is cached locally (no real-time fetching)
- Frontend loads programs on-demand
- Each day file is independent
- Storage is minimal (auto-cleanup after 7 days)

## 🚢 Deployment (Optional)

### Production Checklist

- [ ] Update CORS in `app.py` to specific origins
- [ ] Change database (if needed, currently uses JSON files)
- [ ] Add authentication
- [ ] Use environment variables for config
- [ ] Run backend with Gunicorn/PM2
- [ ] Build frontend: `npm run build`
- [ ] Serve files from CDN or reverse proxy

### Backend Deployment

```bash
# Install production server
pip install gunicorn

# Run with Gunicorn (4 workers)
gunicorn -w 4 -b 0.0.0.0:8000 app:app
```

### Frontend Deployment

```bash
# Build for production
cd frontend
npm run build

# Serve 'build' directory via web server (Nginx, Apache, etc.)
```

## 📚 More Information

- **README.md**: Full documentation
- **QUICKSTART.md**: Quick reference
- **ARCHITECTURE.md**: System design
- **IMPLEMENTATION_SUMMARY.md**: What was built

## ❓ FAQ

**Q: Can I run both on the same port?**
A: No, they need separate ports. Frontend on 3000, Backend on 8000.

**Q: Do I need a database?**
A: No, it uses JSON files locally.

**Q: Can I use a different scheduler?**
A: Yes, any tool that can make HTTP POST requests will work.

**Q: How long does data stay?**
A: 7 days. Older files are auto-deleted.

**Q: Can I customize the UI?**
A: Yes! Edit CSS files in `frontend/src/`

**Q: Is it secure?**
A: For development, yes. For production, update CORS and add authentication.

## 🎉 You're All Set!

Start the app and enjoy browsing your TV programs! If you have questions, check the documentation files or review the code comments.

**Happy viewing!** 📺
