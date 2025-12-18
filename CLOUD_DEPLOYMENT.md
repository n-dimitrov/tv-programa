# Cloud Deployment Guide

This document explains how to deploy the TV Programa application to Google Cloud Run with Cloud Storage integration while maintaining local file-based development.

## Architecture

The application uses a storage abstraction layer that automatically switches between:
- **Local Development**: File system storage (`data/` directory)
- **Cloud Deployment**: Google Cloud Storage (GCS) buckets

The switch is controlled by the `ENVIRONMENT` variable:
- `ENVIRONMENT=local` → Uses local filesystem
- `ENVIRONMENT=cloud` → Uses Google Cloud Storage

## Prerequisites

### For Local Development
- Python 3.12+
- Virtual environment (venv)
- Dependencies in `requirements.txt`

### For Cloud Deployment
- Google Cloud account with billing enabled
- `gcloud` CLI installed
- Docker installed
- Project ID from Google Cloud Console

## Local Development Setup

1. **Create virtual environment and install dependencies**
   ```bash
   python3 -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   ```

2. **Run locally with local storage**
   ```bash
   # Using the convenience script
   ./scripts/run-local.sh
   
   # OR manually
   export ENVIRONMENT=local
   python app.py
   ```

The app will use `data/` and `data/tv_channels.json` for storage.

## Cloud Deployment (Google Cloud Run + GCS)

### 1. Setup Google Cloud Project

```bash
# Set your project ID
PROJECT_ID="your-gcp-project-id"

# Authenticate with Google Cloud
gcloud auth login

# Set the project
gcloud config set project $PROJECT_ID

# Enable required APIs
gcloud services enable run.googleapis.com
gcloud services enable storage-api.googleapis.com
gcloud services enable container.googleapis.com
```

### 2. Update Configuration

Edit `.env.cloud` with your project details:
```
GOOGLE_CLOUD_PROJECT=your-gcp-project-id
GCS_BUCKET_NAME=your-gcp-project-id-tv-programa
```

### 3. Deploy to Cloud Run

**Option A: Using the deployment script (Recommended)**
```bash
./scripts/deploy-gcp.sh your-gcp-project-id
```

**Option B: Manual deployment**
```bash
PROJECT_ID="your-gcp-project-id"
SERVICE_NAME="tv-programa"
REGION="us-central1"
BUCKET_NAME="${PROJECT_ID}-tv-programa"

# Build Docker image
docker build -t gcr.io/${PROJECT_ID}/${SERVICE_NAME}:latest .

# Push to Google Container Registry
docker push gcr.io/${PROJECT_ID}/${SERVICE_NAME}:latest

# Deploy to Cloud Run
gcloud run deploy ${SERVICE_NAME} \
    --image gcr.io/${PROJECT_ID}/${SERVICE_NAME}:latest \
    --region ${REGION} \
    --platform managed \
    --allow-unauthenticated \
    --port 8080 \
    --set-env-vars "ENVIRONMENT=cloud,GOOGLE_CLOUD_PROJECT=${PROJECT_ID},GCS_BUCKET_NAME=${BUCKET_NAME}" \
    --memory 512Mi \
    --cpu 1 \
    --timeout 300
```

### 4. Verify Deployment

```bash
# Get the service URL
gcloud run services describe tv-programa --region us-central1 --format 'value(status.url)'

# Test the status endpoint
curl https://YOUR-CLOUD-RUN-URL/api/status
```

## Storage Backend Details

### LocalStorageProvider
- Reads/writes JSON files from the local filesystem
- Used in development (`ENVIRONMENT=local`)
- Files stored in `data/` directory

### CloudStorageProvider  
- Reads/writes JSON files from Google Cloud Storage
- Used in production (`ENVIRONMENT=cloud`)
- Requires `GCS_BUCKET_NAME` environment variable
- Requires Google Cloud credentials (automatic with Cloud Run)

## Environment Variables

### Local Development (.env.local)
```
ENVIRONMENT=local
```

### Cloud Deployment (.env.cloud)
```
ENVIRONMENT=cloud
GOOGLE_CLOUD_PROJECT=your-project-id
GCS_BUCKET_NAME=your-project-id-tv-programa
PORT=8080
```

## Cloud Storage Bucket Setup

The deployment script automatically creates the GCS bucket if it doesn't exist. The bucket is created with:
- Name format: `{PROJECT_ID}-tv-programa`
- Location: Default (us-central1 region)
- Access: Controlled by Cloud Run service account permissions

## Troubleshooting

### "GCS_BUCKET_NAME not set" error
Make sure the environment variable is properly set in Cloud Run:
```bash
gcloud run services update tv-programa \
    --set-env-vars GCS_BUCKET_NAME=your-project-id-tv-programa \
    --region us-central1
```

### Permission denied reading/writing to GCS
Ensure the Cloud Run service account has permissions to the bucket:
```bash
gcloud projects get-iam-policy ${PROJECT_ID} \
    --flatten="bindings[].members" \
    --format='table(bindings.role)' \
    --filter="bindings.members:serviceAccount:*@appspot.gserviceaccount.com"
```

### Local app can't find files
Ensure `ENVIRONMENT=local` is set and `data/` directory exists:
```bash
mkdir -p data/programs
export ENVIRONMENT=local
python app.py
```

## File Structure

```
tv-programa/
├── app.py                      # FastAPI application
├── storage.py                  # Storage abstraction layer
├── fetch_tv_program.py         # Program fetcher
├── fetch_active_programs.py    # Active channel fetcher
├── requirements.txt            # Python dependencies
├── Dockerfile                  # Cloud Run container image
├── .env.local                  # Local environment vars
├── .env.cloud                  # Cloud environment vars
├── .dockerignore               # Docker build ignore rules
├── data/                       # Local file storage
│   ├── programs/               # Program JSON files
│   └── tv_channels.json        # Channels configuration
├── scripts/
│   ├── deploy-gcp.sh          # GCP deployment script
│   └── run-local.sh            # Local run script
└── frontend/
    └── build/                  # React frontend build
```

## Cost Considerations

- **Cloud Run**: ~$0.15/million requests (free tier: 2M requests/month)
- **Cloud Storage**: ~$0.020/GB/month for storage + egress fees
- **Container Registry**: ~$0.10/GB/month for storage

## Best Practices

1. **Use same code for both environments** - Configuration handled by environment variables
2. **Test locally first** - Develop with `ENVIRONMENT=local`
3. **Monitor GCS costs** - Set up billing alerts
4. **Use Cloud Run service account** - Don't use personal credentials
5. **Implement autoscaling** - Cloud Run scales automatically
6. **Set resource limits** - Current: 512Mi RAM, 1 CPU (adjust as needed)

## Migration from Local to Cloud

1. Ensure all code works locally with `ENVIRONMENT=local`
2. Deploy to Cloud Run with the script
3. Cloud Run automatically handles:
   - Scaling
   - SSL/TLS termination
   - Load balancing
4. Both environments share the same code and logic

## Monitoring and Logs

View Cloud Run logs:
```bash
gcloud run logs read tv-programa --region us-central1
```

View Cloud Storage operations:
```bash
gsutil stat gs://your-bucket-name/
```
