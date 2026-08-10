# Petzo

E-commerce de produtos para pets. Projeto de portfólio full-stack construído como **monorepo** para demonstrar React, React Native, TypeScript, Node.js, PostgreSQL, autenticação, RBAC, testes, Docker e CI/CD — com uma única API REST consumida por web e mobile.

## Estrutura

```text
petzo/
├── apps/
│   ├── api/       # Node.js + Fastify + Prisma (modular monolith)
│   ├── web/       # Next.js 15 (App Router) + Tailwind + shadcn/ui
│   └── mobile/    # React Native / Expo + expo-router + NativeWind
├── packages/
│   ├── types/     # tipos + schemas Zod compartilhados (API/Web/Mobile)
│   ├── shared/    # utils, constantes, HTTP client
│   └── config/    # tsconfig, eslint, prettier base
├── docs/          # documentação, ADRs, diagramas
├── docker/        # docker-compose (dev/prod)
└── .github/       # workflows de CI/CD
```

## Stack

- **Runtime**: Node.js 22 LTS
- **Package manager**: pnpm 11 (workspaces)
- **Monorepo**: Turborepo
- **Linguagem**: TypeScript 5.6+
- **API**: Fastify + Prisma + PostgreSQL + Redis
- **Web**: Next.js 15 + Tailwind + shadcn/ui + TanStack Query + Zustand
- **Mobile**: Expo SDK 52+ + expo-router + NativeWind
- **Validação**: Zod (compartilhado)
- **Testes**: Vitest, Playwright, Maestro
- **Docs API**: OpenAPI 3.1 via `@fastify/swagger`

## Requisitos

- Node.js >= 22 (ver `.nvmrc`)
- pnpm >= 10
- Docker + docker compose (para Postgres/Redis em dev)

## Scripts raiz

```bash
pnpm install         # instala todas as workspaces
pnpm dev             # sobe todos os apps em modo dev (turbo)
pnpm build           # build de todos os pacotes
pnpm lint            # lint em toda a monorepo
pnpm typecheck       # verificação de tipos
pnpm test            # testes de todas as workspaces
pnpm format          # aplica prettier
pnpm format:check    # verifica formatação
```

## Convenções

### Git Flow

- `main` — sempre deployável, protegida
- `develop` — branch de integração
- `feature/*` → merge em `develop`
- `release/*` → merge em `main` (com back-merge para `develop`)
- `hotfix/*` → merge em `main` e `develop`

Nenhum commit direto em `main` ou `develop`.

### Conventional Commits

Formato: `<tipo>(<escopo>): <descrição>`

Tipos aceitos: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`, `build`, `ci`, `perf`.

Escopos sugeridos: `api`, `web`, `mobile`, `shared`, `types`, `config`, `docker`, `ci`, `repo`.

Enforcement automático via `commitlint` no hook `commit-msg` (husky).

## Roadmap

Ver `docs/roadmap.md` (a ser criado). Fases:

0. Fundação do monorepo (esta etapa)
1. API base + autenticação + RBAC
2. Catálogo + reviews
3. Web MVP (storefront + área do cliente)
4. Compras (cart, orders, payments)
5. Admin (dashboard + gestão)
6. Mobile (Expo)
7. Qualidade e entrega (E2E + CI/CD + docs)

## Status

🚧 Em construção — Fase 0 (fundação do monorepo).
