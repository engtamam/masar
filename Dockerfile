# Stage 1: Install dependencies
FROM oven/bun:1 AS deps
WORKDIR /app
COPY package.json bun.lock ./
COPY prisma ./prisma/
RUN bun install --frozen-lockfile
RUN bun run db:generate

# Stage 2: Build
FROM oven/bun:1 AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN bun run db:generate
RUN bun run build

# Stage 3: Production (use Node.js for runtime — optimized for Next.js standalone)
FROM node:20-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Install curl for healthcheck
RUN apt-get update && apt-get install -y --no-install-recommends curl && rm -rf /var/lib/apt/lists/*

# Create non-root user (-m creates /home/nextjs for npx/tsx cache)
RUN groupadd -g 1001 nodejs && useradd -u 1001 -g nodejs -s /bin/sh -m nextjs

# Copy standalone output
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Copy full node_modules with ownership (needed for seed: bcryptjs, prisma, etc.)
# Using --chown avoids a separate chown layer that doubles image size
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules

# Copy package.json (needed by npx to resolve binaries)
COPY --from=builder --chown=nextjs:nodejs /app/package.json ./package.json

# Copy prisma schema and lib files (needed for seed command inside container)
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/src/lib ./src/lib

# Create data directories with correct permissions
RUN mkdir -p /app/db /app/upload && chown -R nextjs:nodejs /app/db /app/upload

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
