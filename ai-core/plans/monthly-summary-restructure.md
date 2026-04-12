---
Status: completed
Created: 2026-04-11
Completed: 2026-04-11
Feature: Restructure monthly summary JSON to be movie-centric with programs array
---

# Monthly Summary JSON Restructure

## Overview

Restructure the `/api/oscars/monthly` endpoint response from a channel-centric format to a movie-centric format where each movie includes its Oscar metadata and a list of all broadcasts (date/time/channel).

## Current state

The monthly summary currently returns:
```json
{
  "month": "2026-03",
  "days_with_data": 2,
  "total_broadcasts": 51,
  "unique_movies": 46,
  "unique_winners": 22,
  "unique_nominees_only": 24,
  "winners": [
    {
      "title": "Челюсти / Jaws (1975)",
      "poster_path": "/tjbLSFwi0I3phZwh8zoHWNfbsEp.jpg",
      "tmdb_id": 578
    }
  ],
  "nominees": [...],
  "channels": [...]
}
```

**Problems:**
- Movies are split into `winners` and `nominees` arrays (duplication if a movie won some categories but was nominated for others)
- No information about **when** or **where** each movie aired
- Oscar category information is missing (which awards were won/nominated)
- Channel stats are separate from movie data

## Desired state

New movie-centric structure mirroring the daily program `oscar` field:

```json
{
  "month": "2026-03",
  "days_with_data": 2,
  "total_broadcasts": 51,
  "unique_movies": 46,
  "movies": [
    {
      "title": "Госфорд Парк",
      "title_en": "Gosford Park",
      "year": "2001",
      "poster_path": "/7r8DeZuaaHCiOEbkqZC6MFmwJ69.jpg",
      "tmdb_id": 5279,
      "overview": "In 1930s England...",
      "oscar": {
        "winner": 1,
        "nominee": 4,
        "winner_categories": ["Best Original Screenplay"],
        "nominee_categories": [
          "Best Director",
          "Best Original Screenplay",
          "Best Picture",
          "Best Supporting Actress"
        ]
      },
      "programs": [
        {
          "date": "2026-03-01",
          "time": "07:10",
          "channel_name": "AMC",
          "channel_icon": "https://www.xn----8sbafg9clhjcp.bg/tvlogos/amc.png"
        },
        {
          "date": "2026-03-15",
          "time": "21:00",
          "channel_name": "KinoNova",
          "channel_icon": "https://www.xn----8sbafg9clhjcp.bg/tvlogos/kinonova.png"
        }
      ],
      "broadcast_count": 2
    }
  ]
}
```

**Benefits:**
- Single source of truth for each movie (no winner/nominee split)
- Complete Oscar metadata preserved (categories, counts)
- Full broadcast schedule per movie (date, time, channel)
- Easier to answer: "When is Gosford Park playing?" or "Show all Dune Part 2 broadcasts this month"
- Structure matches daily program `oscar` field (consistency)

## Prerequisites

None - this is a pure data transformation change with no architectural implications.

## Tasks

### Task 1 · backend-builder

**What:** Refactor `/api/oscars/monthly` endpoint to build movie-centric structure

**Pattern:** Error handling pattern (try/except with HTTPException 500), storage pattern (use storage.read_json/write_json)

**Inputs:** 
- Existing endpoint at app.py:672-816
- Daily program files in data/programs/ with oscar fields

**Outputs:**
- Modified endpoint returning new JSON structure
- Updated summary file format in data/summaries/YYYY-MM_oscar_monthly.json

**Implementation details:**

1. **Data collection phase** (lines 698-770):
   - Keep the loop over month files and programs
   - Change `movies_map` to store full oscar metadata + programs list:
     ```python
     movies_map[movie_key] = {
         "title": program.get("title", ""),
         "title_en": oscar.get("title_en", ""),
         "year": oscar.get("year"),
         "poster_path": oscar.get("poster_path"),
         "tmdb_id": oscar.get("tmdb_id"),
         "overview": oscar.get("overview", ""),
         "oscar": {
             "winner": oscar.get("winner", 0),
             "nominee": oscar.get("nominee", 0),
             "winner_categories": oscar.get("winner_categories", []),
             "nominee_categories": oscar.get("nominee_categories", [])
         },
         "programs": []
     }
     ```
   - Append to `programs` array for each broadcast:
     ```python
     movies_map[movie_key]["programs"].append({
         "date": date_str,  # from filename
         "time": program.get("time", ""),
         "channel_name": channel_name,
         "channel_icon": channel_icon
     })
     ```

2. **Result building phase** (lines 771-810):
   - Remove winner/nominee split logic
   - Build single `movies` array:
     ```python
     movies = []
     for movie_data in movies_map.values():
         movie_data["broadcast_count"] = len(movie_data["programs"])
         movies.append(movie_data)
     ```
   - Sort by year, then title (same as current sort_key)
   - Remove `unique_winners` and `unique_nominees_only` from result (no longer meaningful)
   - **Decision:** Keep or remove `channels` stats?
     - **Keep** if useful for "which channels showed the most Oscar movies?"
     - **Remove** if redundant (can be computed from movies.programs)
     - **Recommendation:** Keep for backward compatibility, but mark as optional future removal

3. **Final result structure:**
   ```python
   result = {
       "month": f"{year:04d}-{month:02d}",
       "days_with_data": len(month_files),
       "total_broadcasts": total_broadcasts,
       "unique_movies": len(movies_map),
       "movies": movies,
       # Optional: keep channels for now
       "channels": channels  
   }
   ```

**Files to modify:**
- `app.py:672-816` — entire `get_oscar_monthly_summary()` function

---

### Task 2 · backend-builder (sequential, depends on Task 1)

**What:** Test the refactored endpoint with existing March 2026 data

**Pattern:** Manual testing pattern (no test suite exists)

**Inputs:**
- Refactored endpoint from Task 1
- Existing data files in data/programs/2026-03-*

**Outputs:**
- Verified JSON structure matches design
- Confirmed all programs are captured correctly
- Summary file written to data/summaries/2026-03_oscar_monthly.json

**Implementation details:**

1. Start the backend locally:
   ```bash
   source venv/bin/activate && python app.py
   ```

2. Call the endpoint:
   ```bash
   curl -s "http://localhost:8000/api/oscars/monthly?year=2026&month=3" | jq '.' | head -100
   ```

3. Verify:
   - ✓ `movies` array exists and contains expected number of movies (46)
   - ✓ Each movie has `oscar` object with winner/nominee counts and categories
   - ✓ Each movie has `programs` array with broadcasts
   - ✓ `programs` entries have date, time, channel_name, channel_icon
   - ✓ `broadcast_count` matches length of programs array
   - ✓ Total broadcasts sum matches `total_broadcasts` field
   - ✓ Spot-check: "Gosford Park" has correct broadcasts from data/programs/2026-01-09.json

4. Check written file:
   ```bash
   cat data/summaries/2026-03_oscar_monthly.json | jq '.movies[0]'
   ```

**Files to verify:**
- data/summaries/2026-03_oscar_monthly.json (rewritten)

---

## Parallel tracks

Single track - both tasks must run sequentially:
- Task 1 (refactor) → Task 2 (test)

## Migration notes

**Breaking change:** This is backward-incompatible with the old format.

**Impact:**
- Monthly summary files in data/summaries/ will be overwritten when regenerated
- The `/api/oscars/monthly` endpoint is called by `scripts/archive-month.sh` (line 88) to regenerate summaries before archiving
- **No frontend currently consumes this endpoint** (checked - no references in frontend/src/)
- No external consumers known

**Rollout:**
1. Deploy backend changes
2. Regenerate March summary: `curl "https://tv-programa.../api/oscars/monthly?year=2026&month=3"`
3. Archive script will automatically use new format on next run

**If rollback needed:**
- Revert app.py changes
- Regenerate summaries with old format

## Open questions

1. **Keep `channels` stats in result?**
   - Pro: Useful for channel-level analysis ("which channel airs the most Oscar movies?")
   - Con: Can be computed from movies.programs if needed
   - **Decision needed before Task 1**

2. **Sort order for `programs` array?**
   - By date ascending (earliest first)
   - By date descending (latest first)
   - **Recommendation:** Date ascending (chronological)

3. **Include duplicate handling?**
   - If same movie airs twice on same channel same day (e.g., 10:00 and 22:00), include both?
   - **Recommendation:** Yes - include all broadcasts (user may want to know all showtimes)

## Success criteria

- [x] `/api/oscars/monthly` returns new structure with `movies` array
- [x] Each movie has complete `oscar` metadata
- [x] Each movie has `programs` array with all broadcasts (date/time/channel)
- [x] `broadcast_count` is accurate
- [x] Summary file is written to data/summaries/ with new format
- [x] Manually verified with March 2026 data
- [x] No errors or data loss compared to old format
