# Petzo — Estratégia de Testes

Testes servem para pegar regressões em **regras de negócio** e **comportamentos observáveis**. Testes que só existem para inflar coverage são explicitamente **evitados**.

---

## Pirâmide

```text
             ┌────────────┐
             │  E2E (2)   │  ← 4 tests: auth flow + purchase flow
             └────────────┘
        ┌─────────────────────┐
        │ Web components (2)  │  ← 8 tests (ProductCard 4 + LoginForm 4)
        │ Backend integr. (7) │  ← 63 tests (auth, catalog, cart, orders,
        │                     │             prisma, pets, wishlist)
        └─────────────────────┘
   ┌─────────────────────────────────┐
   │ Unit — funções puras + machines │  ← 22 backend + 13 web + 5 mobile = 40
   └─────────────────────────────────┘
```

- **Unit** — mais rápidos, mais numerosos, cobrem **regras puras** (pricing, state machines, formatters, hooks/utils).
- **Integration (backend)** — testes com Postgres real via `fastify.inject()`. Cobrem contratos HTTP + regras de acesso (RBAC, ownership, cross-user).
- **Component (web)** — testam **comportamento observável** dos componentes com Testing Library. Sem snapshot testing, sem "renderiza sem crashar".
- **E2E** — Playwright em Chromium. Cobrem só os fluxos-chave: auth, catálogo→produto→carrinho→checkout→pedido. Não replicam o que integration já validou.

---

## Comandos

Nível raiz (Turbo orquestra por workspace):

```bash
pnpm test              # unit + component em todos os workspaces
pnpm test:integration  # integration da API (Postgres necessário)
pnpm test:e2e          # E2E (API + Web precisam estar buildados; ver setup)
pnpm test:e2e:install  # baixa Chromium + system deps (requer sudo no Linux)
```

Por workspace:

```bash
pnpm --filter @petzo/api test            # unit
pnpm --filter @petzo/api test:integration
pnpm --filter @petzo/web test            # component
pnpm --filter @petzo/web test:e2e        # Playwright
pnpm --filter @petzo/mobile test         # unit (Jest + node env)
```

---

## O que testamos (e por quê)

### Backend — unit (22 tests)

Regras puras isoladas:

- **`orders/pricing.spec.ts`** (13) — `computeSubtotal`, `computeShipping` (frete grátis ≥ R$100), `computeDiscount` (percentual/fixo, `minOrderAmount`, cap em subtotal), `computeTotal` (nunca negativo). **Motivo**: preços são a regra de negócio mais crítica; qualquer bug custa dinheiro real.
- **`orders/order.state-machine.spec.ts`** (6) — matriz de transições completa, terminais, idempotente (from===to) rejeitado, código de erro correto (`CONFLICT`). **Motivo**: transição inválida rompe integridade do pedido.
- **`health/health.spec.ts`** (3) — smoke test.

### Backend — integration (63 tests)

Contratos HTTP + regras de acesso:

- **auth** (9) — register/login/refresh/logout/me + cookie rotation + ownership.
- **catalog/products** (21) — busca, filtros, ordenação, paginação, RBAC (CUSTOMER 403 em write), soft-delete, unique slug.
- **cart** (8) — idempotência de add, unique(cart,product), cross-user ataque → 404, stock overflow → 409.
- **orders** (8) — checkout em transação, snapshot de preços, campos maliciosos no body IGNORADOS, cupom aplicado corretamente.
- **pets** (6) — CRUD + ownership check (404 para alheio).
- **wishlist** (6) — idempotência de add/remove + isolamento por usuário.
- **prisma** (5) — smoke test de conexão + assumptions do schema.

Não testamos: rotas admin de `admin-dashboard`, e-commerce advanced, recommendations, cache — cada uma tem sua branch feature com seu spec dedicado.

### Web — component (8 tests)

**Regra**: testar comportamento que o usuário observa, não implementação.

- **`ProductCard`** (4) — renderiza nome/marca/preço formatado; badge "Esgotado" quando `available=false`; sem imagem cai em placeholder; link direciona para `/products/:slug`.
- **`LoginForm`** (4) — validação Zod bloqueia submit; sucesso redireciona para `/conta` (ou `?redirect=…`); erro 401 mostra mensagem amigável.

Não testamos:
- `<Container>`, `<Button>` — wrappers triviais.
- Pages RSC completas — testadas via E2E (o pipeline real).
- Providers — testados implicitamente via componentes que os consomem.

### Web — funções puras (13 tests)

- **`features/catalog/lib.spec.ts`** — `formatBRL`, `buildProductsQueryString`, `parseProductsQuery`, `mergeQuery`. **Motivo**: URL-as-state depende disso ser correto; regressão quebra o catálogo inteiro.

### Mobile — unit (5 tests)

- **`src/lib/format.spec.ts`** — `formatBRL` + `buildQueryString`. **Motivo**: mesmo racional do web.

Component testing em RN foi conscientemente pulado: `jest-expo` carrega o transform inteiro do RN o que quebra em ambiente headless, e sem device físico o valor de renderizar componentes RN em node é baixo. Fluxos críticos do mobile serão cobertos por Maestro (E2E mobile) em fase futura.

### E2E (4 tests)

**`e2e/auth.spec.ts`** (3):
- Login com credenciais válidas leva para `/conta`.
- Senha errada mostra "Email ou senha incorretos".
- Acesso a `/conta` sem sessão redireciona para `/entrar?redirect=…`.

**`e2e/purchase-flow.spec.ts`** (1) — **fluxo crítico end-to-end**:
`login → /products → clica primeiro card → /products/[slug] → adiciona ao carrinho → /carrinho → /checkout → preenche endereço → finaliza → /checkout/sucesso/[id] → clica "Meus pedidos" → /conta/pedidos`.

Um único teste comprehensive vale mais que N testes fragmentados aqui — se qualquer passo falhar, o teste falha em um ponto claro.

Não testamos com E2E:
- Filtros/ordenação/paginação (integration cobre; UI é wrapper trivial).
- Admin (feature branch dedicada).
- Recuperação de senha (feature futura).

---

## O que NÃO testamos (e por quê)

| Não testamos | Motivo |
|---|---|
| Snapshot de UI | Falso positivo em qualquer mudança de layout. Não pega regressão real. |
| "Renderiza sem crashar" | Não é um comportamento — se crasha, `typecheck` ou `build` já pegam. |
| Getters/setters triviais | Testariam a linguagem, não o código. |
| Wrappers finos (Container, Button) | Sem lógica; teste seria tautologia. |
| Componentes de RSC puros | Renderizados no server; cobertos pelo E2E do fluxo. |
| Zod schemas isolados | Zod é bem testado upstream; testamos o COMPORTAMENTO dos forms que os usam. |
| Prisma queries em isolamento | Testadas via integration da API — melhor sinal, menos mock. |
| CSS / Tailwind classes | Não são comportamento; testes ficariam frágeis. |

---

## Setup de E2E

### Pré-requisitos

1. **Docker** com Postgres rodando (`pnpm --filter @petzo/api docker:up`).
2. **DB pronta**: migrations aplicadas + seed (`pnpm --filter @petzo/api db:migrate:deploy && pnpm --filter @petzo/api db:seed`).
3. **API + Web buildados** (`pnpm build`).
4. **Chromium** instalado — no primeiro run:

   ```bash
   pnpm test:e2e:install   # equivale a `playwright install --with-deps chromium`
   ```

   **Em Linux headless (WSL, containers, CI):** o `--with-deps` requer `sudo` para instalar libs de sistema (`libnspr4`, `libnss3`, `libasound2`, etc.). Em ambientes sem sudo:

   ```bash
   sudo apt-get install -y libnspr4 libnss3 libasound2t64 libatk1.0-0 \
        libatk-bridge2.0-0 libcups2 libxcomposite1 libxdamage1 libxfixes3 \
        libxrandr2 libgbm1 libpango-1.0-0 libcairo2
   ```

### Como o Playwright orquestra

`playwright.config.ts` define `webServer` com duas entradas:
1. `node dist/server.js` (API) — precisa `DATABASE_URL` acessível.
2. `pnpm start` (Web) — Next.js em modo produção.

Playwright inicia ambos, espera `/health` e `/`, roda os testes, encerra tudo.

Se um deles já está rodando (dev local), `reuseExistingServer: true` (fora de CI) reaproveita.

### Ambiente atual do sandbox

**Playwright foi CONFIGURADO** mas **NÃO EXECUTADO** neste ambiente porque:
- `sudo` é bloqueado por hook de segurança.
- Chromium binary baixa OK; libs de sistema (`libnspr4.so`) não estão presentes.

Confirmação de que a config está válida:

```text
$ pnpm test:e2e -- --list
Listing tests:
  [chromium] › auth.spec.ts:4:3 › auth flow › login com credenciais válidas leva para /conta
  [chromium] › auth.spec.ts:15:3 › auth flow › login com senha errada mostra erro amigável
  [chromium] › auth.spec.ts:25:3 › auth flow › acesso a /conta sem login redireciona para /entrar
  [chromium] › purchase-flow.spec.ts:11:3 › compra end-to-end › login → catálogo → …
Total: 4 tests in 2 files
```

Em ambiente com sudo (macOS, Linux dev com usuário admin, GitHub Actions runner), os 4 testes rodam sem intervenção.

---

## Roadmap de teste (não implementado nesta fase)

- **E2E de admin** (login como admin → editar produto → verificar no storefront).
- **Maestro** para fluxos críticos do mobile (login + adicionar-ao-carrinho + checkout).
- **Chaos testing** de cache (matar Redis mid-request; verificar fallback silencioso).
- **Performance test** com k6 nos endpoints de catálogo cacheados.
- **Contract tests** entre packages (Pact) — só faz sentido se o `packages/types` for extraído.
