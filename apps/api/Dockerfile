# syntax=docker/dockerfile:1.7
# --------------------------------------------------------------------------
# Petzo API — multi-stage build
# Base:  Node 22 Alpine (glibc-compat + openssl para Prisma).
# Stages: deps -> build -> runtime.
# --------------------------------------------------------------------------

# ---------- base: pnpm + toolchain compartilhado -----------------------------
FROM node:22-alpine AS base
RUN apk add --no-cache libc6-compat openssl wget
RUN corepack enable && corepack prepare pnpm@11.9.0 --activate
WORKDIR /repo

# ---------- deps: instala dependências do workspace (com dev) ----------------
FROM base AS deps
# Copia apenas manifests para maximizar reuso de cache do pnpm.
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
# Filtra para instalar somente o subtree da API (economia de tempo/tamanho).
RUN pnpm install --frozen-lockfile --filter @petzo/api...

# ---------- build: compila + gera prisma client ------------------------------
FROM deps AS build
COPY tsconfig.base.json ./
COPY apps/api ./apps/api
# Gera client antes do build para tipos do Prisma resolverem.
RUN pnpm --filter @petzo/api exec prisma generate
RUN pnpm --filter @petzo/api build

# ---------- runtime: imagem final mínima -------------------------------------
FROM node:22-alpine AS runtime
RUN apk add --no-cache libc6-compat openssl wget \
 && addgroup -S petzo && adduser -S petzo -G petzo \
 && corepack enable && corepack prepare pnpm@11.9.0 --activate
WORKDIR /app
ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=3333

# node_modules do workspace (dev deps ficam mas o footprint é aceitável no
# portfólio; para prod-real, adicionaríamos um stage `pnpm --prod`).
COPY --from=build --chown=petzo:petzo /repo/node_modules /app/node_modules
COPY --from=build --chown=petzo:petzo /repo/apps/api/node_modules /app/apps/api/node_modules
COPY --from=build --chown=petzo:petzo /repo/apps/api/dist /app/apps/api/dist
COPY --from=build --chown=petzo:petzo /repo/apps/api/prisma /app/apps/api/prisma
COPY --from=build --chown=petzo:petzo /repo/apps/api/package.json /app/apps/api/package.json
# Manifests do workspace — necessários para `pnpm db:*` (migrations/seed) rodar
# dentro do container sem tentar reinstalar dependências.
COPY --from=build --chown=petzo:petzo /repo/pnpm-lock.yaml /app/pnpm-lock.yaml
COPY --from=build --chown=petzo:petzo /repo/pnpm-workspace.yaml /app/pnpm-workspace.yaml
COPY --from=build --chown=petzo:petzo /repo/package.json /app/package.json

USER petzo
WORKDIR /app/apps/api
EXPOSE 3333

HEALTHCHECK --interval=10s --timeout=3s --start-period=15s --retries=5 \
  CMD wget -qO- http://127.0.0.1:${PORT}/health || exit 1

CMD ["node", "dist/server.js"]
