# @petzo/web

Front-end web do Petzo em **Next.js 15 (App Router)** + **React 19** + **TypeScript** + **Tailwind CSS v4**.

## Arquitetura

```text
src/
├── app/                # Rotas (App Router). Server Components por padrão.
│   ├── layout.tsx      # Root layout (RSC) — carrega Providers (client) para descendentes
│   ├── page.tsx        # Home (RSC)
│   ├── loading.tsx     # Skeleton global (RSC)
│   ├── error.tsx       # Boundary global (Client — requisito do Next)
│   ├── not-found.tsx   # 404 (RSC)
│   ├── sobre/          # Página estática (RSC)
│   └── loja/           # Placeholder — catálogo real virá em fase futura (RSC)
├── components/
│   ├── ui/             # Design system (Button, Container...) — RSC por padrão
│   └── layout/         # Header, Footer — RSC
├── features/           # Módulos por domínio (co-localiza api/hooks/components)
│   └── health/         # Demo: badge de status da API (Client)
├── providers/          # Providers React (TanStack Query...) — Client
├── lib/                # Cross-cutting: http, env, errors, utils
├── config/             # Runtime config (env parsing com Zod)
├── hooks/              # Hooks reutilizáveis entre features
├── types/              # Tipos globais (auth, etc.)
└── styles/             # (implícito em app/globals.css)
```

## Server Components vs Client Components

Regra:
- **Default: RSC.** Todo arquivo em `app/`, `components/`, `features/*` sem `use client` roda no servidor.
- **Client apenas quando necessário**: interação, hooks (`useState`/`useEffect`/`useQuery`), eventos do navegador, APIs do DOM.

Arquivos client neste app (auditáveis via `grep -r "use client" src/`):
- `providers/index.tsx` — precisa expor Context para descendentes
- `providers/query-provider.tsx` — TanStack Query
- `app/error.tsx` — requisito do Next.js (error boundary é sempre client)
- `features/health/components/api-status-badge.tsx` — consome hook do React Query

Nenhum outro arquivo tem `use client`.

## Comunicação com a API

**Regra inviolável**: o app **web** não acessa o PostgreSQL. Toda leitura/escrita passa por `apps/api` via HTTP REST.

Camada:
- `lib/http.ts` — wrapper `fetch()` tipado, com `HttpError` e refresh de token (hook a ser adicionado em fase de auth)
- `features/*/api.ts` — funções por feature que chamam `lib/http`
- `features/*/hooks.ts` — hooks React Query em cima das funções `api.ts`

Sem Server Actions substituindo a API.

## Scripts

```bash
pnpm --filter @petzo/web dev       # dev server (porta 3000)
pnpm --filter @petzo/web build     # build de produção
pnpm --filter @petzo/web start     # servir build
pnpm --filter @petzo/web lint      # eslint (next/core-web-vitals + typescript)
pnpm --filter @petzo/web typecheck # tsc --noEmit
```

## Variáveis de ambiente

Ver `.env.example`. Copiar para `.env.local` no dev:

```bash
cp apps/web/.env.example apps/web/.env.local
```
