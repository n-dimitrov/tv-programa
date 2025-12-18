# TV Program Manager

A full-stack application to manage and display TV programs for Bulgarian TV channels with a 7-day rolling window. Features a FastAPI backend and React frontend.

## Features

- 📺 **7-Day Rolling Window**: Automatically maintains programs for the last 7 days
- 🔄 **Daily Data Collection**: REST API endpoint for fetching programs (integrate with your scheduler)
- 📱 **User-Friendly Interface**: Browse programs by date with day tabs
- ⚙️ **Channel Management**: Edit active/inactive status for all channels
- 🎨 **Modern UI**: Responsive design with beautiful styling
- 🔍 **Search & Filter**: Quickly find channels
- 💾 **Automatic Cleanup**: Deletes programs older than 7 days

## Project Structure

```
tv-programa/
├── app.py                      # FastAPI backend server
├── fetch_active_programs.py    # TV program fetcher
├── fetch_tv_program.py         # Web scraper for individual channels
├── tv_channels.json            # Channel configuration
├── data/programs/              # Daily program files (YYYY-MM-DD.json)
├── requirements.txt            # Python dependencies
├── start-backend.sh            # Backend startup script
└── frontend/                   # React application
    ├── src/
    │   ├── App.tsx
    │   ├── App.css
    │   └── components/
    │       ├── ProgramsView.tsx
    │       ├── ChannelManager.tsx
    │       └── CSS files
    ├── package.json
    └── start-frontend.sh        # Frontend startup script
```

## Installation

### Backend Setup

1. Install Python dependencies:
```bash
pip install -r requirements.txt
```

### Frontend Setup

2. Install Node.js dependencies:
```bash
cd frontend
npm install
cd ..
```

## Running the Application

### Method 1: Run Backend and Frontend Separately

**Terminal 1 - Start Backend:**
```bash
chmod +x start-backend.sh
./start-backend.sh
```

Backend will be available at: `http://localhost:8000`

**Terminal 2 - Start Frontend:**
```bash
cd frontend
chmod +x start-frontend.sh
./start-frontend.sh
```

Frontend will be available at: `http://localhost:3000`

### Method 2: Manual Commands

**Backend:**
```bash
source venv/bin/activate
python app.py
```

**Frontend:**
```bash
cd frontend
npm start
```

## API Endpoints

### Fetch Programs
```
POST /api/fetch?date_path=Вчера
```
Fetches programs for active channels (date_path: Вчера/Днес/Утре)

### Get Programs for Date
```
GET /api/programs?date=2025-12-18
```
Returns programs for a specific date

### Get Last 7 Days
```
GET /api/programs/7days
```
Returns all programs for the last 7 days

### Manage Channels
```
GET /api/channels              # Get all channels
GET /api/channels/active       # Get only active channels
PUT /api/channels              # Update all channels
POST /api/channels/{id}/toggle # Toggle channel active status
```

### API Documentation
Access interactive API docs at: `http://localhost:8000/docs`

## Scheduling

To fetch programs automatically, use your preferred scheduler:

- **Cron (Linux/Mac)**:
  ```bash
  0 2 * * * cd /path/to/tv-programa && source venv/bin/activate && python -c "from fetch_active_programs import ActiveChannelFetcher; ActiveChannelFetcher().fetch_all_programs('Вчера')"
  ```

- **Windows Task Scheduler**: Create a task that calls the API endpoint

- **Other Tools**: APScheduler, Celery, GitHub Actions, etc.

Example API call (from anywhere):
```bash
curl -X POST "http://localhost:8000/api/fetch?date_path=Вчера"
```

## Usage Guide

### 1. **View Programs (Last 7 Days)**
- Click "Programs" tab in the top navigation
- Select a date from the date tabs
- Browse channels and their programs for that day
- Programs display: time, title, and description

### 2. **Manage Channels**
- Click "Manage Channels" tab
- Toggle channels on/off with checkboxes
- Search for channels using the search box
- Click "Save All Changes" to persist modifications

### 3. **Fetch New Programs**
- Use the REST API `/api/fetch` endpoint
- Programs are automatically saved to `data/programs/YYYY-MM-DD.json`
- Old files (> 7 days) are automatically deleted
- Schedule this via cron, GitHub Actions, or any other tool

## Data Structure

### Daily Program File (`data/programs/2025-12-18.json`)
```json
{
  "metadata": {
    "timestamp": "2025-12-18T09:07:18.236670",
    "date": "Вчера",
    "total_channels": 11,
    "channels_with_programs": 11
  },
  "programs": {
    "bnt": {
      "channel": {
        "id": "bnt",
        "name": "BNT",
        "icon": "/tvlogos/bnt.png"
      },
      "programs": [
        {
          "time": "00:30",
          "title": "Program Title",
          "description": "Program description..."
        }
      ],
      "count": 37
    }
  }
}
```

## Configuration

### Active Channels
Edit `tv_channels.json` to mark channels as active/inactive:
```json
{
  "id": "bnt",
  "name": "BNT",
  "icon": "/tvlogos/bnt.png",
  "active": true
}
```

Or use the Channel Manager UI to toggle them.

## Troubleshooting

### API not connecting
- Ensure backend is running on `http://localhost:8000`
- Check if port 8000 is available
- Verify firewall settings

### No programs showing
- Fetch programs first via `/api/fetch` endpoint
- Check `data/programs/` directory for JSON files
- Verify active channels are set

### Frontend won't start
- Clear node_modules: `rm -rf frontend/node_modules`
- Reinstall: `cd frontend && npm install`
- Check Node.js version: `node --version` (need v14+)

## Requirements

- **Python**: 3.7+
- **Node.js**: 14+
- **npm**: 6+
- **Browsers**: Modern browser (Chrome, Firefox, Safari, Edge)

## Future Enhancements

- [ ] Export programs to CSV/PDF
- [ ] Email notifications for specific programs
- [ ] Favorite/bookmark programs
- [ ] Dark mode
- [ ] Multiple language support
- [ ] Program ratings and reviews
- [ ] Notification system for upcoming programs
