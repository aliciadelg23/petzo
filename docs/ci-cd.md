# Petzo — CI/CD

Documentação dos workflows do GitHub Actions e do procedimento para habilitar deploy real.

## Sumário

- [Visão geral](#visão-geral)
- [Workflows](#workflows)
- [Matriz de triggers](#matriz-de-triggers)
- [Segurança e secrets](#segurança-e-secrets)
- [Cache e performance](#cache-e-performance)
- [Habilitando deploy](#habilitando-deploy)
- [Troubleshooting](#troubleshooting)

---

## Visão geral

Quatro workflows em `.github/workflows/`, em padrão **reusable** para DRY:

```text
┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐
│ pr.yml          │   │ push-develop.yml│   │ release.yml     │
│                 │   │                 │   │                 │
│ pull_request →  │   │ push develop →  │   │ push v*.*.* →   │
└────────┬────────┘   └────────┬────────┘   └────────┬────────┘
         │                     │                     │
         └─────────────────────┴─────────────────────┘
                               │
                               ▼
                       ┌──────────────┐
                       │ validate.yml │  ← reusable (workflow_call)
                       │              │
                       │ install →    │
                       │ lint     →   │
                       │ typecheck →  │
                       │ test     →   │
                       │ build        │
                       └──────────────┘
                                            (release chama também
                                             build-images + summary)
```

Todo commit passa pela mesma bateria — o único delta entre triggers está no que roda **depois** da validação.

---

## Workflows

### `validate.yml` (reusable — não é acionado sozinho)

Roda o pipeline canônico em jobs independentes com o mesmo Node 22 + pnpm 11.9.0:

| Job | O que faz | Cache | Depende de |
|---|---|---|---|
| `install` | `pnpm install --frozen-lockfile` | pnpm store | — |
| `lint` | `pnpm lint` (ESLint via Turbo) | `.turbo` | install |
| `typecheck` | `prisma generate` + `pnpm typecheck` (tsc --noEmit) | `.turbo` | install |
| `test` | `prisma migrate deploy` + `pnpm test` (unit) + `pnpm --filter @petzo/api test:integration` | pnpm store | install |
| `build` | `prisma generate` + `pnpm build` → upload de `apps/api/dist` e `apps/web/.next/standalone` como artefatos | `.turbo` | install |

**Serviços em test job**: postgres:17-alpine + redis:7-alpine (healthchecks nativos do runner). Credenciais literais `petzo/petzo` — são **fixtures públicas de CI**, não secrets.

### `pr.yml`

- **Triggers**: `pull_request` em `develop` ou `main`, tipos `opened|synchronize|reopened|ready_for_review`.
- **Concurrency**: cancela runs em andamento do mesmo PR (`pr-<number>` group).
- **Draft PRs**: pulam validação (`if: github.event.pull_request.draft == false`).
- Delega inteiro para `validate.yml`.

### `push-develop.yml`

- **Trigger**: `push` em `develop`.
- **Concurrency**: sem cancelamento — cada commit em develop mantém seu histórico.
- Delega inteiro para `validate.yml`.

### `release.yml`

- **Trigger**: `push` de tag `v*.*.*` (semver, com pré-release opcional).
- **Sequência**:
  1. `validate` (reusable — mesma bateria)
  2. `build-images` — Docker Buildx builda **API + Web** localmente com cache GHA (`type=gha,scope=api|web`). **Sem push para registry.**
  3. `release-summary` — grava resumo no `$GITHUB_STEP_SUMMARY`.
- Steps de push para registry existem no arquivo mas com **`if: false`** — desativados até autorização explícita do owner.

---

## Matriz de triggers

| Evento | Workflow | Roda validação? | Builda imagens? | Deploya? |
|---|---|:-:|:-:|:-:|
| PR aberto/atualizado (não-draft) para develop/main | `pr.yml` | ✅ | ❌ | ❌ |
| PR marcado como draft | `pr.yml` | ⏭️ pula | ❌ | ❌ |
| Push em develop | `push-develop.yml` | ✅ | ❌ | ❌ |
| Tag `v*.*.*` push | `release.yml` | ✅ | ✅ (sem push) | ❌ |

---

## Segurança e secrets

### O que NÃO existe (por decisão)

- **Nenhum secret fictício** criado em Settings > Secrets do repo.
- **Nenhum `${{ secrets.* }}`** exceto `GITHUB_TOKEN` (nativo).
- **Nenhum deploy automatizado** — todos os steps de push para registry estão com `if: false` explícito.

### Fixtures de CI (não são secrets)

O job `test` do `validate.yml` define variáveis literais para o Vitest rodar em runner efêmero:

```yaml
env:
  DATABASE_URL: postgresql://petzo:petzo@localhost:5432/petzo
  REDIS_URL: redis://localhost:6379
  JWT_ACCESS_SECRET: ci-only-not-real-do-not-use-outside-ci-fixtures
  JWT_REFRESH_SECRET: ci-only-not-real-do-not-use-outside-ci-fixtures
```

Esses valores são **públicos** (visíveis no arquivo do workflow no repo). Não são credenciais reais — são só o mínimo para o Fastify e o Prisma bootarem contra o Postgres do runner. Nunca reutilizar fora de CI.

### Defesa contra workflow injection

Todos os workflows evitam interpolar dados de eventos não-confiáveis (título de PR, body de commit, head_ref etc.) diretamente em `run:`. Onde há uso de `github.ref_name` (release), o valor é **capturado em `env:` primeiro** e usado como `$RELEASE_TAG` no shell — nunca `${{ github.ref_name }}` dentro do script.

Referência: <https://github.blog/security/vulnerability-research/how-to-catch-github-actions-workflow-injections-before-attackers-do/>

### Permissões mínimas

Todos os workflows declaram `permissions: contents: read` no topo. Nenhum precisa de `write` no estado atual.

---

## Cache e performance

- **pnpm store**: `actions/setup-node@v4` com `cache: 'pnpm'`. Deduplica downloads entre runs no mesmo runner.
- **Turbo cache**: `actions/cache@v4` em `.turbo` chaveado por SHA, com restore-key por OS. Acelera `lint`/`typecheck`/`build` em runs subsequentes.
- **Docker layer cache**: `docker/build-push-action@v6` com `cache-from: type=gha` + `cache-to: type=gha,mode=max`. Reaproveita camadas entre releases.
- **PR concurrency**: novos pushes cancelam runs anteriores do mesmo PR — economia de minutos.

Tempo esperado em runs a frio: **~4–6 min PR completo** (com serviços + integration), **~1–2 min** em cache warm.

---

## Habilitando deploy

**Deploy real está desativado até autorização explícita do owner.** Quando autorizado:

### 1. Escolher registry

Dois caminhos:

**Opção A — GHCR (recomendado, sem secrets extras)**:
- Adicionar em `release.yml` no topo do job `build-images`:
  ```yaml
  permissions:
    contents: read
    packages: write
  ```
- Login vira:
  ```yaml
  - uses: docker/login-action@v3
    with:
      registry: ghcr.io
      username: ${{ github.actor }}
      password: ${{ secrets.GITHUB_TOKEN }}
  ```
- Tags: `ghcr.io/<owner>/petzo-api:${{ github.ref_name }}` etc.

**Opção B — Registry externo (Docker Hub, ECR, GAR)**:
- Configurar secrets em Settings > Secrets:
  - `REGISTRY_URL`, `REGISTRY_USERNAME`, `REGISTRY_PASSWORD`
- Trocar `if: false` por `if: true` nos steps `Login to registry`, `Push API image`, `Push Web image`.

### 2. Habilitar deploy em ambiente

- **Settings > Environments** → criar environment `production`.
- Habilitar **Required reviewers** (approval manual antes do deploy rodar).
- Adicionar novo job em `release.yml`:
  ```yaml
  deploy:
    needs: build-images
    runs-on: ubuntu-latest
    environment: production  # aciona approval manual
    steps:
      - name: Deploy
        run: ./scripts/deploy.sh $RELEASE_TAG
        env:
          RELEASE_TAG: ${{ github.ref_name }}
  ```

### 3. Rotacionar as fixtures

Se algum dos valores literais do `validate.yml` for reaproveitado em ambiente real (não deveria), rotacione imediatamente — eles estão no histórico do git.

---

## Troubleshooting

**PR não dispara CI** — verifique:
- Está marcado como draft? → Draft não roda por design (`if:` no `pr.yml`).
- Base branch é `develop` ou `main`? → Outras branches não disparam.

---

**Job `test` falha com "database does not exist"** — o Postgres do runner precisa de `migrate deploy` antes dos integration specs. Confira que o step "Prisma generate + migrate deploy" está presente no job (existe por padrão no `validate.yml`).

---

**`build` estoura memória no runner** — o `next build` do Web usa ~2GB de RAM. Runners `ubuntu-latest` têm 7GB, mas se algum dia estourar, dividir o job em dois (build API e build Web separados) resolve.

---

**Turbo cache miss inesperado** — a chave é `turbo-{lint,typecheck,build}-{OS}-{SHA}`. Runs no mesmo SHA reaproveitam; runs em SHAs diferentes caem no `restore-keys` (por OS). Se estiver invalidando sempre, checar se `turbo.json` mudou.

---

**Release builda mas não publica** — comportamento correto. Push para registry está com `if: false`. Ver [Habilitando deploy](#habilitando-deploy).

---

## Comandos úteis (local)

Rodar o mesmo que o CI roda, no host:

```bash
# Deps + Postgres/Redis do compose (equivalente aos "services" do runner)
pnpm docker:dev:up

# Migrations aplicadas
pnpm --filter @petzo/api db:migrate:deploy

# Pipeline completo (mesma sequência do validate.yml)
pnpm lint
pnpm typecheck
pnpm test
pnpm --filter @petzo/api test:integration
pnpm build
```

Isso simula o CI em ~30s cache warm no laptop.

---

## Referências

- Guia oficial de reusable workflows: <https://docs.github.com/en/actions/using-workflows/reusing-workflows>
- Guia de segurança de workflows: <https://docs.github.com/en/actions/security-guides/security-hardening-for-github-actions>
- Buildx GHA cache: <https://docs.docker.com/build/cache/backends/gha/>
