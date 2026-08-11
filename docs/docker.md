# Petzo — Ambiente Dockerizado

Guia completo do ambiente containerizado: **PostgreSQL 17 + Redis 7 + API Fastify + Web Next.js 15**.

## Sumário

- [Arquitetura](#arquitetura)
- [Pré-requisitos](#pré-requisitos)
- [Instalação](#instalação)
- [Inicialização](#inicialização)
- [Migrations](#migrations)
- [Seed](#seed)
- [Testes](#testes)
- [Shutdown](#shutdown)
- [Troubleshooting](#troubleshooting)

---

## Arquitetura

Dois arquivos de compose atendem cenários diferentes:

| Arquivo | Serviços | Quando usar |
|---|---|---|
| `docker/docker-compose.dev.yml` | postgres + redis | **Dev day-to-day** — API/Web rodam no host (`pnpm dev`) para hot-reload; só as dependências ficam containerizadas |
| `docker/docker-compose.yml` | postgres + redis + api + web | **Ambiente completo** — smoke test em ambiente parecido com produção, CI local, demo |

**Portas expostas** (configuráveis em `.env`):

| Serviço | Host | Interno | Observação |
|---|---:|---:|---|
| PostgreSQL | 5433 | 5432 | Evita conflito com Postgres local em 5432 |
| Redis | 6380 | 6379 | Evita conflito com Redis local em 6379 |
| API | 3333 | 3333 | |
| Web | 3000 | 3000 | |

**Rede interna do compose**: os serviços comunicam por nome (`postgres:5432`, `redis:6379`, `api:3333`). Não usam portas do host.

**Imagens**: multi-stage build. Base `node:22-alpine`. Web usa `output: 'standalone'` do Next para gerar imagem enxuta.

**Runtime**: containers rodam como usuário `petzo` (uid não-root). Cada serviço declara `healthcheck` e `depends_on: {condition: service_healthy}` — o compose respeita a ordem certa de boot.

**Secrets**: `.env` na raiz do repo (git-ignored). Nunca commitados. `.env.example` fornece o template com valores de dev.

---

## Pré-requisitos

- **Docker** ≥ 24 com plugin **Compose v2** (o comando é `docker compose`, sem hífen).
- **Node 22** e **pnpm 11** — apenas para rodar os scripts orquestradores no host. Não são necessários para o runtime dos containers.
- Portas 3000, 3333, 5433, 6380 livres no host.

Confira:

```bash
docker --version                # ≥ 24
docker compose version          # ≥ v2.20
node --version                  # v22.x
pnpm --version                  # 11.x
```

---

## Instalação

Do zero em uma máquina que já tem os pré-requisitos:

```bash
# 1. Clonar o repo
git clone https://github.com/aliciadelg23/petzo.git
cd petzo

# 2. Instalar deps do host (para scripts + husky)
pnpm install

# 3. Copiar o template de env
cp .env.example .env
#    (opcional) editar .env com segredos reais para produção;
#    para dev os valores default do template já funcionam

# 4. Buildar as imagens Docker
pnpm docker:build
#    equivale a: docker compose --env-file .env -f docker/docker-compose.yml build
```

O primeiro build baixa `node:22-alpine`, `postgres:17-alpine`, `redis:7-alpine` e compila API + Web. Dura ~2–4 min em máquina limpa; builds subsequentes reaproveitam cache.

---

## Inicialização

### Stack completa (postgres + redis + api + web)

```bash
pnpm docker:up
#    equivale a: docker compose --env-file .env -f docker/docker-compose.yml up -d
```

Verificar:

```bash
pnpm docker:ps      # listar containers com status healthcheck
pnpm docker:logs    # tail -f dos logs de todos serviços (Ctrl+C sai)
```

Endpoints após `healthy`:

- API: <http://localhost:3333/health>
- API docs (Swagger UI): <http://localhost:3333/docs>
- Web: <http://localhost:3000>

### Modo dev (só postgres + redis, API/Web no host)

Para iterar rápido com hot-reload:

```bash
pnpm docker:dev:up          # sobe só postgres + redis
pnpm --filter @petzo/api dev  # em outro terminal
pnpm --filter @petzo/web dev  # em outro terminal
```

---

## Migrations

O Prisma **não roda migrations no boot** — decisão explícita para não bloquear o healthcheck do container em produção e permitir zero-downtime deploys. Aplique manualmente:

```bash
pnpm docker:migrate
#    equivale a: docker compose … exec api ./node_modules/.bin/prisma migrate deploy
```

Isso executa **todas as migrations pendentes** contra o Postgres do container. Idempotente — pode rodar quantas vezes quiser.

### Criar nova migration (workflow de dev)

Como as migrations exigem prompt interativo do Prisma (`migrate dev`), elas são criadas **no host**, contra o Postgres do container:

```bash
pnpm docker:dev:up                                  # só o Postgres
pnpm --filter @petzo/api db:migrate:dev             # cria migration nova
```

Depois de commitar a migration, no ambiente containerizado basta `pnpm docker:migrate`.

---

## Seed

Carrega dados de demonstração (usuários, categorias, marcas, produtos):

```bash
pnpm docker:seed
```

Ou dentro do container:

```bash
docker compose --env-file .env -f docker/docker-compose.yml exec api \
  ./node_modules/.bin/prisma db seed
```

**Credenciais de dev** (após seed):

| Email | Senha | Role |
|---|---|---|
| `admin@petzo.test` | `Password!1` | ADMIN |
| `alice.dev@petzo.test` | `Password!1` | CUSTOMER |
| `bruno.dev@petzo.test` | `Password!1` | CUSTOMER |
| `staff@petzo.test` | `Password!1` | STAFF |

⚠️ **Não usar em produção** — hashes são regenerados a cada seed com senha fixa.

---

## Testes

Testes rodam no **host**, contra o Postgres do container. Isso evita empacotar dev dependencies na imagem de runtime.

```bash
# Sobe deps se ainda não estão de pé
pnpm docker:dev:up

# Migrations aplicadas
pnpm --filter @petzo/api db:migrate:deploy

# Unit (rápido, isolado)
pnpm --filter @petzo/api test

# Integration (usa o Postgres do container)
pnpm --filter @petzo/api test:integration

# Web (component + lib)
pnpm --filter @petzo/web test

# Tudo de uma vez (orquestrado por Turbo)
pnpm test
```

Para o roadmap completo de testes (E2E, mobile, coverage por camada), ver `docs/testing-strategy.md` na branch `feature/testing`.

---

## Shutdown

### Parar sem apagar dados

```bash
pnpm docker:down
```

Containers vão embora, volumes ficam. Próximo `docker:up` reaproveita o DB do último estado.

### Parar apagando tudo (nuke)

Quando quiser começar do zero — remove containers, network e **os volumes** (Postgres + Redis):

```bash
pnpm docker:nuke
#    equivale a: docker compose … down -v --remove-orphans
```

Depois disso, `docker:up` cria o DB vazio; você precisa rodar `docker:migrate` + `docker:seed` de novo.

### Parar só o dev (postgres + redis)

```bash
pnpm docker:dev:down
```

---

## Troubleshooting

**"port is already allocated"** — outra instância local está segurando a porta. Ou você já tem um Postgres/Redis local rodando. Descubra:

```bash
lsof -i :3333          # ou :3000, :5433, :6380
```

Solução: matar o processo ou trocar a porta em `.env` (ex.: `API_HOST_PORT=3334`).

---

**"P1000: Authentication failed against database server"** após trocar `POSTGRES_PASSWORD` no `.env` — o Postgres persistiu o password antigo no volume. Nuke e recomeça:

```bash
pnpm docker:nuke
pnpm docker:up
pnpm docker:migrate
pnpm docker:seed
```

---

**Web não conecta na API** — o browser roda no seu host, então usa `NEXT_PUBLIC_API_URL` (que deve apontar para `http://localhost:3333`). Dentro do container do Web, o SSR/RSC usa a mesma URL. Se você trocar `API_HOST_PORT`, ajuste `NEXT_PUBLIC_API_URL` no `.env` para bater e faça **rebuild** do web (o valor é embutido no bundle):

```bash
pnpm docker:build
pnpm docker:up
```

---

**"exec pnpm: executable file not found"** ao rodar comandos dentro do container — use o binário direto do node_modules. Os scripts `docker:migrate` e `docker:seed` já fazem isso.

---

**Containers sobem mas API fica em `unhealthy`** — veja logs:

```bash
pnpm docker:logs
docker compose --env-file .env -f docker/docker-compose.yml logs api
```

Causas comuns: DATABASE_URL apontando para host errado (deve ser `postgres:5432`, não `localhost`), migrations não aplicadas, JWT_*_SECRET vazio.

---

**Build do web falha com "Module not found"** — o `output: 'standalone'` do Next precisa do `outputFileTracingRoot` apontando para a raiz do monorepo (já configurado em `apps/web/next.config.ts`). Se der problema, tente `pnpm --filter @petzo/web clean` no host antes de rebuildar.

---

## Comandos consolidados

```bash
# Dev day-to-day (só deps containerizadas)
pnpm docker:dev:up          # postgres + redis
pnpm docker:dev:down

# Stack completa
pnpm docker:build           # build das imagens
pnpm docker:up              # sobe tudo
pnpm docker:down            # para (volumes ficam)
pnpm docker:nuke            # para e remove volumes
pnpm docker:ps              # status
pnpm docker:logs            # logs -f
pnpm docker:migrate         # prisma migrate deploy
pnpm docker:seed            # prisma db seed
```

Todos os scripts anexam `--env-file .env` automaticamente — não é preciso lembrar.
