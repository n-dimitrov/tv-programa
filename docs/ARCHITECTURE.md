# Architecture Overview

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     External Scheduler                          │
│                   (Cron, GitHub Actions, etc.)                  │
└──────────────────────────┬──────────────────────────────────────┘
                           │ POST /api/fetch
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                      FastAPI Backend                            │
│                   (Python, Port 8000)                           │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                  REST API Endpoints                      │  │
│  │                                                          │  │
│  │  /api/fetch              - Fetch programs               │  │
│  │  /api/programs           - Get programs for date        │  │
│  │  /api/programs/7days     - Get 7-day programs           │  │
│  │  /api/channels           - Manage channels              │  │
│  │  /api/status             - Check application status     │  │
│  │  /docs                   - Interactive API docs         │  │
│  └──────────────────────────────────────────────────────────┘  │
│                           │                                      │
│              ┌────────────┴────────────┐                         │
│              ▼                         ▼                         │
│  ┌──────────────────────┐  ┌──────────────────────┐             │
│  │ TV Program Fetcher   │  │ Data Manager         │             │
│  │ (fetch_active_       │  │ (7-day rolling       │             │
│  │  programs.py)        │  │  window, auto-clean) │             │
│  └──────────┬───────────┘  └──────────┬───────────┘             │
│             │                         │                         │
│             └────────────┬────────────┘                         │
│                          ▼                                      │
│              ┌──────────────────────────┐                       │
│              │ data/programs/ (JSON)    │                       │
│              │                          │                       │
│              │ 2025-12-18.json (today)  │                       │
│              │ 2025-12-17.json (yesterday)                      │
│              │ ... (up to 7 days)       │                       │
│              └──────────────────────────┘                       │
└─────────────────────────────────────────────────────────────────┘
                           │ HTTP (CORS enabled)
                           │ 
┌──────────────────────────▼──────────────────────────────────────┐
│                     React Frontend                              │
│                  (TypeScript, Port 3000)                        │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                      App Component                       │  │
│  │                                                          │  │
│  │  ┌─────────────────────────────────────────────────┐    │  │
│  │  │          Navigation Bar                         │    │  │
│  │  │  [Programs Tab] [Manage Channels Tab]           │    │  │
│  │  └─────────────────────────────────────────────────┘    │  │
│  │                                                          │  │
│  │  ┌─────────────────────────────────────────────────┐    │  │
│  │  │  ProgramsView Component                         │    │  │
│  │  │  ┌───────────────────────────────────────────┐  │    │  │
│  │  │  │ Date Tabs (Last 7 Days)                  │  │    │  │
│  │  │  │ [Today] [Yesterday] [Day-6] ... [Day-1] │  │    │  │
│  │  │  └───────────────────────────────────────────┘  │    │  │
│  │  │                                                 │    │  │
│  │  │  ┌───────────────────────────────────────────┐  │    │  │
│  │  │  │ Channels Grid                             │  │    │  │
│  │  │  │ ┌─────────────────────────────────────┐   │  │    │  │
│  │  │  │ │ Channel Card                        │   │  │    │  │
│  │  │  │ │ [Channel Logo] Channel Name [37 prog│   │  │    │  │
│  │  │  │ ├─────────────────────────────────────┤   │  │    │  │
│  │  │  │ │ 00:30 - Program Title               │   │  │    │  │
│  │  │  │ │ 01:00 - Another Program             │   │  │    │  │
│  │  │  │ │ ...                                 │   │  │    │  │
│  │  │  │ └─────────────────────────────────────┘   │  │    │  │
│  │  │  └───────────────────────────────────────────┘  │    │  │
│  │  └─────────────────────────────────────────────────┘    │  │
│  │                                                          │  │
│  │  ┌─────────────────────────────────────────────────┐    │  │
│  │  │  ChannelManager Component                       │    │  │
│  │  │  ┌──────────────────────────────────────────┐   │    │  │
│  │  │  │ Search Box: [                         ]  │   │    │  │
│  │  │  │ Save All Changes Button                  │   │    │  │
│  │  │  └──────────────────────────────────────────┘   │    │  │
│  │  │                                                 │    │  │
│  │  │  ┌──────────────────────────────────────────┐   │    │  │
│  │  │  │ Channels Grid                            │   │    │  │
│  │  │  │ ┌─────────────────────────────────────┐   │   │    │  │
│  │  │  │ │ ☑ [Logo] Channel Name               │   │   │    │  │
│  │  │  │ │ ID: channel-id      ✓ Active        │   │   │    │  │
│  │  │  │ └─────────────────────────────────────┘   │   │    │  │
│  │  │  │ ☐ [Logo] Another Channel            │   │   │    │  │
│  │  │  │ ID: another-id      ○ Inactive       │   │   │    │  │
│  │  │  │ ...                                  │   │   │    │  │
│  │  │  └──────────────────────────────────────┘   │    │  │
│  │  └─────────────────────────────────────────────────┘    │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
│  Styling: Modern gradient UI, responsive grid layout            │
│  Colors: Purple gradient (#667eea - #764ba2)                   │
└─────────────────────────────────────────────────────────────────┘
                           │
                    (HTTP Requests)
                           │
                    User's Browser
```

## Data Flow Diagram

```
1. FETCH FLOW
═════════════════════════════════════════════════════════════

Scheduler → POST /api/fetch(date_path)
              ↓
         app.py: fetch_programs()
              ↓
         ActiveChannelFetcher
              ↓
         fetch_active_programs.py
              ↓
         TVProgramFetcher (Web Scraping)
              ↓
         Save to data/programs/YYYY-MM-DD.json
              ↓
         cleanup_old_programs() [delete files > 7 days]
              ↓
         Return: {status, channels_count, programs_count}

2. DISPLAY FLOW
═════════════════════════════════════════════════════════════

User selects date in Frontend
              ↓
React: GET /api/programs?date=YYYY-MM-DD
              ↓
app.py: load_programs_for_date()
              ↓
Read data/programs/YYYY-MM-DD.json
              ↓
Return JSON with programs grouped by channel
              ↓
Frontend renders channels grid with programs
              ↓
User sees:
  - Channel name, icon, program count
  - Programs with time, title, description

3. CHANNEL MANAGEMENT FLOW
═════════════════════════════════════════════════════════════

User toggles checkbox on channel
              ↓
React updates local state
              ↓
User clicks "Save All Changes"
              ↓
React: PUT /api/channels {channels: [...]}
              ↓
app.py: save_channels()
              ↓
Write updated tv_channels.json
              ↓
Return success response
              ↓
Frontend shows confirmation
```

## Component Hierarchy

```
App
├── Header
│   ├── Title
│   └── API Status Indicator
├── Navigation
│   ├── Programs Tab
│   └── Manage Channels Tab
├── Main Content (Dynamic)
│   ├── ProgramsView (when Programs tab selected)
│   │   ├── Date Tabs (last 7 days)
│   │   ├── Loading/Error States
│   │   └── Channels Grid
│   │       └── Channel Cards (repeating)
│   │           ├── Channel Header
│   │           └── Programs List
│   │
│   └── ChannelManager (when Manage Channels tab selected)
│       ├── Manager Header (stats)
│       ├── Search & Controls
│       └── Channels Grid
│           └── Channel Items (repeating)
│               ├── Checkbox
│               ├── Channel Info
│               └── Status Badge
└── Footer
```

## File Organization

```
tv-programa/
├── Backend Files
│   ├── app.py                       (FastAPI server, 271 lines)
│   ├── fetch_active_programs.py     (Program fetcher)
│   ├── fetch_tv_program.py          (Web scraper)
│   ├── tv_channels.json             (Channel config: 90+ channels)
│   └── data/
│       └── programs/
│           ├── 2025-12-18.json      (Today)
│           ├── 2025-12-17.json      (Yesterday)
│           └── ... (up to 7 days)
│
├── Frontend Files
│   └── frontend/
│       ├── src/
│       │   ├── App.tsx              (Main component, 61 lines)
│       │   ├── App.css              (App styling, 102 lines)
│       │   ├── index.tsx
│       │   ├── index.css
│       │   └── components/
│       │       ├── ProgramsView.tsx       (123 lines)
│       │       ├── ProgramsView.css       (159 lines)
│       │       ├── ChannelManager.tsx     (155 lines)
│       │       └── ChannelManager.css     (248 lines)
│       ├── public/
│       ├── package.json
│       └── tsconfig.json
│
├── Configuration & Scripts
│   ├── requirements.txt              (Python deps)
│   ├── start-backend.sh             (Backend startup)
│   ├── frontend/start-frontend.sh   (Frontend startup)
│
└── Documentation
    ├── README.md                    (Main documentation)
    ├── QUICKSTART.md               (Quick start guide)
    ├── IMPLEMENTATION_SUMMARY.md   (What was built)
    └── ARCHITECTURE.md             (This file)
```

## Technology Stack

### Backend
- **Framework**: FastAPI (modern, fast Python web framework)
- **Server**: Uvicorn (ASGI server)
- **Data Format**: JSON
- **File Storage**: Local filesystem
- **Existing**: beautifulsoup4 (web scraping)

### Frontend
- **Library**: React 18
- **Language**: TypeScript
- **Styling**: CSS (custom, no framework needed)
- **HTTP**: Fetch API
- **Build**: Create React App

### Deployment Ready
- Backend can run with: Gunicorn, PM2, Docker
- Frontend can build: `npm run build` → static files
- Database: Not needed (file-based storage)

## Key Design Decisions

1. **7-Day Rolling Window**: Automatic cleanup keeps storage minimal
2. **REST API**: Decoupled design allows any scheduler
3. **File-Based Storage**: No database setup needed
4. **React + TypeScript**: Type safety and modern development
5. **CORS Enabled**: Easy local development
6. **API Documentation**: Auto-generated via FastAPI
7. **Responsive Design**: Works on desktop and mobile
8. **Modular Frontend**: Separate components for Programs and Channels

## Security Considerations

### Current (Development)
- CORS allows all origins
- No authentication required
- API is open on localhost

### For Production
- Restrict CORS origins
- Add API key authentication
- Use HTTPS
- Run behind reverse proxy (Nginx)
- Add rate limiting
- Validate all inputs
- Use environment variables for config

## Performance Notes

- Programs cached in data/programs/ (no real-time scraping per request)
- Frontend lazy loads programs by date
- Grid layout uses CSS Grid (efficient rendering)
- Images optimized with error handling
- API responses are fast (file reads only)

## Extensibility

Easy to add:
- Database storage (replace file I/O in app.py)
- Authentication (add middleware to FastAPI)
- Export functionality (CSV, PDF generation)
- WebSocket support (real-time updates)
- Caching layer (Redis)
- Email notifications
- Program search/filtering
- User preferences
