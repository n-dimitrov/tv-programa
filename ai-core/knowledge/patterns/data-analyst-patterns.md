# Data Analyst Patterns

Role-specific patterns for data-analyst. Extends ai-core/knowledge/patterns/coding-patterns.md.

## Title normalization

To match the backend's `_normalize_title` behavior:
1. Replace every non-alphanumeric character with a space
2. Lowercase everything
3. Collapse multiple spaces into one, trim

Example: `"Кръстникът II"` → `"кръстникът ii"`

## Episode suffix stripping

Strip patterns like `сез. 3`, `сезон 2 еп. 5`, `епизод 12` before matching.
Regex: `/[, ]*(сез\.|сезон|сез|еп\.|епизод|еп)\s*\d+.*$/i`

## Ambiguity rule

A normalized title that maps to >1 movie_id in `movies-min.json` is considered ambiguous and is **never matched**. This is intentional — it prevents false positives for generic titles like "Любов" that could be multiple movies.
