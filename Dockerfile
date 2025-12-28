# Use lightweight Python image
FROM python:3.12-slim

# Set working directory
WORKDIR /app

# Install system dependencies (minimal)
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better caching
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt && \
    pip install --no-cache-dir google-cloud-storage

# Copy application code
COPY app.py .
COPY storage.py .
COPY fetch_tv_program.py .
COPY fetch_active_programs.py .
COPY oscars_lookup.py .

# Copy data
COPY data ./data

# Copy frontend build
COPY frontend/build ./frontend/build

# Cloud Run sets PORT env var, we listen on this port
ENV ENVIRONMENT=cloud

# Run the application (use sh -c to ensure env var substitution)
CMD ["sh", "-c", "exec uvicorn app:app --host 0.0.0.0 --port ${PORT:-8080}"]
