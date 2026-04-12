# Domain Model

Ubiquitous language and core domain concepts for 7DaysTV.

## Core entities

### Channel
A TV channel tracked by the system. Has an `id` (URL slug on the source site), `name`, `icon` path, and `active` flag. Stored in `data/tv_channels.json`.

### Program
A single TV broadcast — has `time` (HH:MM), `title`, `description`, `full` (title + description). May have an `oscar` annotation if matched.

### Oscar Annotation
Enrichment data added to a Program when its title matches an Oscar-nominated/winning movie. Contains: `winner`/`nominee` counts, category lists, English title, year, TMDB poster/overview, and watch provider info.

### Movie (Oscar reference)
Entry in `movies-min.json` — a movie that has received at least one Oscar nomination. Has `title` (English), `title_bg` (Bulgarian), `year`, `tmdb_id`, `poster_path`, `overview`.

### Blacklist Entry
An exclusion rule that suppresses Oscar annotation for a specific title. Three scopes:
- `all` — suppress everywhere
- `channel` — suppress on a specific channel
- `broadcast` — suppress for a specific channel + date + time

### Day Programs
A collection of all channel programs for a single date. Stored as `data/programs/YYYY-MM-DD.json` with structure: `{metadata, programs: {channel_id: {channel, programs, count}}}`.

### 7-Day Aggregate
A merged view of the last 7 daily program files, keyed by date. Cached in-memory with TTL and persisted as `data/programs/7days.json`.

## Key relationships

```
Channel 1──* Program
Program 0──1 Oscar Annotation
Oscar Annotation *──1 Movie (reference data)
Blacklist Entry *──1 Channel (for channel/broadcast scope)
Day Programs 1──* Channel Programs
7-Day Aggregate 1──* Day Programs
```

## Domain rules and invariants

1. A program gets an Oscar annotation only when its normalized title matches exactly one movie in the reference database
2. Blacklisted programs never receive Oscar annotations (checked before matching)
3. AI validation can only demote matches (mark as false positive), never promote non-matches
4. Programs are never deleted from storage — old files persist but are not loaded in the 7-day window
5. Channel order in the frontend reflects the order in `tv_channels.json`

## Glossary

| Term | Meaning |
|---|---|
| date_path | Bulgarian date keyword used in scraping URLs: Днес (today), Вчера (yesterday), Утре (tomorrow) |
| Active channel | A channel with `active: true` — only these are scraped |
| False positive | A program incorrectly matched to an Oscar movie (detected by AI validation) |
| Watch info | TMDB streaming availability data: flatrate (subscription), rent, buy providers |
| Scope (blacklist) | Granularity of exclusion: all, channel, or broadcast |
| Oscar catalog | The full set of movies in `movies-min.json` (not just those on TV) |
| Scanner | Client-side feature in OscarManager that re-matches 7-day programs against catalog |
