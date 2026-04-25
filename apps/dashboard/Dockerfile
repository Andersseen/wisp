# syntax=docker/dockerfile:1
FROM oven/bun:1.2-alpine AS builder
WORKDIR /app

COPY package.json bun.lock turbo.json biome.json ./
COPY packages/typescript-config ./packages/typescript-config
COPY packages/db ./packages/db
COPY apps/dashboard ./apps/dashboard

RUN bun install --frozen-lockfile
RUN cd apps/dashboard && bunx ng build --configuration production

FROM nginx:1.27-alpine AS runner
COPY --from=builder /app/apps/dashboard/dist/dashboard/browser /usr/share/nginx/html
COPY infra/caddy/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
