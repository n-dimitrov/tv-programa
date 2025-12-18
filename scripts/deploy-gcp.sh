#!/bin/bash
# Deploy to Google Cloud Run

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
SERVICE_NAME="tv-programa"
REGION="us-central1"  # Change if needed
IMAGE_NAME="tv-programa"
BUCKET_NAME="${GCS_BUCKET_NAME}"

if [ -z "$PROJECT_ID" ]; then
    echo "Error: GOOGLE_CLOUD_PROJECT not set in .env.cloud"
    exit 1
fi

if [ -z "$BUCKET_NAME" ]; then
    echo "Error: GCS_BUCKET_NAME not set in .env.cloud"
    exit 1
fi

echo "Project ID: ${PROJECT_ID}"
echo "Bucket: ${BUCKET_NAME}"
echo ""

# Set project
gcloud config set project "${PROJECT_ID}"

# Verify bucket exists
if ! gsutil ls "gs://${BUCKET_NAME}" 2>/dev/null; then
    echo "Error: Bucket gs://${BUCKET_NAME} does not exist"
    echo "Please create it first or update GCS_BUCKET_NAME in .env.cloud"
    exit 1
fi
echo "Verified GCS bucket: ${BUCKET_NAME}"

# Build Docker image for linux/amd64 platform (Cloud Run requirement)
echo "Building Docker image for linux/amd64..."
docker build --platform linux/amd64 -t "gcr.io/${PROJECT_ID}/${IMAGE_NAME}:latest" .

# Push to Google Container Registry
echo "Pushing image to GCR..."
docker push "gcr.io/${PROJECT_ID}/${IMAGE_NAME}:latest"

# Deploy to Cloud Run
echo "Deploying to Cloud Run..."
gcloud run deploy "${SERVICE_NAME}" \
    --image "gcr.io/${PROJECT_ID}/${IMAGE_NAME}:latest" \
    --region "${REGION}" \
    --platform managed \
    --allow-unauthenticated \
    --port 8080 \
    --set-env-vars "ENVIRONMENT=cloud,GOOGLE_CLOUD_PROJECT=${PROJECT_ID},GCS_BUCKET_NAME=${BUCKET_NAME}" \
    --memory 512Mi \
    --cpu 1 \
    --timeout 300 \
    --max-instances 10 \
    --min-instances 0

echo ""
echo "Deployment complete!"
echo "Service URL: https://$(gcloud run services describe ${SERVICE_NAME} --region ${REGION} --format 'value(status.url)')"
