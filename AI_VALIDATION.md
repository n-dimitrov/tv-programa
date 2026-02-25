# AI Validation for Oscar Matches

## Overview

The system now includes automatic AI validation of Oscar movie matches to detect and exclude false positives (e.g., TV shows mistakenly matched as movies).

## How It Works

1. **Fetch Programs** → Generates Oscar matches
2. **AI Validation** → Sends matches to AI API for verification
3. **Process Results** → Automatically excludes false positives
4. **Blacklist** → False positives added to `data/oscar_blacklist.json`

## Flow Diagram

```
Fetch TV Programs
        ↓
Oscar Matching (title-based)
        ↓
Generate matches JSON
        ↓
Read prompt template (data/prompts/oscar_validation.txt)
        ↓
Call AI API (https://promptquest-api-389635339946.us-central1.run.app/v1/chat)
        ↓
Parse AI response (JSON array of validations)
        ↓
Process Results:
  • matched=false → Add to blacklist
  • matched=true, confidence=low → Log as uncertain
  • matched=true, confidence=high → Confirm
        ↓
Save results to data/results/{date}_*
```

## Files Generated

### Input Files
- `data/prompts/oscar_validation.txt` - AI prompt template

### Output Files (per date)
- `data/results/{date}_oscar_validation_prompt.txt` - Full prompt sent to AI
- `data/results/{date}_oscar_validation_response.json` - AI response with validations

### Updated Files
- `data/oscar_blacklist.json` - Auto-updated with false positives

## AI API Configuration

### Local Development
Environment variables loaded from `.env.local`:
```bash
AI_API_URL=https://promptquest-api-389635339946.us-central1.run.app/v1/chat
AI_MODEL=x-ai/grok-4.1-fast
```

### Cloud Deployment
Environment variables set via deployment script `scripts/deploy-gcp.sh`:
- Reads from `.env.cloud`
- Sets environment variables during Cloud Run deployment
- `.env` files are gitignored and not in container

Deploy with:
```bash
./scripts/deploy-gcp.sh
```

### API Payload
```json
{
  "model": "openai/gpt-4o-mini",
  "system_prompt": "You are a validation assistant. Return ONLY valid JSON arrays with no additional text.",
  "user_prompt": "<prompt template + matches JSON>",
  "max_tokens": 5000
}
```

### Expected Response Format
```json
{
  "response": "[{\"matched\": true, \"confidence\": \"high\", ...}, ...]"
}
```

## AI Response Format

The AI must return a JSON array with one validation per match:

```json
[
  {
    "matched": false,
    "confidence": "high",
    "response": "TV entry is a Bulgarian talk show, not a movie.",
    "red_flags": ["TV show", "Not a film"]
  },
  {
    "matched": true,
    "confidence": "high",
    "response": "Title, genre, and year match.",
    "red_flags": []
  }
]
```

### Fields

- **matched** (boolean): `true` if correct match, `false` if false positive
- **confidence** (string): `"high"`, `"medium"`, or `"low"`
- **response** (string): Brief explanation of the decision
- **red_flags** (array): List of issues (empty if none)

## Usage

### Enable AI Validation (Default)
```bash
# Via API
curl -X POST "http://localhost:8000/api/fetch"

# Via CLI
python fetch_active_programs.py
```

### Disable AI Validation
```bash
# Via API
curl -X POST "http://localhost:8000/api/fetch" \
  -H "Content-Type: application/json" \
  -d '{"ai_validate": false}'
```

## Blacklist Entry Format

Auto-generated blacklist entries include:

```json
{
  "title": "Лице в лице",
  "scope": "broadcast",
  "channel_id": "btv",
  "date": "2026-02-25",
  "time": "05:20",
  "reason": "TV entry is a Bulgarian talk show, not a movie.",
  "red_flags": ["TV show", "Not a film"],
  "auto_excluded_by_ai": true
}
```

## Console Output Example

```
AI VALIDATION
==============================================================
AI prompt saved to data/results/2026-02-25_oscar_validation_prompt.txt
Calling AI API: https://promptquest-api-389635339946.us-central1.run.app/v1/chat
✓ AI validated 12 matches
AI response saved to data/results/2026-02-25_oscar_validation_response.json
==============================================================

PROCESSING AI VALIDATION RESULTS
==============================================================

❌ FALSE POSITIVE #1
   TV: Лице в лице (bTV @ 05:20)
   Matched as: Лице в лице / Face to Face
   Reason: TV entry is a Bulgarian talk show, not a movie.
   Red flags: TV show, Not a film

❌ FALSE POSITIVE #2
   TV: Диво сърце (Nova TV @ 15:00)
   Matched as: Диво сърце / Wild at Heart
   Reason: TV entry is a Bulgarian TV series, not the 1990 film.
   Red flags: TV series, Different year

------------------------------------------------------------
✓ Confirmed matches: 10
? Uncertain matches: 0
✗ False positives: 2
==============================================================

Adding false positives to blacklist...
  ✓ Excluded: Лице в лице (bTV @ 05:20)
  ✓ Excluded: Диво сърце (Nova TV @ 15:00)

✓ Added 2 false positives to blacklist
```

## Error Handling

### AI API Fails
- Mock response saved with `status: "api_failed"`
- Processing continues without validation
- Check logs for error details

### Invalid JSON Response
- Error response saved with raw AI output
- Processing continues without validation
- Raw response available for debugging

### Timeout
- Default timeout: 60 seconds
- Adjustable in `_call_ai_api()` method

## Cloud Storage Support

Works with both local filesystem and Google Cloud Storage:

- **Local**: Files saved to `data/results/`
- **GCS**: Files saved to GCS bucket under `data/results/`

Set via environment variable:
```bash
export ENVIRONMENT=cloud
export GCS_BUCKET_NAME=your-bucket-name
```

## Future Enhancements

- [ ] Support multiple AI providers (OpenAI, Anthropic, etc.)
- [ ] Configurable confidence thresholds
- [ ] Manual review UI for uncertain matches
- [ ] Batch re-validation of historical data
- [ ] AI training data export for model fine-tuning
