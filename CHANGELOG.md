# Changelog

Todas as mudanças notáveis são registradas aqui.
Formato baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/).
Versionamento segue [Semantic Versioning](https://semver.org/lang/pt-BR/).

## [1.0.0] — 2026-08-11

Primeira release do Petzo — monorepo full-stack de e-commerce para produtos
pet, cobrindo backend, storefront web, painel administrativo, aplicativo
mobile e infraestrutura de deploy.

### API (backend)

- Foundation Fastify 5 + TypeScript + Zod validation em todas as rotas.
- Modelo Postgres 17 via Prisma 5 (20 tabelas, seed determinístico).
- **Autenticação**: JWT (access) + refresh token rotacionado, argon2id
  para senhas, cookie `httpOnly` para refresh, single-flight na renovação.
- **RBAC**: hooks `authenticate` + `authorize(...roles)` (CUSTOMER, STAFF, ADMIN).
- **Catálogo**: produtos, categorias, marcas com busca, filtros, ordenação
  e paginação. Cache Redis com invalidação por tag.
- **Carrinho + Checkout**: transação única com decremento atômico de estoque
  (`UPDATE ... WHERE quantity >= N`) — sem oversell em concorrência.
- **Recomendações**: engine determinístico por regras (não médicas), com
  guardrail para nunca sugerir tratamento veterinário.
- **Pets**: CRUD dos animais de estimação do usuário.
- **Wishlist**: favoritos idempotentes por usuário.
- **Reviews**: comentários e nota, gate obrigatório de "comprou o produto".
- **Coupons**: percentual/fixo, com data, `minOrderAmount`, `maxUses`,
  validação transacional.
- **Subscriptions**: assinatura recorrente (ACTIVE/PAUSED/CANCELLED), sem
  cobrança real — cadastro + estado.
- **Admin**: dashboard com métricas + CRUD de produtos/inventário/pedidos.
- **Segurança**: `@fastify/rate-limit` global + limites estritos em `/auth/*`,
  JWT secrets ≥ 32 caracteres, `@fastify/helmet`, CORS restrito.
- **Cache**: `readThrough` com single-flight para deduplicar MISS concorrente,
  `NullCache`/`MemoryCache`/`RedisCache` intercambiáveis.

### Web (storefront + admin)

- Next.js 15 App Router + React 19 + Tailwind v4.
- RSC/Client split defensável (RSC para SEO/dados públicos, Client para
  interação e forms).
- TanStack Query para server state, Zustand só para sessão de auth.
- **SEO**: metadata dinâmica por produto, canonical no domínio do site
  (não da API), JSON-LD Product + Breadcrumb.
- **Acessibilidade**: forms com `htmlFor`/`aria-invalid`/`aria-describedby`
  automatizados em `FormField`.
- Painel Admin (dashboard, produtos, inventário, pedidos) com gráficos Recharts.
- Toast global via Context + auto-dismiss.
- Error boundaries por route.
- Suspense boundaries para streaming de conteúdo (products, categories).

### Mobile

- Expo SDK 52 + expo-router + React Native 0.76.
- SecureStore para refresh token (Keychain iOS / Keystore Android).
- Fluxos: login, catálogo, produto, carrinho, checkout, pedidos, pets, favoritos.
- Reuso do mesmo backend REST via cliente HTTP tipado.

### Infra e devops

- **Docker**: stack completa (Postgres + Redis + API + Web) via compose,
  Dockerfiles multi-stage rodando como usuário non-root, healthchecks.
- **CI/CD**: GitHub Actions com workflow reusable para PR / push develop /
  release. Zero secrets fictícios; deploy real gated com `if: false`.
- **Monorepo**: pnpm workspaces + Turborepo. 4 apps (api, web, mobile) +
  packages compartilhados.

### Testes

- 51 testes unitários (API: 22 + Web: 24 + Mobile: 5).
- 116 testes de integração backend (Fastify inject + Postgres real +
  regras de segurança e concorrência).
- 4 specs E2E Playwright (login + fluxo de compra completo).

### Documentação

- `docs/roadmap.md`, `docs/frontend-react-decisions.md`, `docs/testing-strategy.md`,
  `docs/performance-strategy.md`, `docs/recommendations-architecture.md`,
  `docs/docker.md`, `docs/ci-cd.md`.
- ADRs em `docs/adr/`.
- OpenAPI 3.1 em runtime via Swagger UI (`/docs`).

### Notas de segurança

- Nenhum secret real está commitado. Templates em `.env.example` usam
  placeholders explicitamente marcados.
- Deploy automatizado está **desativado** por padrão até autorização
  explícita do owner do repositório.
