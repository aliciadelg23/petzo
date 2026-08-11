# Changelog

Todas as mudanças notáveis são registradas aqui.
Formato baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/).
Versionamento segue [Semantic Versioning](https://semver.org/lang/pt-BR/).

## [1.0.5] — 2026-08-11

### Corrigido

- **`cache.integration.spec.ts` — URL do Redis hardcoded**: a raiz real
  dos 4 testes de cache falhando em CI desde a integração da 1.0.0.
  O spec instanciava `new RedisCache('redis://localhost:6380')` com a
  URL fixa em código — a porta 6380 é a do docker-compose de dev
  local. No CI o Redis está em `127.0.0.1:6379` (via env), então
  `ioredis` tentava conectar num endpoint inexistente, ficava preso
  na offline-queue e os comandos falhavam silenciosamente com
  `[cache] redis error (degrading to miss):` de mensagem vazia,
  causando 2 asserts errados e 2 timeouts de 15s. Substituído por
  `env.REDIS_URL` — passa a respeitar cada ambiente.

  Os hotfixes 1.0.3 (seed + readiness Redis) e 1.0.4 (localhost →
  127.0.0.1) resolveram problemas reais adjacentes mas não este —
  eram fixes no `validate.yml`, e este spec ignorava o env inteiro.

## [1.0.4] — 2026-08-11

### Corrigido

- **CI — resolução IPv6 do `localhost`**: no runner do GitHub Actions
  o `/etc/hosts` mapeia tanto `127.0.0.1 localhost` quanto
  `::1 localhost ip6-localhost`. Node 18+ pode devolver o IPv6 primeiro
  em `dns.lookup('localhost')`. O container do service Redis só escuta
  em IPv4, então o `ioredis` do `RedisCache` tentava conectar em
  `[::1]:6379`, ficava preso na offline-queue e todos os comandos
  falhavam silenciosamente com `[cache] redis error (degrading to miss):`
  de mensagem vazia. Os 4 testes de `cache.integration.spec.ts` que
  dependem de HIT real ou de `smembers`/`del` falhavam (2 por assert,
  2 por timeout de 15s).
  Substituído `localhost` por `127.0.0.1` no `DATABASE_URL`,
  `REDIS_URL` e no step de readiness — garante IPv4 direto sem passar
  pelo resolver do Node. Mesmo tratamento no Postgres por consistência
  (o driver `pg` também poderia sofrer da mesma armadilha).

## [1.0.3] — 2026-08-11

### Corrigido

- **CI — seed ausente**: o job `test` do `.github/workflows/validate.yml`
  rodava `prisma migrate deploy` mas não `prisma db seed`. Como resultado,
  o Postgres do runner ficava com o schema criado mas VAZIO — todos os
  specs de integração dependiam de usuários/roles/produtos do fixture e
  falhavam em cascata (login "Credenciais inválidas" em 9 arquivos,
  `RoleName.CUSTOMER` inexistente, `findFirstOrThrow()` estourando).
  Adicionado `pnpm --filter @petzo/api exec prisma db seed` após o migrate.
- **CI — Redis readiness**: os specs `cache.integration.spec.ts` que
  exercitam Redis real degradavam para MISS silenciosa porque o primeiro
  `set()` do ioredis rodava antes do container terminar o boot completo.
  Adicionado step "Wait for Redis service (readiness)" que instala
  `redis-tools` e loopa `redis-cli ping` até responder `PONG`
  (30 tentativas × 2s = 60s de janela).
- **`stock-concurrency.integration.spec.ts` — afterAll defensivo**:
  quando `beforeAll` falhava (ex.: seed ausente → login falha), o
  `afterAll` chamava `prisma.inventory.update({ where: { productId: undefined }})`
  e estourava com `PrismaClientValidationError`. Guard adicionado:
  se `productId` não foi atribuído, pula a restauração silenciosamente
  (o erro real já vem do `beforeAll`).

## [1.0.2] — 2026-08-11

### Corrigido

- **Mobile — RootLayout**: removida diretiva `@ts-expect-error` no
  `apps/mobile/app/_layout.tsx` que suprimia um erro de tipo de
  `GestureHandlerRootView`. Em ambientes limpos (CI, install fresco) o
  erro não existe — a resolução de `@types/react` fica na versão que
  casa com o React 18 do mobile — e a diretiva "não-usada" fazia o CI
  falhar em `@petzo/mobile#typecheck` com TS2578. Sem a diretiva o
  typecheck passa em CI e em installs limpos localmente.

## [1.0.1] — 2026-08-11

### Corrigido

- **API — env schema**: `LOG_LEVEL` passou a aceitar `'silent'` além dos
  níveis do pino (`fatal|error|warn|info|debug|trace`). O workflow de CI
  (`validate.yml`) seta `LOG_LEVEL=silent` para não poluir a saída dos
  jobs; sem esse valor no enum, o boot da API rejeitava a variável e
  todos os 12 arquivos de integration tests falhavam em setup no CI
  (0 tests executados). Localmente passava porque o default do enum
  (`info`) cobria a ausência da var.

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
