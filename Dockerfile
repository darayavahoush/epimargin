# Multi-Stage Dockerfile for EpiMargin Platform

# --- Stage 1: Build React Frontend ---
FROM node:20-slim AS frontend-builder
WORKDIR /app/frontend

COPY frontend/package*.json ./
RUN npm ci

COPY frontend/ ./
RUN npm run build

# --- Stage 2: Python Backend Environment ---
FROM python:3.11-slim AS production
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install Python requirements
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt \
    && pip install --no-cache-dir fastapi uvicorn pydantic scipy pandas

# Copy application source code
COPY epimargin/ ./epimargin/
COPY backend/ ./backend/
COPY setup.py pytest.ini ./

# Copy built frontend assets from stage 1
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

EXPOSE 8000

ENV PORT=8000 \
    HOST=0.0.0.0 \
    PYTHONUNBUFFERED=1

CMD ["uvicorn", "backend.app.main:app", "--host", "0.0.0.0", "--port", "8000"]
