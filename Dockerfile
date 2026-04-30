# ============================================
# ElectionGuide AI — Production Dockerfile
# Multi-stage build with security hardening
# Compatible with Google Cloud Run
# ============================================

# Stage 1: Install production dependencies only
FROM node:20-alpine AS builder
WORKDIR /app

# Copy package files first for layer caching (efficiency optimization)
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Copy application source
COPY . .

# Stage 2: Production runtime — minimal attack surface
FROM node:20-alpine

# Security: set non-root user early
RUN addgroup -g 1001 -S appgroup && \
    adduser -S appuser -u 1001 -G appgroup && \
    apk add --no-cache tini

# Set working directory
WORKDIR /app

# Copy built application with correct ownership
COPY --from=builder --chown=appuser:appgroup /app .

# Security: switch to non-root user
USER appuser

# Cloud Run uses PORT env var (default 8080)
EXPOSE 8080

# Production environment variables
ENV NODE_ENV=production \
    PORT=8080

# Health check for container orchestration
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:8080/api/v1/health || exit 1

# Use tini as PID 1 for proper signal handling (graceful shutdown on Cloud Run)
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "src/server.js"]
