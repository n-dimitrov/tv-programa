#!/bin/bash
# Interactive monthly archive script
# Downloads daily program files for a month, zips them, uploads to GCS archive,
# and optionally removes the originals from data/programs/

set -e

# Load environment variables from .env.cloud
if [ -f ".env.cloud" ]; then
    export $(grep -v '^#' .env.cloud | xargs)
else
    echo "Error: .env.cloud file not found"
    exit 1
fi

BUCKET_NAME="${GCS_BUCKET_NAME}"
if [ -z "$BUCKET_NAME" ]; then
    echo "Error: GCS_BUCKET_NAME not set in .env.cloud"
    exit 1
fi

SERVICE_URL="${CLOUD_RUN_URL:-https://tv-programa-389635339946.us-central1.run.app}"

# Defaults
CURRENT_YEAR=$(date +%Y)
CURRENT_MONTH=$(date +%m)
PREV_MONTH=$((10#$CURRENT_MONTH - 1))
PREV_YEAR=$CURRENT_YEAR
if [ "$PREV_MONTH" -eq 0 ]; then
    PREV_MONTH=12
    PREV_YEAR=$((CURRENT_YEAR - 1))
fi

# Prompt year
read -p "Year to archive [$CURRENT_YEAR]: " INPUT_YEAR
YEAR=${INPUT_YEAR:-$CURRENT_YEAR}

# Prompt month
read -p "Month to archive (1-12) [$PREV_MONTH]: " INPUT_MONTH
MONTH=${INPUT_MONTH:-$PREV_MONTH}
MONTH=$((10#$MONTH))  # strip leading zeros

# Validate
if [ "$MONTH" -lt 1 ] || [ "$MONTH" -gt 12 ]; then
    echo "Error: invalid month $MONTH"
    exit 1
fi

# Refuse current month
if [ "$YEAR" -eq "$CURRENT_YEAR" ] && [ "$MONTH" -eq "$((10#$CURRENT_MONTH))" ]; then
    echo "Error: cannot archive the current month (files still being written)"
    exit 1
fi

MONTH_PAD=$(printf "%02d" $MONTH)
MONTH_PREFIX="${YEAR}-${MONTH_PAD}-"
ZIP_NAME="${YEAR}-${MONTH_PAD}.zip"
ARCHIVE_GCS="gs://${BUCKET_NAME}/data/archive/${ZIP_NAME}"

echo ""

# Check if archive already exists
if gsutil -q stat "$ARCHIVE_GCS" 2>/dev/null; then
    read -p "Archive $ZIP_NAME already exists in GCS. Overwrite? [y/N]: " OVERWRITE
    if [[ ! "$OVERWRITE" =~ ^[Yy]$ ]]; then
        echo "Aborted."
        exit 0
    fi
fi

# List matching files in GCS
echo "Looking for files in gs://${BUCKET_NAME}/data/programs/${MONTH_PREFIX}*.json ..."
FILES=$(gsutil ls "gs://${BUCKET_NAME}/data/programs/${MONTH_PREFIX}*.json" 2>/dev/null || true)

if [ -z "$FILES" ]; then
    echo "No files found for ${YEAR}-${MONTH_PAD}. Nothing to archive."
    exit 0
fi

FILE_COUNT=$(echo "$FILES" | wc -l | tr -d ' ')
echo "Found $FILE_COUNT files."
echo ""

# Optionally regenerate Oscar monthly summary
read -p "Regenerate Oscar monthly summary before archiving? [Y/n]: " REGEN
if [[ ! "$REGEN" =~ ^[Nn]$ ]]; then
    echo "Calling /api/oscars/monthly?year=${YEAR}&month=${MONTH} ..."
    HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "${SERVICE_URL}/api/oscars/monthly?year=${YEAR}&month=${MONTH}")
    if [ "$HTTP_STATUS" -eq 200 ]; then
        echo "Oscar summary regenerated."
    else
        echo "Warning: summary endpoint returned HTTP $HTTP_STATUS. Continuing anyway."
    fi
fi

echo ""

# Download files to temp dir
TMP_DIR=$(mktemp -d)
echo "Downloading $FILE_COUNT files to temp dir..."
gsutil -m cp "gs://${BUCKET_NAME}/data/programs/${MONTH_PREFIX}*.json" "$TMP_DIR/"

# Create zip
TMP_ZIP="${TMP_DIR}/${ZIP_NAME}"
echo "Creating $ZIP_NAME..."
(cd "$TMP_DIR" && zip -q "$ZIP_NAME" *.json)

ZIP_SIZE=$(du -sh "$TMP_ZIP" | cut -f1)
echo "Zip created: $ZIP_SIZE"

# Upload zip to GCS
echo "Uploading to $ARCHIVE_GCS ..."
gsutil cp "$TMP_ZIP" "$ARCHIVE_GCS"
echo "Archive uploaded."

# Cleanup temp
rm -rf "$TMP_DIR"

echo ""

# Optionally delete originals
read -p "Delete original daily files from GCS data/programs/? [y/N]: " DELETE
if [[ "$DELETE" =~ ^[Yy]$ ]]; then
    echo "Deleting $FILE_COUNT files from GCS..."
    echo "$FILES" | xargs gsutil -m rm
    echo "$FILE_COUNT files removed from data/programs/."
else
    echo "Original files kept in data/programs/."
fi

echo ""
echo "Done. Archive: $ARCHIVE_GCS"
