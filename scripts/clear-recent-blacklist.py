#!/usr/bin/env python3
"""Clear Oscar blacklist entries from the last N days"""

import os
import sys
from datetime import datetime, timedelta
from pathlib import Path

# Add parent directory to path to import storage module
sys.path.insert(0, str(Path(__file__).parent.parent))

from storage import get_storage_provider
from dotenv import load_dotenv

def clear_recent_blacklist(days=2, storage_type="local", blacklist_path="data/oscar_blacklist.json"):
    """Remove blacklist entries from the last N days

    Args:
        days: Number of days to clear (default: 2)
        storage_type: "local" or "cloud" (default: "local")
        blacklist_path: Path to blacklist file
    """
    # Set environment variable based on storage_type
    if storage_type == "cloud":
        os.environ["ENVIRONMENT"] = "cloud"
        load_dotenv(".env.local", override=False)
    else:
        os.environ["ENVIRONMENT"] = "local"

    # Get storage provider
    storage = get_storage_provider()

    # Load blacklist
    data = storage.read_json(blacklist_path)
    if not data:
        print(f"Blacklist file not found or empty: {blacklist_path}")
        return

    # Calculate cutoff date
    cutoff = (datetime.now().date() - timedelta(days=days)).isoformat()

    # Filter entries
    before = len(data.get('excluded', []))
    data['excluded'] = [
        entry for entry in data.get('excluded', [])
        if entry.get('date', '') < cutoff
    ]
    after = len(data['excluded'])
    removed = before - after

    # Save updated blacklist
    storage.write_json(blacklist_path, data)

    print(f"Removed {removed} entries from the last {days} days")
    print(f"Cutoff date: {cutoff}")
    print(f"Remaining entries: {after}")
    print(f"Storage: {storage.__class__.__name__}")

if __name__ == '__main__':
    # Usage: python clear-recent-blacklist.py [days] [storage_type]
    # Examples:
    #   python clear-recent-blacklist.py 2 local
    #   python clear-recent-blacklist.py 3 cloud
    days = int(sys.argv[1]) if len(sys.argv) > 1 else 2
    storage_type = sys.argv[2] if len(sys.argv) > 2 else "local"

    if storage_type not in ["local", "cloud"]:
        print(f"Error: storage_type must be 'local' or 'cloud', got '{storage_type}'")
        sys.exit(1)

    clear_recent_blacklist(days=days, storage_type=storage_type)
