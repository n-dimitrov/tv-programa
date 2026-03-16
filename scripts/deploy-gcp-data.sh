#!/bin/bash
# Upload local data files to Google Cloud Storage bucket

set -e

# Load environment variables from .env.cloud
if [ -f ".env.cloud" ]; then
    echo "Loading configuration from .env.cloud..."
    export $(grep -v '^#' .env.cloud | xargs)
else
    echo "Error: .env.cloud file not found"
    exit 1
fi

# Configuration
PROJECT_ID="${GOOGLE_CLOUD_PROJECT}"
BUCKET_NAME="${GCS_BUCKET_NAME}"

if [ -z "$PROJECT_ID" ]; then
    echo "Error: GOOGLE_CLOUD_PROJECT not set in .env.cloud"
    exit 1
fi

if [ -z "$BUCKET_NAME" ]; then
    echo "Error: GCS_BUCKET_NAME not set in .env.cloud"
    exit 1
fi

# Set project
gcloud config set project "${PROJECT_ID}"

# Verify bucket exists
if ! gsutil ls "gs://${BUCKET_NAME}" 2>/dev/null; then
    echo "Error: Bucket gs://${BUCKET_NAME} does not exist"
    exit 1
fi

echo "Uploading data files to gs://${BUCKET_NAME}/data/"
echo ""

# Data files to upload
DATA_FILES=(
    "data/movies-min.json"
    "data/oscars-min.json"
    "data/prompts/oscar_validation.txt"
)

for file in "${DATA_FILES[@]}"; do
    if [ -f "$file" ]; then
        echo "  Uploading $file..."
        gsutil cp "$file" "gs://${BUCKET_NAME}/${file}"
    else
        echo "  Skipping $file (not found)"
    fi
done

echo ""
echo "Data upload complete!"
