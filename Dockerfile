# Use Python 3.11 as base
FROM python:3.11-slim

# Install system dependencies for face recognition and Node.js
RUN apt-get update && apt-get install -y \
    cmake \
    build-essential \
    curl \
    && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy and install backend dependencies
COPY backend/requirements.txt /app/backend/requirements.txt
RUN pip install --no-cache-dir -r /app/backend/requirements.txt

# Copy and install frontend dependencies
COPY frontend/package.json frontend/.npmrc /app/frontend/
WORKDIR /app/frontend
RUN npm cache clean --force && \
    npm install --legacy-peer-deps

# Copy frontend source and build
COPY frontend/ /app/frontend/
RUN npm run build

# Copy backend source
WORKDIR /app
COPY backend/ /app/backend/

# Create upload directories
RUN mkdir -p /app/uploads/original /app/uploads/users /app/uploads/temp /app/uploads/faces

# Copy start script
COPY start.sh /app/start.sh
RUN chmod +x /app/start.sh

# Expose port (Railway will set PORT env var)
EXPOSE 8000

# Start the application
CMD ["bash", "/app/start.sh"]
