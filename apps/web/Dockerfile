# syntax=docker/dockerfile:1.7
# --------------------------------------------------------------------------
# Petzo Web — multi-stage build (Next.js 15 standalone output)
# Base:  Node 22 Alpine.
# Stages: deps -> build -> runtime (só copia .next/standalone + static + public).
# --------------------------------------------------------------------------

# ---------- base -------------------------------------------------------------
FROM node:22-alpine AS base
RUN apk add --no-cache libc6-compat wget
RUN corepack enable && corepack prepare pnpm@11.9.0 --activate
WORKDIR /repo

# ---------- deps -------------------------------------------------------------
FROM base AS deps
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
RUN pnpm install --frozen-lockfile --filter @petzo/web...

# ---------- build ------------------------------------------------------------
FROM deps AS build
COPY tsconfig.base.json ./
COPY apps/web ./apps/web
# URL do backend usada em RSC/fetch é lida em runtime — usamos placeholder no build.
# NEXT_PUBLIC_* são embutidas no bundle do browser em build-time.
ARG NEXT_PUBLIC_API_URL=http://api:3333
ARG NEXT_PUBLIC_SITE_URL=http://localhost:3000
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
ENV NEXT_PUBLIC_SITE_URL=${NEXT_PUBLIC_SITE_URL}
RUN pnpm --filter @petzo/web build

# ---------- runtime ----------------------------------------------------------
FROM node:22-alpine AS runtime
RUN apk add --no-cache wget \
 && addgroup -S petzo && adduser -S petzo -G petzo
WORKDIR /app
ENV NODE_ENV=production \
    HOSTNAME=0.0.0.0 \
    PORT=3000

# Next standalone: server.js + apenas as deps que rodam em runtime.
COPY --from=build --chown=petzo:petzo /repo/apps/web/.next/standalone /app/
COPY --from=build --chown=petzo:petzo /repo/apps/web/.next/static /app/apps/web/.next/static
COPY --from=build --chown=petzo:petzo /repo/apps/web/public /app/apps/web/public

USER petzo
WORKDIR /app/apps/web
EXPOSE 3000

HEALTHCHECK --interval=10s --timeout=3s --start-period=15s --retries=5 \
  CMD wget -qO- http://127.0.0.1:${PORT}/ || exit 1

CMD ["node", "server.js"]
