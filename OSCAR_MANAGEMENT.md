# Oscar Program Management

## Overview

This system allows you to manage Oscar-annotated programs and exclude false positives (like TV shows that match movie titles).

## How It Works

### 1. Matching Logic

The Oscar matching system now uses a two-stage approach:

**Stage 1: With Year (Strict)**
- If a year is found in the program description, it must match exactly
- Example: "Диво сърце" with year "2023" won't match the 1990 film

**Stage 2: Without Year (Fallback)**
- If NO year is found in the description, matches by title only
- Only matches if the title is unique across all years
- Example: "Гладиатор" (no year) → matches "Gladiator (2000)"

### 2. Blacklist System

Programs can be excluded from Oscar matching using a blacklist:

**Data File:** `data/oscar_blacklist.json`
```json
{
  "excluded": [
    "bnt:диво сърце",
    "nova:титаник"
  ]
}
```

**Blacklist Keys:**
- Format: `{channel_id}:{normalized_title}` or just `{normalized_title}`
- Normalized titles are lowercase, alphanumeric only
- Including channel_id makes the exclusion channel-specific
- Without channel_id, excludes from all channels

### 3. API Endpoints

#### GET /api/oscars
Returns all Oscar-annotated programs from the last 7 days.

**Response:**
```json
{
  "programs": [
    {
      "title": "Гладиатор",
      "title_en": "Gladiator",
      "year": 2000,
      "winner": 2,
      "nominee": 5,
      "winner_categories": ["Best Picture", "Best Actor"],
      "nominee_categories": ["Best Picture", "Best Actor", ...],
      "poster_path": "/path.jpg",
      "channel_id": "bnt",
      "channel_name": "БНТ 1",
      "time": "20:00",
      "date": "2025-02-03",
      "description": "Повторение. Максимус е римски генерал..."
    }
  ],
  "total": 15
}
```

#### POST /api/oscars/exclude
Adds a program to the blacklist.

**Request:**
```json
{
  "title": "Диво сърце",
  "channel_id": "bnt"  // Optional
}
```

**Response:**
```json
{
  "success": true,
  "excluded": "bnt:диво сърце"
}
```

#### DELETE /api/oscars/exclude
Removes a program from the blacklist.

**Request:**
```json
{
  "title": "Диво сърце",
  "channel_id": "bnt"
}
```

## Frontend

### /oscars Page

Navigate to `/oscars` to see a visual list of all Oscar-annotated programs:

**Features:**
- Grid layout with movie posters
- Shows Oscar wins and nominations
- Lists winner/nominee categories
- Displays channel, date, and time
- "Exclude" button to blacklist false positives

**Workflow:**
1. Visit `/oscars`
2. Review the list of Oscar-matched programs
3. Click "Exclude" on any false positives (TV shows, wrong matches)
4. The program will be added to the blacklist
5. Future scrapes will skip this program

## Example: Excluding a False Positive

**Problem:**
"Диво сърце" (Turkish TV drama, 2023) matched "Wild at Heart" (1990 film)

**Solution:**
1. Go to `/oscars`
2. Find "Диво сърце" in the list
3. Click "✖ Exclude from Oscar list"
4. Confirm the exclusion
5. The program is added to `data/oscar_blacklist.json`
6. Future fetches will not annotate this program

**Blacklist Entry:**
```json
{
  "excluded": [
    "bnt:диво сърце"
  ]
}
```

## Manual Blacklist Management

You can also edit `data/oscar_blacklist.json` directly:

```json
{
  "excluded": [
    "bnt:диво сърце",      // Exclude only on BNT channel
    "титаник",              // Exclude on all channels
    "nova:звездни войни"    // Exclude only on Nova
  ]
}
```

After editing, you may need to re-fetch programs or restart the server.

## Testing

Test the Oscar matching with blacklist:

```python
from oscars_lookup import OscarLookup

lookup = OscarLookup()

# This program should be excluded
program = {
    'title': 'Диво сърце',
    'description': 'Турция, 2023'
}

lookup.annotate_program(program, channel_id='bnt')

# Check if 'oscar' key was added
if 'oscar' in program:
    print("Matched (not in blacklist)")
else:
    print("Excluded (in blacklist)")
```

## Architecture

```
┌─────────────────┐
│  TV Program     │
│  Scraper        │
└────────┬────────┘
         │
         ▼
┌─────────────────┐     ┌──────────────────┐
│  Oscar Lookup   │────▶│  Blacklist Check │
│  (annotate)     │     │  (skip if found) │
└────────┬────────┘     └──────────────────┘
         │
         ▼
┌─────────────────┐
│  Annotated      │
│  Program        │
│  (with oscar)   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  API Response   │
│  /api/oscars    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Frontend       │
│  /oscars page   │
└─────────────────┘
```

## Benefits

1. **Accuracy**: Prevents false positives from polluting Oscar annotations
2. **Flexibility**: Can exclude by channel or globally
3. **User Control**: Visual UI for managing exclusions
4. **Persistence**: Blacklist survives across restarts
5. **Performance**: Check is fast (Set lookup is O(1))
