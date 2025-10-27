# Use Node.js 20 LTS
FROM node:20-alpine

# Install basic tools and additional tools for build process
RUN apk add --no-cache python3 make g++ libc6-compat rsync

# Create app directory
WORKDIR /app

# Copy essential files only
COPY package.json package-lock.json* ./

# Install minimal dependencies  
RUN npm ci --production --ignore-scripts

# Copy frontend build (will be created during build process)
COPY ../origin-frontend/out ./public/

# Create a unified server that serves both frontend and backend
COPY server.js /app/dist/server.js

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nodejs

# Create uploads directory
RUN mkdir -p /app/uploads/videos /app/uploads/thumbnails

# Set permissions
RUN chown -R nodejs:nodejs /app/uploads

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 8080

# Environment variables
ENV NODE_ENV production
ENV PORT 8080

# Run the server
CMD ["node", "/app/dist/server.js"]
