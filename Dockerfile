# Multi-stage build for Origin platform
FROM node:18-alpine AS base
WORKDIR /app

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat

# Backend dependencies
COPY origin-backend/package*.json ./origin-backend/
RUN cd origin-backend && npm ci --only=production

# Frontend dependencies  
COPY origin-frontend/package*.json ./origin-frontend/
RUN cd origin-frontend && npm ci --only=production

# Backend builder
FROM base AS backend-builder
COPY origin-backend/ ./origin-backend/
COPY --from=deps /app/origin-backend/node_modules ./origin-backend/node_modules
RUN cd origin-backend && npm run build

# Frontend builder
FROM base AS frontend-builder
COPY origin-frontend/ ./origin-frontend/
COPY --from=deps /app/origin-frontend/node_modules ./origin-frontend/node_modules
ARG NEXT_PUBLIC_API_URL=http://localhost:3000
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
RUN cd origin-frontend && npm run build

# Production backend image
FROM node:18-alpine AS backend
WORKDIR /app
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nestjs

COPY --from=backend-builder /app/origin-backend/dist ./dist
COPY --from=backend-builder /app/origin-backend/node_modules ./node_modules
COPY --from=backend-builder /app/origin-backend/package.json ./

# Create uploads directory
RUN mkdir -p uploads && chown nestjs:nodejs uploads

USER nestjs
EXPOSE 3000
ENV PORT=3000
ENV NODE_ENV=production

CMD ["node", "dist/main"]

# Production frontend image  
FROM node:18-alpine AS frontend
WORKDIR /app
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=frontend-builder /app/origin-frontend/public ./public
COPY --from=frontend-builder /app/origin-frontend/.next/standalone ./
COPY --from=frontend-builder /app/origin-frontend/.next/static ./.next/static

USER nextjs
EXPOSE 3001
ENV PORT=3001
ENV NODE_ENV=production

CMD ["node", "server.js"]