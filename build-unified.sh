#!/bin/bash

# Build script for unified Origin deployment
echo "🚀 Building Unified Origin Platform..."

# Set environment variables for frontend build
export NEXT_PUBLIC_BACKEND_URL="https://originvideo.duckdns.org"
export NEXT_PUBLIC_API_BASE="https://originvideo.duckdns.org"
export NEXT_PUBLIC_API_URL="https://originvideo.duckdns.org"

echo "📦 Step 1: Building frontend..."
cd origin-frontend

# Install frontend dependencies
npm install

# Build frontend for static export
npm run build

echo "✅ Frontend build complete"

# Return to root directory
cd ..

echo "🐳 Step 2: Building Docker image for unified deployment..."
cd origin-backend

# Copy frontend build to backend directory for Docker build
rsync -av ../origin-frontend/out/ ./public/

# Show what was copied
echo "📁 Frontend files copied:"
ls -la ./public/

# Build the Docker image
docker build -t origin-unified .

echo "✅ Docker build complete"

echo "🎉 Unified build complete!"
echo ""
echo "📋 Next steps:"
echo "1. Run: docker run -p 8080:8080 origin-unified"
echo "2. Access: http://localhost:8080"
echo "3. Deploy to your server at originvideo.duckdns.org"
