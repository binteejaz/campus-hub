# Dockerfile
# CampusHub Backend — Multi-stage production build

# ─── Stage 1: Dependencies ──────────────────────────────────
FROM node:20-alpine AS deps
WORKDIR /app

# Install dependencies for native modules
RUN apk add --no-cache libc6-compat openssl

COPY package*.json ./
COPY prisma ./prisma/

RUN npm ci --omit=dev && \
    npx prisma generate

# ─── Stage 2: Builder ───────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Compile TypeScript
RUN npm run build

# ─── Stage 3: Production Runner ─────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

# Security: run as non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 campushub

# Copy only what's needed
COPY --from=builder --chown=campushub:nodejs /app/dist ./dist
COPY --from=builder --chown=campushub:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=campushub:nodejs /app/prisma ./prisma
COPY --from=builder --chown=campushub:nodejs /app/package.json ./package.json

# Create upload and log directories
RUN mkdir -p uploads logs && chown -R campushub:nodejs uploads logs

USER campushub

EXPOSE 5000

# Healthcheck
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD wget -qO- http://localhost:5000/health || exit 1

# Run migrations then start
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/server.js"]
