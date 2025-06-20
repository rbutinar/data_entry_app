# Multi-stage build for React frontend and Python backend
FROM node:18-alpine AS frontend-build

WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci --only=production

COPY frontend/ ./
RUN npm run build

# Python backend stage
FROM python:3.11-slim

# Install system dependencies for ODBC drivers
RUN apt-get update && apt-get install -y \
    curl \
    apt-transport-https \
    gnupg \
    && curl https://packages.microsoft.com/keys/microsoft.asc | gpg --dearmor -o /usr/share/keyrings/microsoft-prod.gpg \
    && curl https://packages.microsoft.com/config/debian/12/prod.list > /etc/apt/sources.list.d/mssql-release.list \
    && apt-get update \
    && ACCEPT_EULA=Y apt-get install -y msodbcsql18 \
    && apt-get install -y unixodbc-dev \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy Python requirements and install dependencies
COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend code
COPY backend/ ./backend/

# Copy .env file for configuration
COPY .env ./

# Copy frontend build from previous stage
COPY --from=frontend-build /app/frontend/build ./frontend/build

# Create a simple script to serve both frontend and backend
RUN echo '#!/bin/bash\n\
uvicorn backend.app.main:app --host 0.0.0.0 --port 8000' > start.sh && \
    chmod +x start.sh

EXPOSE 8000

CMD ["./start.sh"]