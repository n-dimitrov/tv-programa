# Domain Model

## Core entities

### Channel
A TV channel with an id, name, icon path, and active flag. Stored in `data/tv_channels.json`.

### Program
A single TV program broadcast: time slot, title, description, and optional Oscar annotation. Programs are grouped by channel within a daily file.

### Oscar Annotation
Metadata attached to a Program when its title matches a movie in the Oscar database. Contains: winner/nominee counts, categories, English title, year, TMDB poster, overview, and watch provider info.

### Movie (Oscar reference)
An entry in `data/movies-min.json` — the curated Oscar movie database. Fields: title (English), title_bg (Bulgarian), year, tmdb_id, poster_path, overview.

### Oscar Entry
An entry in `data/oscars-min.json` — maps ceremony years to categories, each with a winner and nominees list referencing movie IDs.

### Blacklist Entry
An exclusion rule in `data/oscar_blacklist.json`. Three scopes: `all` (exclude everywhere), `channel` (exclude on specific channel), `broadcast` (exclude specific time slot).

### Monthly Summary
Pre-generated aggregate of Oscar movie broadcasts for a calendar month. Stored in `data/summaries/YYYY-MM_oscar_monthly.json`. Movie-centric format with broadcast arrays.

## Key relationships

```
Channel (1) ──has──> (*) Program
Program (0..1) ──annotated with──> Oscar Annotation
Oscar Annotation ──references──> Movie
Movie (*) ──nominated in──> Oscar Entry
Program ──checked against──> Blacklist Entry
```

## Domain rules and invariants

1. **Ambiguous match rule**: If a normalized title maps to more than one movie_id, no Oscar annotation is added. Only unique matches are annotated.
2. **Blacklist precedence**: Blacklist is checked before annotation. `scope: all` > `scope: channel` > `scope: broadcast`.
3. **No deletion rule**: Program files are never deleted from storage. Old data persists but is filtered out at load time (7-day window).
4. **AI validation rule**: When AI validation identifies a false positive, the Oscar annotation is removed from the in-memory result AND a blacklist entry with `scope: broadcast` is auto-created.
5. **Episode stripping**: Series episode suffixes (сез., еп., etc.) are stripped before title matching to catch movie titles that include episode info.

## Glossary

| Term | Definition |
|---|---|
| Active channel | A channel with `active: true` in `tv_channels.json` — included in fetch operations |
| 7-day window | Rolling 7-day period (today minus 6 days) used for program display |
| False positive | A program incorrectly matched to an Oscar movie — identified by AI validation or manual review |
| Watch providers | Streaming/rental/purchase options from TMDB API for a movie in a specific region (default: BG) |
| Title index | In-memory lookup from normalized title → set of movie_ids, built at OscarLookup startup |
