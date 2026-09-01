# =========================================================================
# Multi-Stage Production Dockerfile for MediVault Express / TypeScript Backend
# =========================================================================

# Stage 1: Build & TypeScript Compilation
FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json tsconfig.json ./
RUN npm ci

COPY src ./src
RUN npm run build

# Stage 2: Production Runtime
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=5000

# Install curl for container health checks
RUN apk add --no-cache curl

# Create unprivileged system user for HIPAA / DPDPA security
RUN addgroup --system --gid 1001 medivault && \
    adduser --system --uid 1001 medivault

COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

COPY --from=builder --chown=medivault:medivault /app/dist ./dist

USER medivault

EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:5000/health || exit 1

CMD ["node", "dist/app.js"]
