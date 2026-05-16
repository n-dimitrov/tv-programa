# ADR-0002: AI Disambiguation Layer for Ambiguous Oscar Matches and Graduated Blacklist Scoping

**Date**: 2026-05-16
**Status**: Accepted
**Deciders**: Niki Dimitrov (solo)

---

## Context

The current Oscar matching pipeline uses deterministic title-only lookup: program titles are normalized and matched against an in-memory index built from `movies-min.json`. This works well for unique titles but has three measurable gaps:

**1. Ambiguous titles are silently dropped.** 84 normalized titles in the Oscar catalog map to more than one movie (e.g., "Дюн" → Dune 1984 + Dune 2021, "Тя" → Her 2013 + She 2006). When `_find_movie_id` finds `len(ids) > 1`, it returns `None` and the program gets no Oscar annotation. In the last 7 days, 3 programs were missed this way — including titles with clear disambiguation signals in their descriptions (year, director, cast).

**2. Blacklist churn from recurring false positives.** All 47 entries in `oscar_blacklist.json` use `scope: broadcast` (the most narrow scope). Titles like "Лице в лице" (a daily talk show matching the 1976 Bergman film "Face to Face") get re-matched and re-blacklisted on every new airdate. The blacklist grows without bound while the same false positives keep recurring.

**3. No distinction between false positive types.** The AI validation already classifies false positives with `red_flags` and a textual `response`, but the auto-blacklisting logic ignores this signal — everything gets `scope: broadcast` regardless of whether the content is "not a movie at all" (a talk show, sports event) or "a different version of the same movie" (2018 Little Mermaid vs. 1989 Oscar-nominated one).

The deterministic matching path handles 97%+ of cases correctly and costs nothing at runtime. The question is how to handle the remaining edge cases without replacing the working system.

---

## Decision

**Augment the existing deterministic matching with an AI disambiguation layer for ambiguous titles, and graduate blacklist scope based on false positive type.**

The deterministic title index remains the primary matcher. When it finds an ambiguous title (multiple movie candidates), instead of silently dropping it, the candidates are collected and sent to the AI for resolution in a single batch call after all channels are scraped. The AI receives the program title, description, and the specific candidate movies, and returns which candidate matches (or `null` if uncertain). Only high-confidence resolutions are accepted — uncertain cases are skipped, preserving the current invariant that no annotation is better than a wrong annotation.

Separately, the auto-blacklisting logic is updated to use the AI validation's `red_flags` to choose the appropriate scope: `scope: all` for content that is clearly not a movie (TV shows, sports, news), `scope: broadcast` for content that is a movie but the wrong version (different year, different adaptation). This prevents talk shows from being re-blacklisted daily while preserving narrow scoping for cases where the legitimate Oscar movie could still air.

These two changes are independent — disambiguation happens in `oscars_lookup.py` and `fetch_active_programs.py`'s fetch loop, while graduated blacklisting happens in `_auto_exclude_false_positives`. Either can be implemented or reverted without affecting the other.

---

## Consequences

### Positive
- Recovers ~3 Oscar movies per week that are currently silently dropped due to ambiguous titles (e.g., Dune 1984 vs 2021, Her 2013 vs She 2006)
- Stops blacklist growth from recurring non-movie matches — titles like "Лице в лице" get one `scope: all` entry instead of N `scope: broadcast` entries
- Preserves the fast deterministic path for 97%+ of matches — zero change to unique-title matching
- Graceful degradation: if AI API is unavailable, ambiguous titles are skipped (same behavior as today), and blacklist defaults to `scope: broadcast` (same as today)
- Both changes are small and isolated — no architectural rewrite

### Negative / Trade-offs
- Adds a second AI call per fetch (disambiguation), increasing per-fetch cost by ~$0.01-0.02 (~1-3K tokens for the small batch of ambiguous titles)
- Disambiguation quality depends on description richness — programs with empty descriptions and ambiguous titles still get skipped
- `scope: all` blacklisting is aggressive — if a talk show shares its name with an Oscar movie, the movie is permanently blocked unless the blacklist entry is manually removed
- Two-stage AI flow (disambiguation then validation) is more complex than the current single-stage validation

### Risks and mitigations
- **Risk**: AI disambiguates incorrectly, annotating the wrong movie version
  **Mitigation**: Only accept `confidence: high` resolutions. The existing AI validation (step 2) provides a second check — a wrong disambiguation would likely be caught as a false positive.

- **Risk**: `scope: all` over-blacklists a title, blocking a legitimate Oscar movie
  **Mitigation**: Only apply `scope: all` when red_flags contain clear non-movie indicators (`TV show`, `Talk show`, `Sports`, `Series`, `News`, `Not a movie`). Default to `scope: broadcast` when red_flags indicate wrong version/year. The admin UI at `/oscars?admin=true` already supports un-blacklisting.

- **Risk**: Disambiguation prompt engineering is fragile — different AI models may parse candidates differently
  **Mitigation**: Store disambiguation prompts in `data/prompts/` (same pattern as validation) and persist AI responses in `data/results/` for debugging. The prompt asks for structured JSON output with an explicit `null` option for uncertain cases.

---

## Options considered

### Option A: AI as Primary Matcher (replace title index entirely)
Send all ~750 program titles + full Oscar catalog to AI in one call. AI identifies all matches directly.

Rejected because: ~63K input tokens per fetch ($0.20-0.60/day) is expensive for a personal project. Creates a hard dependency on AI for core functionality — if AI is down, zero matches. The deterministic path already works for 97%+ of cases. Non-deterministic matching means the same program could match differently on different days.

### Option B: AI as Disambiguation Layer (chosen)
Keep deterministic matching as primary. Send only ambiguous titles (~3-10 per fetch) to AI with their specific candidates.

Chosen because: Surgical improvement to the 3% failure case. Bounded cost (~$0.01-0.02 extra per fetch). Graceful degradation. No change to the working fast path.

### Option C: AI Pre-Filter
Send all titles to AI to identify "which are movies?" then run deterministic matching on the shortlist.

Rejected because: Doesn't solve disambiguation (same index limitations apply to the shortlist). Adds AI latency without improving match quality. The deterministic index already implicitly filters non-movies by only matching known Oscar titles.

### Option D: Year-Aware Deterministic Matching Only
Modify `_find_movie_id` to try `_title_year_index` when a year is extractable from the description.

Rejected as standalone because: Only resolves 39 of 84 ambiguous titles (46%). Doesn't address blacklist churn at all. However, this could be added as a cheap first-pass optimization before AI disambiguation — extract year from description, try year+title index, only send to AI if still ambiguous. This is an implementation detail, not an architectural decision.

---

## Revisit triggers

This decision should be revisited if:
- The number of ambiguous titles in the Oscar catalog grows significantly beyond 84 (e.g., if the catalog is expanded with more international films that share translated titles)
- AI API costs increase substantially, making even the small disambiguation call uneconomical
- The false positive rate from AI disambiguation exceeds 10% of resolved matches, suggesting the confidence threshold needs adjustment or the approach is unreliable
- A deterministic year-extraction approach is found that resolves 90%+ of ambiguous titles without AI, making the disambiguation call unnecessary
