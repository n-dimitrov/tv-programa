---
name: data-analyst
description: "Query, analyze, debug, and maintain the TV program and Oscar movie data. Use when the user asks about program stats, Oscar coverage, matching failures, blacklist health, catalog gaps, or monthly summaries. Reads JSON data files — never changes application code."
---

# data-analyst

Understand, query, and maintain the JSON data that powers 7DaysTV — TV program schedules, Oscar movie catalog, blacklist, and channel config.

**Scope boundary:** This skill reads and analyzes data files. It may suggest or make edits to data files (`data/*.json`). It never touches application code (`.py`, `.tsx`, `.css`).

---

## Step 1: Load context (mandatory — do not skip)

Before doing any analysis, read:

1. **`CLAUDE.md`** — project overview, key facts (especially #1–#6 about storage and matching)
2. **`ai-core/knowledge/domain.md`** — entity definitions, domain rules, glossary
3. **`ai-core/knowledge/components/oscar-lookup.md`** — how title matching works (normalization, ambiguity rule, blacklist scopes)
4. **`ai-core/memory/anti-patterns.md`** — known data pitfalls

**If `CLAUDE.md` is missing** → Stop. Tell the user: "Run `/aisdlc-onboard` first."

---

## Step 2: Identify the question type and load relevant data

Classify the user's question into one of these categories, then load the appropriate files:

### A. Program queries ("What's on?", "How many programs?", stats)

Load:
- Daily program files: `data/programs/YYYY-MM-DD.json` (use `storage.list_files("data/programs")` pattern — glob for `data/programs/*.json`)
- Channel config: `data/tv_channels.json`

**Data schema — daily program file:**
```json
{
  "metadata": { "timestamp", "date", "target_date", "total_channels", "channels_with_programs" },
  "programs": {
    "<channel_id>": {
      "channel": { "id", "name", "icon" },
      "programs": [
        { "time": "HH:MM", "title": "...", "description": "...", "full": "...", "oscar": { ... } | null }
      ],
      "count": N
    }
  }
}
```

### B. Oscar coverage queries ("How many Oscar movies?", "Which channels?", trends)

Load:
- Daily program files (as above) — scan for programs with `oscar` key
- Oscar catalog: `data/movies-min.json` — all Oscar-nominated movies
- Oscar categories: `data/oscars-min.json` — category/year/winner/nominee data

**Data schema — movies-min.json:**
```json
{
  "<movie_id>": {
    "title": "English title",
    "title_bg": "Bulgarian title",
    "year": 2024,
    "tmdb_id": 12345,
    "poster_path": "/abc.jpg",
    "overview": "..."
  }
}
```

**Data schema — oscars-min.json:**
```json
{
  "<year>": {
    "<category>": {
      "winner": { "id": "<movie_id>", ... },
      "nominees": [ { "id": "<movie_id>", ... }, ... ]
    }
  }
}
```

### C. Match debugging ("Why didn't X match?", "Why was Y matched?")

Load:
- `data/movies-min.json` — check if the title exists (both `title` and `title_bg`)
- `data/oscar_blacklist.json` — check if blacklisted
- `oscars_lookup.py` — understand the matching algorithm (normalize → strip episode suffix → lookup in title index → ambiguity check)
- AI validation results: `data/results/YYYY-MM-DD_oscar_validation_response.json` (if exists)

**Debugging checklist — run through these in order:**
1. Is the movie in `movies-min.json`? Search both `title` and `title_bg` fields.
2. Does the normalized title (`_normalize_title`) match? Apply: lowercase, replace non-alphanumeric with space, collapse whitespace.
3. Is the title ambiguous? Check if the normalized form maps to >1 movie_id in the catalog.
4. Is it blacklisted? Check `data/oscar_blacklist.json` — match by scope (all/channel/broadcast).
5. Was it caught by AI validation? Check `data/results/` for the relevant date's response file.
6. Does the program title have an episode suffix? (`сез.`, `сезон`, `еп.`, `епизод` followed by numbers)

### D. Blacklist health ("Show stale entries", "Duplicates?", cleanup)

Load:
- `data/oscar_blacklist.json`

**Checks to perform:**
- **Stale broadcast entries**: `scope: broadcast` entries where the `date` is >30 days old (these will never match again)
- **Duplicate entries**: same title + scope + channel_id (normalized comparison)
- **Orphaned entries**: titles that no longer exist in `movies-min.json`
- **Over-broad scope**: titles excluded with `scope: all` that might be legitimate movies on some channels

### E. Catalog maintenance ("Missing Bulgarian titles?", "Gaps?")

Load:
- `data/movies-min.json`
- `data/oscars-min.json`

**Checks to perform:**
- Movies with `title_bg` empty or missing — these can never be matched from Bulgarian TV titles
- Movies in `oscars-min.json` with IDs not present in `movies-min.json`
- Movies with missing `poster_path` or `tmdb_id`
- Year distribution — are recent years well-covered?

### F. Monthly/weekly summaries

Load:
- Daily program files for the date range
- Existing summaries: `data/summaries/YYYY-MM_oscar_monthly.json` (if available)

Or call the API endpoint `GET /api/oscars/monthly?year=YYYY&month=MM` which computes and persists the summary.

---

## Step 3: Analyze and present findings

**Always:**
- Show concrete numbers, not vague summaries
- When listing movies, include: Bulgarian title, English title, year
- When showing channel stats, sort by count descending
- For date ranges, clarify which days have data vs. are missing

**Formatting conventions:**
- Use tables for structured data (channels, movies, stats)
- Use bullet lists for debugging traces
- Show the raw data path you read (e.g., "Read from `data/programs/2026-04-10.json`")

**When recommending data changes:**
- Explain what will change and why
- For blacklist edits: show the exact JSON entry to add/remove
- For catalog edits: show the movie_id and fields to update
- Ask for confirmation before writing

---

## Step 4: Data modification (only when requested)

This skill may edit these files when the user explicitly asks:

| File | Allowed operations |
|---|---|
| `data/oscar_blacklist.json` | Add/remove entries, clean up stale/duplicate entries |
| `data/movies-min.json` | Add missing `title_bg`, fix metadata (year, poster_path) |
| `data/tv_channels.json` | Toggle active status, reorder channels |

**Never edit:**
- Daily program files (`data/programs/*.json`) — these are generated by the fetch pipeline
- `data/oscars-min.json` — this is curated reference data
- Any `.py`, `.tsx`, `.css`, or config files

**Always use the StorageProvider pattern** when explaining how the app would access the data. But since this skill runs in the CLI context, reading files directly is fine for analysis.

---

## Step 5: Capture learnings

If the analysis revealed something non-obvious about the data (e.g., "40% of blacklist entries are stale broadcasts", "channel X never returns programs"), append to `ai-core/memory/learnings.md`:

```
[YYYY-MM-DD] data-analyst — <insight> #candidate-for-promotion
```

---

## Final step — always do this last

Before closing the session, log it:
```bash
bash ai-core/hooks/log-run.sh "data-analyst" "<one-line summary of what was analyzed>" "success|error|partial"
```

Example: `bash ai-core/hooks/log-run.sh "data-analyst" "Analyzed March Oscar coverage: 47 unique movies, 12 channels, 3 stale blacklist entries cleaned" "success"`

If the outcome was `error` or `partial`, also capture the failure:
```bash
bash ai-core/hooks/summarize-failure.sh "data-analyst" "<one-line summary>" "<what went wrong>"
```
