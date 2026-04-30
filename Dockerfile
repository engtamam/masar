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

# Stage 3: Production
FROM oven/bun:1 AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Install curl for healthcheck (Alpine)
RUN apk add --no-cache curl

# Create non-root user (compatible with all distros)
RUN groupadd -g 1001 nodejs || true
RUN useradd -u 1001 -g nodejs -s /bin/sh nextjs || true

# Copy standalone output
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Copy prisma schema and seed script (needed for seed command inside container)
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/src/lib/seed.ts ./src/lib/seed.ts

# Create data directories with correct permissions
RUN mkdir -p /app/db /app/upload && chown -R nextjs:nodejs /app/db /app/upload

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["bun", "server.js"]
