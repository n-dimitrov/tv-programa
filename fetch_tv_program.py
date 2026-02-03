#!/usr/bin/env python3
"""
Fetch TV program data from Bulgarian National Television (BNT)
"""

import requests
from bs4 import BeautifulSoup
from typing import List, Dict, Optional

class TVProgramFetcher:
    """Fetches TV program data from BNT website"""

    BASE_URL = "https://www.xn----8sbafg9clhjcp.bg"

    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        })

    def fetch_programs(self, channel: str = "bnt", date_path: str = "Днес") -> List[Dict]:
        """
        Fetch TV programs for a specific channel and date.

        Args:
            channel: Channel name (e.g., 'bnt', 'bnt2')
            date_path: Date path component ('Днес' for today - default, 'Вчера' for yesterday, etc.)
                      For today, URL is just: /tv/{channel}
                      For other dates: /tv/{channel}/{date_path}/

        Returns:
            List of program dictionaries containing time, title, type, and description
        """
        # For today, don't add date_path to URL (defaults to today)
        if date_path == "Днес":
            url = f"{self.BASE_URL}/tv/{channel}"
        else:
            url = f"{self.BASE_URL}/tv/{channel}/{date_path}/"

        try:
            response = self.session.get(url, timeout=10)
            response.encoding = 'utf-8'
            response.raise_for_status()
        except requests.RequestException as e:
            print(f"Error fetching {url}: {e}")
            return []

        return self._parse_programs(response.text)

    def _parse_programs(self, html_content: str) -> List[Dict]:
        """Parse TV programs from HTML content"""
        soup = BeautifulSoup(html_content, 'html.parser')
        programs = []

        # Find all table rows containing programs
        rows = soup.find_all('tr')

        for row in rows:
            # Look for program link in this row
            link_elem = row.find('a', href=lambda x: x and '/predavane/' in x)
            if not link_elem:
                continue

            # Get time from first <td> in the row
            tds = row.find_all('td')
            if not tds:
                continue

            time_text = tds[0].get_text(strip=True) if tds else None

            # Skip if no time found
            if not time_text or not self._is_time_format(time_text):
                continue

            # Parse program link
            full_text = link_elem.get_text(strip=True)
            link = link_elem.get('href', '')

            # Extract title from <strong> tag if present
            strong_elem = link_elem.find('strong')
            if strong_elem:
                title = strong_elem.get_text(strip=True)
                # Get description as remaining text after strong tag
                # Clone the element to extract text without strong content
                temp_elem = link_elem.__copy__()
                strong_temp = temp_elem.find('strong')
                if strong_temp:
                    strong_temp.decompose()
                description = temp_elem.get_text(strip=True)
                # Clean up leading separators (comma, dash, spaces)
                description = description.lstrip(',').lstrip('-').strip()
                description = description if description else None
            else:
                # Fallback to old parsing method if no <strong> tag
                title, description = self._split_title_description(full_text)

            # Construct full from title + description
            full = title + (' ' + description if description else '')

            program = {
                'time': time_text,
                'title': title,
                'description': description,
                'full': full
            }
            programs.append(program)

        return programs


    @staticmethod
    def _split_title_description(full_text: str) -> tuple:
        """
        Split full text into title and description based on common separators.

        For sports programs with teams (e.g., "Team1 - Team2"), keeps them together.

        Patterns:
        - "- " followed by capital letter not in the middle of teams: Main separator
        - Keep team matches like "Team1 - Team2" together in title
        """
        import re

        # Description keywords that indicate start of description
        desc_keywords = ['Спорт', 'Повторение', 'Документален', 'Сериал', 'Волейбол',
                        'Футбол', 'Баскетбол', 'Хокей', 'Анимация', 'Ток шоу', 'Криминале']

        # Pattern 1: Look for "- " followed by description keyword (most reliable)
        for keyword in desc_keywords:
            pattern = rf'-\s+{keyword}\b'
            match = re.search(pattern, full_text)
            if match:
                split_pos = match.start()
                return full_text[:split_pos].strip(), full_text[split_pos+1:].strip()

        # Pattern 2: "- " followed by typical description start (Повторение, На живо, etc.)
        match = re.search(r'-\s+(Повторение|На\s+живо|Голямо|Малко|Премиера)', full_text)
        if match:
            split_pos = match.start()
            return full_text[:split_pos].strip(), full_text[split_pos+1:].strip()

        # Pattern 3: " - " separator (space-dash-space) - but only if not in team match
        if ' - ' in full_text:
            parts = full_text.rsplit(' - ', 1)
            second_part = parts[1].strip()
            # Check if second part is a description (starts with uppercase single word or keyword)
            if re.match(r'^[A-ЗА-Я][а-яa-z]+\.', second_part) or any(second_part.startswith(kw) for kw in desc_keywords):
                return parts[0].strip(), second_part

        # Pattern 4: "- " separator (dash-space without leading space)
        if '- ' in full_text:
            # Find the last occurrence that looks like description separator
            matches = list(re.finditer(r'- ', full_text))
            if matches:
                last_match = matches[-1]
                potential_desc = full_text[last_match.start()+2:].strip()
                # Only split if what follows looks like a description
                if potential_desc and potential_desc[0].isupper():
                    return full_text[:last_match.start()].strip(), potential_desc

        # Pattern 5: No clear separator - return full text as title
        return full_text, None

    @staticmethod
    def _is_time_format(text: str) -> bool:
        """Check if text matches HH:MM time format"""
        try:
            if ':' in text:
                parts = text.split(':')
                if len(parts) == 2:
                    int(parts[0])
                    int(parts[1])
                    return True
        except ValueError:
            pass
        return False

    def print_programs(self, programs: List[Dict]):
        """Pretty print programs"""
        if not programs:
            print("No programs found")
            return

        print(f"\n{'Time':<8} {'Title':<50} {'Description':<50}")
        print("-" * 110)

        for prog in programs:
            time = prog.get('time', 'N/A')
            title = prog.get('title', 'N/A')[:50]
            desc = prog.get('description', '')
            desc = (desc[:47] + '...') if desc and len(desc) > 47 else (desc or '')
            print(f"{time:<8} {title:<50} {desc:<50}")


if __name__ == '__main__':
    import sys
    import json
    from oscars_lookup import OscarLookup

    # Parse command line arguments
    channel = sys.argv[1] if len(sys.argv) > 1 else 'bnt'
    date_path = sys.argv[2] if len(sys.argv) > 2 else 'Вчера'

    # Create fetcher and get programs
    fetcher = TVProgramFetcher()
    programs = fetcher.fetch_programs(channel=channel, date_path=date_path)

    oscar_lookup = OscarLookup()
    if programs and oscar_lookup.enabled:
        for program in programs:
            oscar_lookup.annotate_program(program)

    # Print results
    print(f"Fetched {len(programs)} programs")
    fetcher.print_programs(programs)

    # Save to JSON
    if programs:
        with open('tv_programs.json', 'w', encoding='utf-8') as f:
            json.dump(programs, f, ensure_ascii=False, indent=2)
        print("\nPrograms saved to tv_programs.json")
