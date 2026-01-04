#!/usr/bin/env python3
"""Helper to match program titles to Oscar data and annotate matches."""

from __future__ import annotations

import json
import os
import re
from pathlib import Path
from typing import Dict, Iterable, Optional, Set, Tuple

import requests


YEAR_RE = re.compile(r"(19|20)\d{2}")
EPISODE_SUFFIX_RE = re.compile(
    r"[, ]*(сез\.|сезон|сез|еп\.|епизод|еп)\s*\d+.*$",
    re.IGNORECASE,
)


def _normalize_title(text: str) -> str:
    cleaned = "".join(ch.lower() if ch.isalnum() else " " for ch in text)
    return " ".join(cleaned.split())


def _strip_episode_suffix(title: str) -> str:
    return EPISODE_SUFFIX_RE.sub("", title).strip()


def _extract_year(text: Optional[str]) -> Optional[str]:
    if not text:
        return None
    match = YEAR_RE.search(text)
    return match.group(0) if match else None


class OscarLookup:
    """Lookup for Oscar winner/nominee info by movie title and year."""

    def __init__(
        self,
        movies_path: str = "data/movies-min.json",
        oscars_path: str = "data/oscars-min.json",
    ) -> None:
        self.movies_path = Path(movies_path)
        self.oscars_path = Path(oscars_path)
        self.enabled = self.movies_path.exists() and self.oscars_path.exists()
        self._tmdb_api_key = os.getenv("TMDB_API_KEY")
        self._watch_region = os.getenv("TMDB_WATCH_REGION", "BG")
        self._watch_cache: Dict[str, Optional[Dict]] = {}
        self._title_index: Dict[str, Set[str]] = {}
        self._title_year_index: Dict[Tuple[str, str], Set[str]] = {}
        self._oscar_info: Dict[str, Dict[str, Set[str]]] = {}
        self._movies: Dict[str, Dict] = {}

        if self.enabled:
            self._load()

    def _load(self) -> None:
        movies = self._read_json(self.movies_path)
        oscars = self._read_json(self.oscars_path)
        self._movies = movies

        for movie_id, movie in movies.items():
            year = str(movie.get("year", "")).strip()
            for title in (movie.get("title"), movie.get("title_bg")):
                if not title:
                    continue
                key = _normalize_title(title)
                if key:
                    self._title_index.setdefault(key, set()).add(movie_id)
                    if year:
                        self._title_year_index.setdefault((year, key), set()).add(movie_id)

        for _, categories in oscars.items():
            for category, data in categories.items():
                winner = data.get("winner")
                if winner and winner.get("id"):
                    self._mark(winner["id"], category, winner=True)
                for nominee in data.get("nominees", []) or []:
                    if nominee.get("id"):
                        self._mark(nominee["id"], category, winner=False)

    def _mark(self, movie_id: str, category: str, winner: bool) -> None:
        info = self._oscar_info.setdefault(
            movie_id, {"winner": set(), "nominee": set()}
        )
        info["nominee"].add(category)
        if winner:
            info["winner"].add(category)

    @staticmethod
    def _read_json(path: Path) -> Dict:
        with path.open("r", encoding="utf-8") as f:
            return json.load(f)

    def _fetch_watch_info(self, tmdb_id: str) -> Optional[Dict]:
        if not tmdb_id or not self._tmdb_api_key:
            return None
        if tmdb_id in self._watch_cache:
            return self._watch_cache[tmdb_id]

        url = f"https://api.themoviedb.org/3/movie/{tmdb_id}/watch/providers"
        params = {"api_key": self._tmdb_api_key}
        try:
            response = requests.get(url, params=params, timeout=10)
            response.raise_for_status()
            payload = response.json()
            region_info = payload.get("results", {}).get(self._watch_region)
            if region_info:
                watch_info = {"region": self._watch_region, **region_info}
            else:
                watch_info = None
        except Exception:
            watch_info = None

        self._watch_cache[tmdb_id] = watch_info
        return watch_info

    def _find_movie_id(self, title: str, description: Optional[str]) -> Optional[str]:
        year = _extract_year(description)
        base_title = _strip_episode_suffix(title)
        key = _normalize_title(base_title)
        if not key:
            return None

        if not year:
            return None

        ids = self._title_year_index.get((year, key))
        if ids and len(ids) == 1:
            return next(iter(ids))
        return None

    def annotate_program(self, program: Dict) -> None:
        """Add Oscar winner/nominee info to a program dict if matched."""
        if not self.enabled:
            return

        title = program.get("title") or ""
        description = program.get("description") or program.get("full") or ""

        movie_id = self._find_movie_id(title, description)
        if not movie_id:
            return

        info = self._oscar_info.get(movie_id)
        if not info:
            return

        movie = self._movies.get(movie_id, {})
        tmdb_id = movie.get("tmdb_id")
        oscar_payload = {
            "winner": len(info["winner"]),
            "nominee": len(info["nominee"]),
            "winner_categories": sorted(info["winner"]),
            "nominee_categories": sorted(info["nominee"]),
            "title_en": movie.get("title"),
            "poster_path": movie.get("poster_path"),
            "overview": movie.get("overview"),
            "tmdb_id": tmdb_id,
        }
        watch_info = None
        if tmdb_id:
            watch_info = self._fetch_watch_info(str(tmdb_id))
        if watch_info:
            oscar_payload["watch"] = watch_info
        program["oscar"] = oscar_payload
