# ================================
# Multi-stage Dockerfile for Red Tetris
# Supports both development and production environments
# ================================

# --------------------------------
# Stage 1: Base - Install dependencies
# --------------------------------
FROM node:22-alpine3.22 AS base

WORKDIR /app

# Update Alpine packages to patch known vulnerabilities
RUN apk upgrade --no-cache

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# --------------------------------
# Stage 2: Test - Run tests
# --------------------------------
FROM base AS test

# Copy application source
COPY . .

# Run tests with coverage
RUN npm run test:coverage

# --------------------------------
# Stage 3: Builder - Build for production
# --------------------------------
FROM base AS builder

# Copy application source
COPY . .

# Build the Nuxt application
RUN npm run build

# --------------------------------
# Stage 4: Development - Hot reload environment
# --------------------------------
FROM node:22-alpine3.22 AS development

WORKDIR /app

# Update Alpine packages to patch known vulnerabilities
RUN apk upgrade --no-cache

# Copy dependencies from base
COPY --from=base /app/node_modules ./node_modules
COPY package*.json ./

# Copy application source (will be overridden by volume in development)
COPY . .

# Expose ports
# 3000 = Nuxt frontend
# 3001 = Socket.IO backend
EXPOSE 3000 3001

# Set environment to development
ENV NODE_ENV=development

# Health check for both services
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000 || exit 1

# Start development server
CMD ["npm", "run", "dev"]

# --------------------------------
# Stage 5: Production - Optimized runtime
# --------------------------------
FROM node:22-alpine3.22 AS production

WORKDIR /app

# Update Alpine packages to patch known vulnerabilities
RUN apk upgrade --no-cache

# Install only production dependencies
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Copy built application from builder
COPY --from=builder /app/.output ./.output
COPY --from=builder /app/nuxt.config.ts ./nuxt.config.ts
COPY --from=builder /app/server ./server
COPY --from=builder /app/app ./app
COPY --from=builder /app/public ./public

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nuxtjs -u 1001 && \
    chown -R nuxtjs:nodejs /app

USER nuxtjs

# Expose ports
EXPOSE 3000 3001

# Set environment to production
ENV NODE_ENV=production
ENV HOST=0.0.0.0

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000 || exit 1

# Start production server
CMD ["npm", "run", "preview"]
