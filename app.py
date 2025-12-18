#!/usr/bin/env python3
"""FastAPI backend for TV program manager with 7-day rolling window"""

import json
import os
from datetime import datetime, timedelta
from pathlib import Path
from typing import List, Dict, Optional

from fastapi import FastAPI, HTTPException, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel

from fetch_active_programs import ActiveChannelFetcher
from fetch_tv_program import TVProgramFetcher

# Configuration
DATA_DIR = Path("data/programs")
BASE_URL = TVProgramFetcher.BASE_URL
DATA_DIR.mkdir(parents=True, exist_ok=True)
CHANNELS_FILE = "tv_channels.json"

# Pydantic models
class Channel(BaseModel):
    id: str
    name: str
    icon: str
    active: bool

class ChannelsUpdate(BaseModel):
    channels: List[Channel]

class Program(BaseModel):
    time: str
    title: str
    description: Optional[str] = None
    full: Optional[str] = None

class ChannelPrograms(BaseModel):
    channel_id: str
    channel_name: str
    icon: str
    programs: List[Program]

# Initialize FastAPI app
app = FastAPI(
    title="TV Program Manager",
    description="Manage TV programs with 7-day rolling window",
    version="1.0.0"
)

# CORS middleware removed - frontend and backend are now served from same origin

# Utility functions
def build_logo_url(icon_path: str) -> str:
    """Build full logo URL from icon path"""
    if not icon_path:
        return ""
    return f"{BASE_URL}{icon_path}"

def load_channels() -> List[Dict]:
    """Load channels from tv_channels.json"""
    try:
        with open(CHANNELS_FILE, 'r', encoding='utf-8') as f:
            data = json.load(f)
            return data.get('channels', [])
    except Exception as e:
        print(f"Error loading channels: {e}")
        return []

def save_channels(channels: List[Dict]) -> bool:
    """Save channels to tv_channels.json"""
    try:
        with open(CHANNELS_FILE, 'w', encoding='utf-8') as f:
            json.dump({'channels': channels}, f, ensure_ascii=False, indent=2)
        return True
    except Exception as e:
        print(f"Error saving channels: {e}")
        return False

def cleanup_old_programs() -> None:
    """Remove program files older than 7 days"""
    today = datetime.now().date()
    seven_days_ago = today - timedelta(days=7)

    for file in DATA_DIR.glob("*.json"):
        try:
            file_date = datetime.strptime(file.stem, "%Y-%m-%d").date()
            if file_date < seven_days_ago:
                file.unlink()
                print(f"Deleted old program file: {file.name}")
        except ValueError:
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
    file_path = get_program_file_path(date)
    try:
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(programs_data, f, ensure_ascii=False, indent=2)
        print(f"Saved programs to {file_path}")
        return True
    except Exception as e:
        print(f"Error saving programs: {e}")
        return False

def load_programs_for_date(date: str) -> Optional[Dict]:
    """Load programs for a specific date"""
    file_path = get_program_file_path(date)
    if not file_path.exists():
        return None

    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception as e:
        print(f"Error loading programs: {e}")
        return None

def get_last_7_days() -> List[str]:
    """Get dates for the last 7 days (including today)"""
    today = datetime.now().date()
    return [(today - timedelta(days=i)).isoformat() for i in range(6, -1, -1)]

# API Endpoints
# Note: Root "/" endpoint removed - now serves React frontend at /

@app.get("/api/config")
async def get_config():
    """Get configuration including logo base URL"""
    return {
        "logo_base_url": BASE_URL
    }

@app.post("/api/fetch")
async def fetch_programs(date_path: str = "Днес"):
    """
    Fetch TV programs for active channels (defaults to TODAY)

    Args:
        date_path: 'Днес' (today - default), 'Вчера' (yesterday), 'Утре' (tomorrow), etc.
                  For today: URL is just /tv/{channel}
                  For other dates: /tv/{channel}/{date_path}/

    Returns:
        Fetched programs data
    """
    try:
        fetcher = ActiveChannelFetcher(CHANNELS_FILE)
        data = fetcher.fetch_all_programs(date_path=date_path)

        # Map date_path to actual date
        today = datetime.now().date()
        if date_path == "Вчера":
            target_date = today - timedelta(days=1)
        elif date_path == "Днес":
            target_date = today
        elif date_path == "Утре":
            target_date = today + timedelta(days=1)
        else:
            target_date = today

        # Save to daily file
        save_programs_for_date(data, target_date.isoformat())

        # Cleanup old programs (> 7 days)
        cleanup_old_programs()

        return {
            "status": "success",
            "message": f"Fetched programs for {date_path}",
            "date": target_date.isoformat(),
            "channels_with_programs": data['metadata']['channels_with_programs'],
            "total_channels": data['metadata']['total_channels']
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
    Get all programs for the last 7 days

    Returns:
        Dictionary with dates as keys and program data as values
    """
    result = {}
    for date in get_last_7_days():
        programs = load_programs_for_date(date)
        if programs:
            result[date] = programs

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
    """Get application status"""
    dates = get_last_7_days()
    available_dates = []

    for date in dates:
        file_path = get_program_file_path(date)
        available_dates.append({
            "date": date,
            "available": file_path.exists()
        })

    return {
        "status": "running",
        "data_directory": str(DATA_DIR),
        "available_dates": available_dates,
        "total_channels": len(load_channels()),
        "active_channels": len([ch for ch in load_channels() if ch.get('active', False)])
    }

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
    uvicorn.run(app, host="0.0.0.0", port=8000)
