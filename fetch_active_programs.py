#!/usr/bin/env python3
"""
Fetch TV programs for active channels from tv_channels.json
Fetches yesterday's programs and generates a consolidated JSON file
"""

import json
import os
import sys
import requests
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any, List, Dict, Optional
from dotenv import load_dotenv
from fetch_tv_program import TVProgramFetcher
from oscars_lookup import OscarLookup
from storage import get_storage_provider

# Load environment variables from .env files (only for local development)
# In production (Cloud Run), environment variables are set via deployment script
# override=False means existing env vars (from Cloud Run) take precedence
load_dotenv(".env.local", override=False)


class ActiveChannelFetcher:
    """Fetches TV programs for all active channels"""

    def __init__(self, channels_file: str = 'data/tv_channels.json', storage_provider: Any = None, ai_validate: bool = True):
        self.channels_file = channels_file
        self.storage = storage_provider or get_storage_provider()
        self.fetcher = TVProgramFetcher()
        self.oscar_lookup = OscarLookup(storage_provider=self.storage)
        self.channels = self._load_channels()
        self.ai_validate = ai_validate

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

        # Track Oscar matches
        oscar_matches = []

        for idx, channel in enumerate(self.channels, 1):
            channel_id = channel.get('id')
            channel_name = channel.get('name')
            channel_icon = channel.get('icon')

            print(f"[{idx}/{len(self.channels)}] Fetching {channel_name}...", end=" ")

            programs = self.fetcher.fetch_programs(channel=channel_id, date_path=date_path)

            if programs and self.oscar_lookup.enabled:
                for program in programs:
                    match_info = self.oscar_lookup.annotate_program(
                        program,
                        channel_id=channel_id,
                        date=target_date,
                        time=program.get('time', '')
                    )
                    if match_info:
                        oscar_matches.append({
                            'date': target_date,
                            'time': program.get('time', ''),
                            'channel_name': channel_name,
                            'channel_id': channel_id,
                            **match_info
                        })

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

        # Build and output Oscar matches JSON
        if oscar_matches:
            matches_json = []

            for match in oscar_matches:
                tv_time = match.get('time', '')
                tv_channel = match.get('channel_name', '')
                tv_channel_id = match.get('channel_id', '')  # Keep channel_id for cleanup
                tv_title = match.get('program_title', '')
                tv_description = match.get('program_description', '')

                matched_title_bg = match.get('matched_title_bg', '')
                matched_title_en = match.get('matched_title_en', '')
                matched_description = match.get('movie_overview', '')
                year = match.get('year', '')

                # Format matched title
                if matched_title_bg and matched_title_en:
                    matched_title = f"{matched_title_bg} / {matched_title_en}"
                elif matched_title_en:
                    matched_title = matched_title_en
                elif matched_title_bg:
                    matched_title = matched_title_bg
                else:
                    matched_title = tv_title

                # Truncate descriptions to 100 characters
                tv_desc_truncated = tv_description[:100] if tv_description else ""
                movie_desc_truncated = matched_description[:100] if matched_description else ""

                match_entry = {
                    "time": tv_time,
                    "channel": tv_channel,
                    "description": tv_desc_truncated,
                    "title": matched_title,
                    "overview": movie_desc_truncated,
                    "year": year,
                    # Internal fields for cleanup (not part of AI prompt)
                    "channel_id": tv_channel_id,
                    "tv_title": tv_title  # Keep for cleanup matching
                }
                matches_json.append(match_entry)

            print(f"\nOSCAR MATCHES: {len(oscar_matches)}")
            print(json.dumps(matches_json, ensure_ascii=False, indent=2))
            print()

            # AI Validation if enabled
            if self.ai_validate:
                validations = self._run_ai_validation(matches_json, target_date)

                # Process validations if returned - cleans data in memory
                if validations:
                    self._process_ai_validations(matches_json, validations, target_date, result)

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

    def _call_ai_api(self, user_prompt: str) -> Optional[str]:
        """Call the AI API and return the response text"""
        api_url = os.getenv("AI_API_URL")
        ai_model = os.getenv("AI_MODEL")

        if not api_url:
            print("ERROR: AI_API_URL not set in environment variables")
            return None

        if not ai_model:
            print("ERROR: AI_MODEL not set in environment variables")
            return None

        payload = {
            "model": ai_model,
            "system_prompt": "You are a validation assistant. Return ONLY valid JSON arrays with no additional text.",
            "user_prompt": user_prompt,
            "max_tokens": 5000
        }

        try:
            print(f"Calling AI API: {api_url}")
            response = requests.post(api_url, json=payload, timeout=60)
            response.raise_for_status()

            data = response.json()
            # Extract the AI response text (adjust based on actual API response structure)
            ai_text = data.get("response") or data.get("content") or data.get("text")

            if not ai_text:
                print(f"ERROR: No response text in AI API response: {data}")
                return None

            return ai_text

        except requests.exceptions.Timeout:
            print("ERROR: AI API request timed out")
            return None
        except requests.exceptions.RequestException as e:
            print(f"ERROR: AI API request failed: {e}")
            return None
        except json.JSONDecodeError as e:
            print(f"ERROR: Failed to parse AI API response: {e}")
            return None

    def _run_ai_validation(self, matches_json: List[Dict], date: str) -> Optional[List[Dict]]:
        """Run AI validation on Oscar matches

        Returns:
            List of validation results or None if validation fails
        """
        print("\n" + "="*60)
        print("AI VALIDATION")
        print("="*60)

        # Read prompt template
        prompt_template = self.storage.read_text("data/prompts/oscar_validation.txt")
        if not prompt_template:
            print("ERROR: Prompt template not found at data/prompts/oscar_validation.txt")
            return None

        # Insert JSON data into template
        json_data = json.dumps(matches_json, ensure_ascii=False, indent=2)
        full_prompt = prompt_template + json_data

        # Save prompt to storage (date prefix in results folder)
        prompt_file = f"data/results/{date}_oscar_validation_prompt.txt"
        if self.storage.write_text(prompt_file, full_prompt):
            print(f"AI prompt saved to {prompt_file}")

        # Call real AI API
        ai_response_text = self._call_ai_api(full_prompt)

        if ai_response_text:
            # Parse AI response as JSON
            try:
                # Try to extract JSON array from response
                ai_response_text = ai_response_text.strip()

                # Handle markdown code blocks if present
                if ai_response_text.startswith("```"):
                    # Extract content between ``` markers
                    lines = ai_response_text.split("\n")
                    ai_response_text = "\n".join(lines[1:-1]) if len(lines) > 2 else ai_response_text

                validations = json.loads(ai_response_text)

                if not isinstance(validations, list):
                    print(f"ERROR: AI response is not a JSON array: {type(validations)}")
                    validations = []

                print(f"✓ AI validated {len(validations)} matches")

                # Save AI response
                response_data = {
                    "status": "ai_validated",
                    "date": date,
                    "total_matches": len(matches_json),
                    "validations": validations,
                    "raw_response": ai_response_text
                }

                response_file = f"data/results/{date}_oscar_validation_response.json"
                if self.storage.write_json(response_file, response_data):
                    print(f"AI response saved to {response_file}")

                print("="*60 + "\n")
                return validations

            except json.JSONDecodeError as e:
                print(f"ERROR: Failed to parse AI response as JSON: {e}")
                print(f"Raw response: {ai_response_text[:200]}...")

                # Save error response for debugging
                error_response = {
                    "status": "parse_error",
                    "date": date,
                    "total_matches": len(matches_json),
                    "error": str(e),
                    "raw_response": ai_response_text,
                    "validations": []
                }

                response_file = f"data/results/{date}_oscar_validation_response.json"
                self.storage.write_json(response_file, error_response)
                print("="*60 + "\n")
                return None
        else:
            # No AI response - save mock response
            mock_response = {
                "status": "api_failed",
                "date": date,
                "total_matches": len(matches_json),
                "message": "AI API call failed. Check logs for details.",
                "validations": []
            }

            response_file = f"data/results/{date}_oscar_validation_response.json"
            if self.storage.write_json(response_file, mock_response):
                print(f"Mock response saved to {response_file}")

            print("AI validation failed (see logs)")
            print("="*60 + "\n")
            return None

    def _process_ai_validations(self, matches_json: List[Dict], validations: List[Dict], date: str, result: Dict) -> None:
        """Process AI validation results and remove Oscar data from false positives in memory"""
        if not validations or len(validations) != len(matches_json):
            print("WARNING: AI validation results count doesn't match input")
            return

        print("\n" + "="*60)
        print("PROCESSING AI VALIDATION RESULTS")
        print("="*60)

        false_positives = []
        confirmed_matches = []
        uncertain_matches = []

        for idx, (match, validation) in enumerate(zip(matches_json, validations)):
            matched = validation.get("matched", True)
            confidence = validation.get("confidence", "unknown")
            response = validation.get("response", "")
            red_flags = validation.get("red_flags", [])

            if not matched:
                false_positives.append({
                    "match": match,
                    "validation": validation
                })
                print(f"\n❌ FALSE POSITIVE #{len(false_positives)}")
                print(f"   TV: {match.get('tv_title', match.get('title', 'Unknown'))} ({match.get('channel', 'Unknown')} @ {match.get('time', 'Unknown')})")
                print(f"   Matched as: {match['title']}")
                print(f"   Reason: {response}")
                if red_flags:
                    print(f"   Red flags: {', '.join(red_flags)}")
            elif confidence == "low":
                uncertain_matches.append({
                    "match": match,
                    "validation": validation
                })
            else:
                confirmed_matches.append({
                    "match": match,
                    "validation": validation
                })

        # Summary
        print("\n" + "-"*60)
        print(f"✓ Confirmed matches: {len(confirmed_matches)}")
        print(f"? Uncertain matches: {len(uncertain_matches)}")
        print(f"✗ False positives: {len(false_positives)}")
        print("="*60 + "\n")

        # Auto-exclude false positives
        if false_positives:
            self._auto_exclude_false_positives(false_positives, date)
            # Remove Oscar annotations from result data structure (in memory)
            self._remove_oscar_from_result(false_positives, result)

    def _auto_exclude_false_positives(self, false_positives: List[Dict], date: str) -> None:
        """Automatically add false positives to Oscar blacklist"""
        print("Adding false positives to blacklist...")

        blacklist_file = "data/oscar_blacklist.json"
        data = self.storage.read_json(blacklist_file) or {"excluded": []}

        added_count = 0
        for fp in false_positives:
            match = fp["match"]
            validation = fp["validation"]

            # Create blacklist entry (scope: broadcast for specificity)
            tv_title = match.get("tv_title", match.get("title", ""))
            tv_time = match.get("time", "")

            entry = {
                "title": tv_title,
                "scope": "broadcast",
                "channel_id": match.get("channel_id", ""),
                "date": date,
                "time": tv_time,
                "reason": validation.get("response", "AI validation failed"),
                "red_flags": validation.get("red_flags", []),
                "auto_excluded_by_ai": True
            }

            # Check if already exists
            from oscars_lookup import _normalize_title
            title_normalized = _normalize_title(tv_title)

            already_exists = False
            for existing in data["excluded"]:
                if (_normalize_title(existing.get("title", "")) == title_normalized and
                    existing.get("channel_id") == entry["channel_id"] and
                    existing.get("date") == entry["date"] and
                    existing.get("time") == entry["time"]):
                    already_exists = True
                    break

            if not already_exists:
                data["excluded"].append(entry)
                added_count += 1
                print(f"  ✓ Excluded: {tv_title} ({match.get('channel', 'Unknown')} @ {tv_time})")

        if added_count > 0:
            self.storage.write_json(blacklist_file, data)
            print(f"\n✓ Added {added_count} false positives to blacklist")
        else:
            print("  All false positives already in blacklist")

    def _remove_oscar_from_result(self, false_positives: List[Dict], result: Dict) -> None:
        """Remove Oscar annotations from false positives in the result data structure (in memory)"""
        if not false_positives:
            return

        print("\nCleaning Oscar data from result (in memory)...")

        removed_count = 0

        # For each false positive, find and remove Oscar data from result
        for fp in false_positives:
            match = fp["match"]
            # Get internal fields used for cleanup
            channel_id = match.get("channel_id", "")
            tv_time = match.get("time", "")  # Simplified field name
            tv_title = match.get("tv_title", "")  # Internal field for matching

            # Find the program in the result data structure
            channel_programs = result.get("programs", {}).get(channel_id, {})
            programs_list = channel_programs.get("programs", [])

            for program in programs_list:
                # Program has "time" and "title"
                if (program.get("time") == tv_time and
                    program.get("title") == tv_title and
                    "oscar" in program):
                    # Remove Oscar annotation from in-memory data
                    del program["oscar"]
                    removed_count += 1
                    print(f"  ✓ Removed Oscar data: {tv_title} ({channel_id} @ {tv_time})")
                    break

        if removed_count > 0:
            print(f"\n✓ Cleaned {removed_count} programs from result data")
        else:
            print("  No Oscar data found to remove")

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
