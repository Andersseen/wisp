# syntax=docker/dockerfile:1
FROM oven/bun:1.2-alpine AS builder
WORKDIR /app

# Copy workspace files
COPY package.json bun.lock turbo.json biome.json ./
COPY packages/typescript-config ./packages/typescript-config
COPY packages/db ./packages/db
COPY apps/core ./apps/core

# Install and build
RUN bun install --frozen-lockfile
RUN bun run build --filter=@wisp/core

# Production dependencies
FROM oven/bun:1.2-alpine AS deps
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production

# Distroless final
FROM gcr.io/distroless/cc-debian12:latest AS runner
WORKDIR /app

COPY --from=builder /app/apps/core/dist ./dist
COPY --from=deps /app/node_modules ./node_modules

ENV NODE_ENV=production
EXPOSE 3000

CMD ["./dist/index.js"]
