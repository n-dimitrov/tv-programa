# Build stage - create React bundle
FROM node:18-alpine AS frontend-build
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci --only=production
COPY frontend/src ./src
COPY frontend/public ./public
COPY frontend/tsconfig.json ./
RUN npm run build

# Runtime stage
FROM python:3.12-slim
WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend code
COPY app.py .
COPY fetch_*.py .
COPY tv_channels.json .

# Copy React build from frontend stage
COPY --from=frontend-build /app/frontend/build ./frontend/build

# Create data directory
RUN mkdir -p data/programs

# Set environment variables
ENV PORT=8000
ENV PYTHONUNBUFFERED=1

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/api/status')" || exit 1

# Run the application
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]
