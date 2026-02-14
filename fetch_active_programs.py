#!/usr/bin/env python3
"""
Fetch TV programs for active channels from tv_channels.json
Fetches yesterday's programs and generates a consolidated JSON file
"""

import json
import sys
from datetime import datetime, timedelta
from typing import Any, List, Dict
from fetch_tv_program import TVProgramFetcher
from oscars_lookup import OscarLookup
from storage import get_storage_provider


class ActiveChannelFetcher:
    """Fetches TV programs for all active channels"""

    def __init__(self, channels_file: str = 'data/tv_channels.json', storage_provider: Any = None):
        self.channels_file = channels_file
        self.storage = storage_provider or get_storage_provider()
        self.fetcher = TVProgramFetcher()
        self.oscar_lookup = OscarLookup(storage_provider=self.storage)
        self.channels = self._load_channels()

    def _load_channels(self) -> List[Dict]:
        """Load channels from tv_channels.json and filter active ones"""
        data = self.storage.read_json(self.channels_file)
        if not data:
            print(f"Error: {self.channels_file} not found or invalid")
            return []

        channels = data.get('channels', [])
        # Return only active channels
        active_channels = [ch for ch in channels if ch.get('active', False)]
        return active_channels

    def fetch_all_programs(self, date_path: str = "Вчера", target_date: str = "") -> Dict:
        """
        Fetch programs for all active channels

        Args:
            date_path: Date path component ('Вчера' for yesterday, 'Днес' for today)
            target_date: ISO date string (YYYY-MM-DD) for blacklist checking

        Returns:
            Dictionary with metadata and programs grouped by channel
        """
        # Calculate target date if not provided
        if not target_date:
            today = datetime.now().date()
            if date_path == "Вчера":
                calc_date = today - timedelta(days=1)
            elif date_path == "Днес":
                calc_date = today
            elif date_path == "Утре":
                calc_date = today + timedelta(days=1)
            else:
                calc_date = today
            target_date = calc_date.isoformat()

        result = {
            'metadata': {
                'timestamp': datetime.now().isoformat(),
                'date': date_path,
                'target_date': target_date,
                'total_channels': len(self.channels),
                'channels_with_programs': 0
            },
            'programs': {}
        }

        if not self.channels:
            print(f"No active channels found in {self.channels_file}")
            return result

        print(f"Fetching programs for {len(self.channels)} active channels...")
        print(f"Date: {date_path} ({target_date})\n")

        for idx, channel in enumerate(self.channels, 1):
            channel_id = channel.get('id')
            channel_name = channel.get('name')
            channel_icon = channel.get('icon')

            print(f"[{idx}/{len(self.channels)}] Fetching {channel_name}...", end=" ")

            programs = self.fetcher.fetch_programs(channel=channel_id, date_path=date_path)

            if programs and self.oscar_lookup.enabled:
                for program in programs:
                    self.oscar_lookup.annotate_program(
                        program,
                        channel_id=channel_id,
                        date=target_date,
                        time=program.get('time', '')
                    )

            if programs:
                result['programs'][channel_id] = {
                    'channel': {
                        'id': channel_id,
                        'name': channel_name,
                        'icon': channel_icon
                    },
                    'programs': programs,
                    'count': len(programs)
                }
                result['metadata']['channels_with_programs'] += 1
                print(f"✓ ({len(programs)} programs)")
            else:
                print("✗ (no programs)")

        return result

    def save_to_file(self, data: Dict, output_file: str = 'tv_programs_active.json'):
        """Save the fetched data to a JSON file"""
        try:
            with open(output_file, 'w', encoding='utf-8') as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
            print(f"\nData saved to {output_file}")
            return True
        except Exception as e:
            print(f"Error saving to {output_file}: {e}")
            return False

    def print_summary(self, data: Dict):
        """Print a summary of the fetched data"""
        meta = data['metadata']
        print("\n" + "="*60)
        print("SUMMARY")
        print("="*60)
        print(f"Timestamp: {meta['timestamp']}")
        print(f"Date: {meta['date']}")
        print(f"Total active channels: {meta['total_channels']}")
        print(f"Channels with programs: {meta['channels_with_programs']}")

        if data['programs']:
            print("\nPrograms by channel:")
            print("-" * 60)
            for channel_id, channel_data in data['programs'].items():
                channel_name = channel_data['channel']['name']
                count = channel_data['count']
                print(f"  {channel_name:<30} {count:>3} programs")


if __name__ == '__main__':
    # Parse command line arguments
    date_path = sys.argv[1] if len(sys.argv) > 1 else 'Днес'
    output_file = sys.argv[2] if len(sys.argv) > 2 else 'tv_programs_active.json'

    # Create fetcher and get programs
    fetcher = ActiveChannelFetcher()
    data = fetcher.fetch_all_programs(date_path=date_path)

    # Save to JSON
    if fetcher.save_to_file(data, output_file):
        fetcher.print_summary(data)
    else:
        sys.exit(1)
