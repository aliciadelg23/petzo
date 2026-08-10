# @petzo/api

Back-end do Petzo — **Fastify 5** + **TypeScript** + **Prisma 5** + **PostgreSQL** + **Zod** + **OpenAPI/Swagger**.

## Arquitetura — Modular Monolith

Um único deploy. Módulos isolados por domínio em `src/modules/*`. Comunicação entre módulos por chamadas diretas de service (nunca HTTP interno).

Cada módulo segue as camadas:

```text
Route → Controller → Service → Repository → Database
```

- **Route**: binding HTTP (schemas Zod anexados, plugin Fastify)
- **Controller**: adapta `request/reply` → chama service, formata retorno
- **Service**: regra de negócio pura, sem I/O direto (recebe dependências injetadas)
- **Repository**: acesso a dados via Prisma (só aqui existe `PrismaClient`)
- **Database**: PostgreSQL 17

Módulos sem persistência (ex.: `health`) omitem `repository`.

## Estrutura

```text
apps/api/
├── prisma/
│   └── schema.prisma          # generator + datasource (sem models ainda)
├── src/
│   ├── server.ts              # bootstrap: build + listen
│   ├── app.ts                 # buildApp() — cria e configura Fastify
│   ├── config/
│   │   └── env.ts             # env vars validadas com Zod
│   ├── shared/
│   │   └── errors.ts          # AppError, NotFoundError, etc.
│   │                          # (prisma.ts será criado na Fase 1 com o primeiro model)
│   ├── plugins/
│   │   ├── error-handler.ts   # setErrorHandler global (formato uniforme)
│   │   └── swagger.ts         # OpenAPI 3.1 em /docs
│   └── modules/
│       ├── index.ts           # registerModules(app)
│       └── health/
│           ├── health.routes.ts
│           ├── health.controller.ts
│           ├── health.service.ts
│           ├── health.schemas.ts
│           └── health.spec.ts
├── .env.example
├── package.json
├── tsconfig.json
├── tsup.config.ts             # bundle ESM p/ Node 22
├── vitest.config.ts
└── eslint.config.mjs
```

## Scripts

```bash
pnpm --filter @petzo/api dev             # tsx watch (hot reload)
pnpm --filter @petzo/api build           # tsup → dist/
pnpm --filter @petzo/api start           # node dist/server.js
pnpm --filter @petzo/api lint
pnpm --filter @petzo/api typecheck
pnpm --filter @petzo/api test            # vitest run
pnpm --filter @petzo/api test:watch
pnpm --filter @petzo/api db:generate     # prisma generate
pnpm --filter @petzo/api db:migrate:dev  # prisma migrate dev
```

## Endpoints

- `GET /health` → `{ "status": "ok" }` (público)
- `POST /auth/register` → cria CUSTOMER e devolve `{ user, accessToken, accessTokenExpiresIn }` + `Set-Cookie: petzo_refresh`
- `POST /auth/login` → autentica com email + senha (mesma resposta que register)
- `POST /auth/refresh` → rotaciona refresh cookie e devolve novo access
- `POST /auth/logout` → revoga o refresh e limpa o cookie
- `GET /auth/me` → user autenticado (exige `Authorization: Bearer <access>`)
- `GET /docs` → Swagger UI (OpenAPI 3.1)
- `GET /docs/json` → OpenAPI JSON raw

## Autenticação

- **Access token**: JWT HS256, TTL 15 min, contém `{sub, role, email}`.
- **Refresh token**: 32 bytes aleatórios em base64url, TTL 7 dias. A API armazena
  apenas o hash SHA-256. Entregue como cookie `petzo_refresh` (`HttpOnly`, `SameSite=Lax`,
  `Path=/auth`, `Secure` em prod). Rotação em cada `/auth/refresh` com detecção de
  replay (`RefreshToken.replacedById`).
- **Senhas**: hashed com argon2id.
- Roles: `CUSTOMER`, `STAFF`, `ADMIN`. Guardar rota com role: `onRequest: [app.authorize('ADMIN', 'STAFF')]`.
- Guardar rota sem restrição de role (só logado): `onRequest: [app.authenticate]`.

## Variáveis de ambiente

Ver `.env.example`. Copiar para `.env` no dev:

```bash
cp apps/api/.env.example apps/api/.env
```

## Formato de erro padronizado

Toda resposta de erro segue:

```json
{
  "code": "VALIDATION_ERROR",
  "message": "descrição legível",
  "details": { "field": "email", "issue": "invalid_string" },
  "requestId": "abc123"
}
```

Códigos comuns: `VALIDATION_ERROR`, `NOT_FOUND`, `UNAUTHORIZED`, `FORBIDDEN`, `CONFLICT`, `INTERNAL_ERROR`.
