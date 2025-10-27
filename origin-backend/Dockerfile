# Use Node.js 20 LTS with build tools
FROM node:20-alpine

# Install build dependencies
RUN apk add --no-cache python3 make g++ libc6-compat

# Create app directory
WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# Install all dependencies
RUN npm ci

# Copy source code
COPY . .

# Temporarily relax TypeScript strictness for build
RUN npm run build

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nestjs

# Create uploads directory with proper permissions
RUN mkdir -p /app/uploads/videos /app/uploads/thumbnails
RUN chown -R nestjs:nodejs /app/uploads

# Switch to non-root user
USER nestjs

# Expose port
EXPOSE 8080

# Set environment variables
ENV NODE_ENV production
ENV PORT 8080

# Run the application
CMD ["node", "dist/main.js"]
