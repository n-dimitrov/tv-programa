#!/usr/bin/env python3
"""FastAPI backend for TV program manager with 7-day rolling window"""

import json
import os
import time
from datetime import datetime, timedelta
from pathlib import Path
from typing import List, Dict, Optional
from threading import Lock

from fastapi import FastAPI, HTTPException, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel

from fetch_active_programs import ActiveChannelFetcher
from fetch_tv_program import TVProgramFetcher
from storage import get_storage_provider

# Configuration
DATA_DIR = Path("data/programs")
BASE_URL = TVProgramFetcher.BASE_URL
DATA_DIR.mkdir(parents=True, exist_ok=True)
CHANNELS_FILE = "data/tv_channels.json"
AGGREGATE_7DAYS_FILE = "data/programs/7days.json"
CACHE_TTL_SECONDS = int(os.getenv("PROGRAMS_7DAYS_CACHE_TTL", "1800"))

# Initialize storage provider (local or cloud)
storage = get_storage_provider()
_programs_7days_cache = {"data": None, "expires_at": 0.0}
_programs_7days_lock = Lock()

# Pydantic models
class Channel(BaseModel):
    id: str
    name: str
    icon: str
    active: bool

class ChannelsUpdate(BaseModel):
    channels: List[Channel]

class FetchRequest(BaseModel):
    date_path: str = "Днес"

class Program(BaseModel):
    time: str
    title: str
    description: Optional[str] = None
    full: Optional[str] = None
    oscar: Optional[Dict[str, object]] = None

class ChannelPrograms(BaseModel):
    channel_id: str
    channel_name: str
    icon: str
    programs: List[Program]

# Initialize FastAPI app
app = FastAPI(
    title="TV Program Manager",
    description="Manage TV programs with 7-day rolling window",
    version="1.0.0",
    docs_url=None,
    redoc_url=None
)

# CORS middleware - allow requests from frontend during development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify exact origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Utility functions
def build_logo_url(icon_path: str) -> str:
    """Build full logo URL from icon path"""
    if not icon_path:
        return ""
    return f"{BASE_URL}{icon_path}"

def load_channels() -> List[Dict]:
    """Load channels from tv_channels.json"""
    data = storage.read_json(CHANNELS_FILE)
    if data:
        return data.get('channels', [])
    return []

def save_channels(channels: List[Dict]) -> bool:
    """Save channels to tv_channels.json"""
    return storage.write_json(CHANNELS_FILE, {'channels': channels})

def cleanup_old_programs() -> None:
    """No longer deletes old files - they are kept in storage but not loaded"""
    # Old files are kept in storage but filtered out when loading data
    # This function is now a no-op but kept for backward compatibility
    pass

def get_program_file_path(date: Optional[str] = None) -> Path:
    """Get program file path for a specific date"""
    if date is None:
        date_str = datetime.now().date().isoformat()
    else:
        # Parse date if provided (format: YYYY-MM-DD)
        date_str = date
    return DATA_DIR / f"{date_str}.json"

def save_programs_for_date(programs_data: Dict, date: Optional[str] = None) -> bool:
    """Save programs for a specific date"""
    file_path = str(get_program_file_path(date))
    success = storage.write_json(file_path, programs_data)
    if success:
        print(f"Saved programs to {file_path}")
    return success

def load_programs_for_date(date: str) -> Optional[Dict]:
    """Load programs for a specific date"""
    file_path = str(get_program_file_path(date))
    return storage.read_json(file_path)

def load_7days_aggregate() -> Optional[Dict]:
    """Load the precomputed 7-day aggregate if available"""
    payload = storage.read_json(AGGREGATE_7DAYS_FILE)
    if not payload:
        return None
    if isinstance(payload, dict) and "data" in payload:
        return payload.get("data")
    return payload

def save_7days_aggregate(data: Dict) -> bool:
    """Save the 7-day aggregate to storage with metadata"""
    payload = {
        "generated_at": datetime.now().isoformat(),
        "data": data,
    }
    return storage.write_json(AGGREGATE_7DAYS_FILE, payload)

def get_last_7_days() -> List[str]:
    """Get dates for the last 7 days (including today)"""
    today = datetime.now().date()
    return [(today - timedelta(days=i)).isoformat() for i in range(6, -1, -1)]

def build_7days_data() -> Dict:
    """Build 7-day data from daily files"""
    result = {}
    for date in get_last_7_days():
        programs = load_programs_for_date(date)
        if programs:
            result[date] = programs
    return result

def get_cached_7days() -> Optional[Dict]:
    """Return cached 7-day data if fresh"""
    now = time.time()
    with _programs_7days_lock:
        if _programs_7days_cache["data"] and _programs_7days_cache["expires_at"] > now:
            return _programs_7days_cache["data"]
    return None

def set_cached_7days(data: Dict) -> None:
    """Update in-memory cache for 7-day data"""
    with _programs_7days_lock:
        _programs_7days_cache["data"] = data
        _programs_7days_cache["expires_at"] = time.time() + CACHE_TTL_SECONDS

def refresh_7days_aggregate() -> Dict:
    """Rebuild and persist 7-day aggregate, and update cache"""
    data = build_7days_data()
    if data:
        save_7days_aggregate(data)
        set_cached_7days(data)
    return data

# API Endpoints
# Note: Root "/" endpoint removed - now serves React frontend at /

@app.get("/api/config")
async def get_config():
    """Get configuration including logo base URL"""
    return {
        "logo_base_url": BASE_URL
    }

@app.post("/api/fetch")
async def fetch_programs(request: FetchRequest = FetchRequest()):
    """
    Fetch TV programs for active channels (defaults to TODAY)

    Args:
        request: FetchRequest with date_path: 'Днес' (today - default), 'Вчера' (yesterday), 'Утре' (tomorrow), etc.
                  For today: URL is just /tv/{channel}
                  For other dates: /tv/{channel}/{date_path}/

    Returns:
        Fetched programs data
    """
    try:
        # Map date_path to actual date
        today = datetime.now().date()
        if request.date_path == "Вчера":
            target_date = today - timedelta(days=1)
        elif request.date_path == "Днес":
            target_date = today
        elif request.date_path == "Утре":
            target_date = today + timedelta(days=1)
        else:
            target_date = today

        fetcher = ActiveChannelFetcher(CHANNELS_FILE, storage_provider=storage)
        data = fetcher.fetch_all_programs(date_path=request.date_path, target_date=target_date.isoformat())

        # Save to daily file
        save_programs_for_date(data, target_date.isoformat())

        oscar_titles = []
        oscar_winners = 0
        oscar_total = 0
        oscar_seen = set()
        oscar_info = ""
        if data.get("programs"):
            for channel_data in data["programs"].values():
                for program in channel_data.get("programs", []):
                    oscar = program.get("oscar")
                    if not oscar:
                        continue
                    title = program.get("title")
                    title_en = oscar.get("title_en")
                    dedupe_key = (title or "").strip().lower(), (title_en or "").strip().lower()
                    if dedupe_key in oscar_seen:
                        continue
                    oscar_seen.add(dedupe_key)
                    oscar_total += 1
                    if oscar.get("winner", 0) > 0:
                        oscar_winners += 1
                    winner_count = oscar.get("winner", 0)
                    nominee_count = oscar.get("nominee", 0)
                    watch_info = oscar.get("watch")
                    year = oscar.get("year")
                    oscar_titles.append(
                        {
                            "title": title,
                            "title_en": title_en,
                            "year": year,
                            "winner": winner_count,
                            "nominee": nominee_count,
                            "watch": watch_info,
                        }
                    )

        if oscar_titles:
            def format_counts(wins: int, noms: int) -> str:
                parts = []
                if wins:
                    label = "Oscar" if wins == 1 else "Oscars"
                    parts.append(f"{wins} {label}")
                if noms:
                    label = "Nomination" if noms == 1 else "Nominations"
                    parts.append(f"{noms} {label}")
                return ", ".join(parts) if parts else "0 Nominations"

            winners_lines = []
            nominees_lines = []
            for item in oscar_titles:
                title = item.get("title") or "Unknown title"
                title_en = item.get("title_en")
                year = item.get("year")
                wins = item.get("winner", 0)
                noms = item.get("nominee", 0)
                watch = item.get("watch") or {}
                providers = []
                for key in ("flatrate", "rent", "buy"):
                    for entry in watch.get(key, []) or []:
                        name = entry.get("provider_name")
                        if name and name not in providers:
                            providers.append(name)
                watch_note = f" (Watch: {', '.join(providers)})" if providers else ""
                
                # Format title with year
                if title_en and year:
                    display_title = f"{title} / {title_en} ({year})"
                elif title_en:
                    display_title = f"{title} / {title_en}"
                elif year:
                    display_title = f"{title} ({year})"
                else:
                    display_title = title
                
                line = f"- {display_title} - {format_counts(wins, noms)}{watch_note}"
                if wins > 0:
                    winners_lines.append(line)
                elif noms > 0:
                    nominees_lines.append(line)

            winners_list = (
                "<ul>" + "".join(f"<li>{line[2:]}</li>" for line in winners_lines) + "</ul>"
                if winners_lines
                else "<p>None</p>"
            )
            nominees_list = (
                "<ul>" + "".join(f"<li>{line[2:]}</li>" for line in nominees_lines) + "</ul>"
                if nominees_lines
                else "<p>None</p>"
            )
            oscar_info = (
                f"<p><strong>Oscar winners ({len(winners_lines)})</strong></p>"
                f"{winners_list}"
                f"<p><strong>Oscar nominees ({len(nominees_lines)})</strong></p>"
                f"{nominees_list}"
            )

        # Note: Old files (> 7 days) are kept in storage but not loaded
        # No cleanup/deletion is performed

        # Update 7-day aggregate and cache
        refresh_7days_aggregate()

        return {
            "status": "success",
            "message": f"Fetched programs for {request.date_path}",
            "date": target_date.isoformat(),
            "channels_with_programs": data['metadata']['channels_with_programs'],
            "total_channels": data['metadata']['total_channels'],
            "oscar_summary": {
                "total_oscar_programs": oscar_total,
                "winners": oscar_winners,
                "nominees_only": oscar_total - oscar_winners,
                "titles": oscar_titles,
            },
            "oscar_info_summary": (
                f"{target_date.isoformat()}: "
                f"{oscar_total} movies ({oscar_winners}/{oscar_total - oscar_winners})"
            ),
            "oscar_info": oscar_info,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/programs")
async def get_programs(date: Optional[str] = None):
    """
    Get TV programs for a specific date

    Args:
        date: Date in format YYYY-MM-DD (default: today)

    Returns:
        Programs grouped by channel
    """
    data = load_programs_for_date(date)
    if not data:
        raise HTTPException(status_code=404, detail="No programs found for this date")

    return data

@app.get("/api/programs/7days")
async def get_programs_7days():
    """
    Get all programs for the last 7 days (only loads recent data)

    Returns:
        Dictionary with dates as keys and program data as values
    """
    cached = get_cached_7days()
    if cached:
        return cached

    aggregate = load_7days_aggregate()
    if aggregate:
        set_cached_7days(aggregate)
        return aggregate

    result = refresh_7days_aggregate()
    if not result:
        raise HTTPException(status_code=404, detail="No programs found")

    return result

@app.get("/api/channels")
async def get_channels():
    """Get all channels"""
    channels = load_channels()
    return {"channels": channels}

@app.get("/api/channels/active")
async def get_active_channels():
    """Get only active channels"""
    channels = load_channels()
    active = [ch for ch in channels if ch.get('active', False)]
    return {"channels": active}

@app.put("/api/channels")
async def update_channels(data: ChannelsUpdate):
    """
    Update channels (active/inactive status)

    Args:
        data: List of channels with updated active status

    Returns:
        Updated channels
    """
    channels = data.channels
    success = save_channels([ch.model_dump() for ch in channels])

    if not success:
        raise HTTPException(status_code=500, detail="Failed to save channels")

    return {
        "status": "success",
        "message": "Channels updated",
        "channels": channels
    }

@app.post("/api/channels/{channel_id}/toggle")
async def toggle_channel(channel_id: str):
    """Toggle active status of a channel"""
    channels = load_channels()

    for ch in channels:
        if ch['id'] == channel_id:
            ch['active'] = not ch['active']
            if save_channels(channels):
                return {
                    "status": "success",
                    "channel_id": channel_id,
                    "active": ch['active']
                }
            else:
                raise HTTPException(status_code=500, detail="Failed to save channels")

    raise HTTPException(status_code=404, detail="Channel not found")

@app.get("/api/status")
async def get_status():
    """Get application status (only checks last 7 days)"""
    dates = get_last_7_days()
    available_dates = []

    for date in dates:
        file_path = str(get_program_file_path(date))
        available_dates.append({
            "date": date,
            "available": storage.file_exists(file_path)
        })

    # Get all files in storage for info (including old ones)
    all_files = storage.list_files("data/programs")
    total_files = len(all_files)

    return {
        "status": "running",
        "data_directory": str(DATA_DIR),
        "available_dates": available_dates,
        "total_channels": len(load_channels()),
        "active_channels": len([ch for ch in load_channels() if ch.get('active', False)]),
        "total_files_in_storage": total_files,
        "loaded_files_count": len([d for d in available_dates if d["available"]])
    }

@app.get("/api/oscars")
async def get_oscar_programs():
    """Get all programs with Oscar annotations from the last 7 days, grouped by movie"""
    data = get_cached_7days()
    if not data:
        data = load_7days_aggregate()
        if data:
            set_cached_7days(data)

    if not data:
        data = build_7days_data()
        if data:
            set_cached_7days(data)

    # Group by movie (title + title_en)
    movies_map = {}

    for date, date_data in data.items():
        programs_by_channel = date_data.get("programs", {})
        for channel_id, channel_data in programs_by_channel.items():
            # Channel info is nested under 'channel' key
            channel_info = channel_data.get("channel", {})
            channel_name = channel_info.get("name", "Unknown")
            channel_icon = channel_info.get("icon", "")
            for program in channel_data.get("programs", []):
                oscar = program.get("oscar")
                if not oscar:
                    continue

                title = program.get("title", "")
                title_en = oscar.get("title_en", "")
                year = oscar.get("year")

                # Group by title
                movie_key = (title.strip().lower(), (title_en or "").strip().lower())

                if movie_key not in movies_map:
                    movies_map[movie_key] = {
                        "title": title,
                        "title_en": title_en,
                        "year": year,
                        "winner": oscar.get("winner", 0),
                        "nominee": oscar.get("nominee", 0),
                        "winner_categories": oscar.get("winner_categories", []),
                        "nominee_categories": oscar.get("nominee_categories", []),
                        "poster_path": oscar.get("poster_path"),
                        "overview": oscar.get("overview"),
                        "watch": oscar.get("watch"),
                        "broadcasts": []
                    }

                # Add this broadcast
                movies_map[movie_key]["broadcasts"].append({
                    "channel_id": channel_id,
                    "channel_name": channel_name,
                    "channel_icon": build_logo_url(channel_icon),
                    "time": program.get("time"),
                    "date": date,
                    "description": program.get("description")
                })

    # Convert to list and sort
    oscar_programs = list(movies_map.values())
    oscar_programs.sort(key=lambda x: (x["winner"], x["nominee"]), reverse=True)

    return {"programs": oscar_programs, "total": len(oscar_programs)}

@app.get("/api/oscars/catalog")
async def get_oscar_catalog():
    """Get full Oscar movie catalog (year, English title, Bulgarian title)."""
    movies_path = Path("data/movies-min.json")
    movies_data: Dict[str, Dict] = {}
    try:
        if movies_path.exists():
            with movies_path.open("r", encoding="utf-8") as f:
                movies_data = json.load(f) or {}
    except Exception:
        movies_data = {}

    programs = []
    for movie in movies_data.values():
        title_en = (movie.get("title") or "").strip()
        title_bg = (movie.get("title_bg") or "").strip()
        year_raw = movie.get("year")
        try:
            year = int(year_raw)
        except (TypeError, ValueError):
            year = 0

        if not title_en and not title_bg:
            continue

        programs.append({
            "year": year,
            "title_en": title_en,
            "title": title_bg,
        })

    programs.sort(
        key=lambda x: (
            x.get("year", 0),
            (x.get("title_en") or "").lower(),
            (x.get("title") or "").lower(),
        ),
        reverse=True
    )

    return {"programs": programs, "total": len(programs)}

class ExcludeRequest(BaseModel):
    title: str
    scope: str  # "broadcast", "channel", or "all"
    channel_id: Optional[str] = None
    date: Optional[str] = None
    time: Optional[str] = None
    description: Optional[str] = None

@app.post("/api/oscars/exclude")
async def exclude_oscar_program(request: ExcludeRequest):
    """Add a program to the Oscar blacklist"""
    blacklist_file = Path("data/oscar_blacklist.json")
    data = storage.read_json(str(blacklist_file)) or {"excluded": []}

    # Create exclusion entry
    entry = {
        "title": request.title,
        "scope": request.scope
    }

    if request.scope in ["channel", "broadcast"]:
        entry["channel_id"] = request.channel_id

    if request.scope == "broadcast":
        entry["date"] = request.date
        entry["time"] = request.time
        if request.description:
            entry["description"] = request.description

    # Check if already excluded
    from oscars_lookup import _normalize_title
    title_normalized = _normalize_title(request.title)

    for existing in data["excluded"]:
        if _normalize_title(existing.get("title", "")) != title_normalized:
            continue
        if existing.get("scope") != request.scope:
            continue
        if request.scope == "channel" and existing.get("channel_id") == request.channel_id:
            return {"success": True, "message": "Already excluded", "entry": entry}
        if request.scope == "broadcast":
            if (existing.get("channel_id") == request.channel_id and
                existing.get("date") == request.date and
                existing.get("time") == request.time):
                return {"success": True, "message": "Already excluded", "entry": entry}
        if request.scope == "all":
            return {"success": True, "message": "Already excluded", "entry": entry}

    # Add to blacklist
    data["excluded"].append(entry)
    storage.write_json(str(blacklist_file), data)

    return {"success": True, "excluded": entry}

@app.delete("/api/oscars/exclude")
async def unexclude_oscar_program(request: ExcludeRequest):
    """Remove a program from the Oscar blacklist"""
    from oscars_lookup import _normalize_title

    blacklist_file = Path("data/oscar_blacklist.json")
    data = storage.read_json(str(blacklist_file)) or {"excluded": []}

    title_normalized = _normalize_title(request.title)

    # Find and remove matching entry
    new_excluded = []
    removed = None

    for entry in data["excluded"]:
        if _normalize_title(entry.get("title", "")) != title_normalized:
            new_excluded.append(entry)
            continue

        if entry.get("scope") != request.scope:
            new_excluded.append(entry)
            continue

        # Check scope-specific match
        should_remove = False
        if request.scope == "all":
            should_remove = True
        elif request.scope == "channel":
            should_remove = entry.get("channel_id") == request.channel_id
        elif request.scope == "broadcast":
            should_remove = (entry.get("channel_id") == request.channel_id and
                           entry.get("date") == request.date and
                           entry.get("time") == request.time)

        if should_remove:
            removed = entry
        else:
            new_excluded.append(entry)

    data["excluded"] = new_excluded
    storage.write_json(str(blacklist_file), data)

    return {"success": True, "removed": removed}

@app.get("/api/oscars/blacklist")
async def get_oscar_blacklist():
    """Get all blacklisted programs"""
    blacklist_file = Path("data/oscar_blacklist.json")
    data = storage.read_json(str(blacklist_file)) or {"excluded": []}

    return {"blacklist": data.get("excluded", []), "total": len(data.get("excluded", []))}

# Serve React static files and handle SPA routing
frontend_build_dir = Path("frontend/build")
if frontend_build_dir.exists():
    # Mount static files (JS, CSS, images)
    app.mount("/static", StaticFiles(directory=str(frontend_build_dir / "static")), name="static")

    @app.get("/{full_path:path}")
    async def serve_frontend(full_path: str):
        """Serve React frontend for all non-API routes"""
        # Try to serve the requested file
        requested_file = frontend_build_dir / full_path
        if requested_file.exists() and requested_file.is_file():
            return FileResponse(requested_file)

        # Otherwise serve index.html for React Router
        index_file = frontend_build_dir / "index.html"
        if index_file.exists():
            return FileResponse(index_file)

        raise HTTPException(status_code=404, detail="Not found")

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
