# TV Program Manager

A full-stack application to manage and display TV programs for Bulgarian TV channels with a 7-day rolling window. Features a FastAPI backend and React frontend.

## Features

- 📺 **7-Day Rolling Window**: Automatically maintains programs for the last 7 days
- 🔄 **Daily Data Collection**: REST API endpoint for fetching programs (integrate with your scheduler)
- 📱 **User-Friendly Interface**: Browse programs by date with day tabs
- ⚙️ **Channel Management**: Edit active/inactive status for all channels
- 🎨 **Modern UI**: Responsive design with beautiful styling
- 🔍 **Search & Filter**: Quickly find channels and programs
- 💾 **Storage Flexibility**: Supports both local filesystem and Google Cloud Storage
- 🏆 **Oscar Integration**: Automatic detection and annotation of Oscar-winning/nominated movies
- 🎬 **Movie Details**: Enhanced program info with posters, descriptions, and categories
- 📺 **Streaming Providers**: Shows where to watch movies (Netflix, HBO, etc.) - region-specific
- 🎯 **Smart Caching**: 30-minute cache for 7-day program data for optimal performance
- ☁️ **Cloud Ready**: Deploy to Google Cloud Run with GCS backend

## Project Structure

```
tv-programa/
├── app.py                      # FastAPI backend server
├── storage.py                  # Storage abstraction (local/cloud)
├── oscars_lookup.py            # Oscar winner/nominee detection
├── fetch_active_programs.py    # TV program fetcher
├── fetch_tv_program.py         # Web scraper for individual channels
├── requirements.txt            # Python dependencies
├── data/
│   ├── programs/               # Daily program files (YYYY-MM-DD.json)
│   │   └── 7days.json         # Cached 7-day aggregate
│   ├── tv_channels.json        # Channel configuration
│   ├── movies-min.json         # TMDB movie database
│   └── oscars-min.json         # Oscar winners/nominees data
├── scripts/
│   ├── run-local.sh            # Local development script
│   └── deploy-gcp.sh           # Google Cloud deployment script
└── frontend/                   # React application
    ├── src/
    │   ├── App.tsx
    │   ├── config.ts           # API configuration
    │   └── components/
    │       ├── ProgramsView.tsx      # Main programs view with Oscar badges
    │       └── ChannelManager.tsx    # Channel management UI
    ├── package.json
    └── build/                  # Production build
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

### Quick Start (Recommended)

Use the convenience script:
```bash
chmod +x scripts/run-local.sh
./scripts/run-local.sh
```

This automatically:
- Activates the virtual environment
- Sets `ENVIRONMENT=local` for local storage
- Starts the backend on `http://localhost:8000`

### Manual Start

**Backend:**
```bash
source venv/bin/activate
export ENVIRONMENT=local
python app.py
```

**Frontend (separate terminal):**
```bash
cd frontend
npm start
```

Frontend will be available at: `http://localhost:3000`

### Production Build

For production deployment with built frontend:
```bash
cd frontend
npm run build
cd ..
python app.py
```

Visit `http://localhost:8000` to access the full application.

## API Endpoints

### Fetch Programs
```
POST /api/fetch?date_path=Вчера
```
Fetches programs for active channels with Oscar detection
- **Parameters**: `date_path` (Вчера/Днес/Утре)
- **Returns**: Program data with Oscar annotations, streaming providers, and match statistics

### Get Programs for Date
```
GET /api/programs?date=2026-01-04
```
Returns programs for a specific date (default: today)

### Get Last 7 Days
```
GET /api/programs/7days
```
Returns all programs for the last 7 days (cached for 30 minutes)

### Manage Channels
```
GET /api/channels              # Get all channels
GET /api/channels/active       # Get only active channels
PUT /api/channels              # Update all channels
POST /api/channels/{id}/toggle # Toggle channel active status
```

### Application Status
```
GET /api/status                # Get app status and available dates
GET /api/config                # Get frontend configuration
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
- Programs display: time, title, description, and Oscar badges
- **Oscar Winners** 🏆: Gold badge with winner categories
- **Oscar Nominees** 🎬: Silver badge with nominee categories
- Click on Oscar-annotated programs to see:
  - Movie poster and English title
  - Full description and categories
  - Where to watch (streaming providers for your region)
  - Links to streaming services

### 2. **Manage Channels**
- Click "Manage Channels" tab
- Toggle channels on/off with checkboxes
- Search for channels using the search box
- Click "Save All Changes" to persist modifications

### 3. **Fetch New Programs**
- Use the REST API `/api/fetch` endpoint
- Programs are automatically:
  - Saved to storage (local or cloud)
  - Matched against Oscar database
  - Enriched with movie metadata from TMDB
  - Annotated with streaming providers
- Old files (> 7 days) are kept in storage but not loaded
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

### Environment Variables

Create `.env.local` for local development:
```bash
ENVIRONMENT=local
PROGRAMS_7DAYS_CACHE_TTL=1800  # Cache duration in seconds (30 min)
TMDB_API_KEY=your_api_key       # Optional: for streaming providers
TMDB_WATCH_REGION=BG            # Region for streaming availability
```

For cloud deployment, create `.env.cloud`:
```bash
ENVIRONMENT=cloud
GOOGLE_CLOUD_PROJECT=your-project-id
GCS_BUCKET_NAME=your-bucket-name
TMDB_API_KEY=your_api_key
TMDB_WATCH_REGION=BG
```

### Active Channels
Edit `data/tv_channels.json` to mark channels as active/inactive:
```json
{
  "id": "bnt",
  "name": "BNT",
  "icon": "/tvlogos/bnt.png",
  "active": true
}
```

Or use the Channel Manager UI to toggle them.

### Oscar Data
The application uses two data files for Oscar matching:
- `data/movies-min.json`: TMDB movie database
- `data/oscars-min.json`: Oscar winners and nominees

These files are included and automatically used if present.

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

- **Python**: 3.12+
- **Node.js**: 14+
- **npm**: 6+
- **Browsers**: Modern browser (Chrome, Firefox, Safari, Edge)

### Optional
- **TMDB API Key**: For streaming provider information ([Get free key](https://www.themoviedb.org/settings/api))
- **Google Cloud Account**: For cloud deployment with GCS
- **Docker**: For containerized deployment

## Cloud Deployment

See [CLOUD_DEPLOYMENT.md](CLOUD_DEPLOYMENT.md) for detailed instructions on deploying to Google Cloud Run with Cloud Storage.

Quick deploy:
```bash
./scripts/deploy-gcp.sh
```

## Documentation

- **[Getting Started](docs/GETTING_STARTED.md)**: Quick start guide
- **[Common Tasks](docs/COMMON_TASKS.md)**: Frequent operations
- **[Architecture](docs/ARCHITECTURE.md)**: System design overview
- **[Cloud Deployment](CLOUD_DEPLOYMENT.md)**: GCP deployment guide

## Future Enhancements

- [ ] Export programs to CSV/PDF
- [ ] Email notifications for specific programs
- [ ] Favorite/bookmark programs
- [ ] Dark mode
- [ ] Multiple language support
- [ ] Program ratings and reviews
- [ ] IMDb integration
- [ ] Series tracking
- [ ] Calendar export (iCal)
