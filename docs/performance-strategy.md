# Petzo — Estratégia de Performance

Este documento consolida as decisões de performance do projeto: **onde** cacheamos, **como** invalidamos, o **estado do PostgreSQL** (índices, N+1, payloads) e o **rendering do Next.js** (RSC + streaming + revalidation).

Regra geral: só otimizar onde há evidência de benefício. Sem "teatro de performance".

---

## 1. Redis — quando SIM, quando NÃO

### Cacheamos

| Endpoint | TTL | Tag de invalidação | Justificativa |
|---|---|---|---|
| `GET /categories` | 300 s | `catalog:categories` | Muda pouco; alto volume de leitura em toda a UI de filtros. |
| `GET /brands` | 300 s | `catalog:brands` | Idem categorias. |
| `GET /products?…` (storefront) | 30 s | `catalog:products` | Alto tráfego (scroll + filtros). Cache curto evita staleness perceptível mas absorve rajadas. Query hash → mesma resposta reutilizada. |
| `GET /products/:id` (storefront) | 60 s | `catalog:products` | Detalhe é single row com JOINs de categoria/marca/imagens. |

### Não cacheamos

| Endpoint | Motivo |
|---|---|
| `GET /cart`, `POST/PATCH/DELETE /cart/*` | Per-user, mutação constante. Cache aumentaria complexidade sem ganho. |
| `POST /orders`, `GET /orders`, `GET /orders/:id` | Per-user + writes transacionais. |
| `GET /auth/me` | 1 SELECT indexado — mais barato que a viagem ao Redis. |
| `GET /admin/dashboard/metrics` | Storage-heavy quando cacheado (JSON grande) + freshness importa (admin espera dados vivos). |
| Endpoints admin de escrita | Óbvio: caches são de leitura. |
| `GET /products` com bearer STAFF/ADMIN | `includeInactive=true` cai fora do cache — admin não pode ver produto antigo pós-write no painel. |

---

## 2. Cache key strategy

- **Namespace**: todas as chaves prefixadas com `petzo:cache:`. Tags com `petzo:tag:`.
- **Chave para listas parametrizadas**: `stableKey('catalog:prods', { ...query, includeInactive })`.
  - `stableKey` ordena as chaves do objeto e serializa; hash SHA-256 dos primeiros 16 chars.
  - Isso garante que `?category=caes&page=1` e `?page=1&category=caes` batem na **mesma** entrada de cache.
- **Chave para detalhe único**: `catalog:prod:<slugOrId>`.
- **Chave para categorias/marcas**: `catalog:cats:list` e `catalog:brands:list` (lista única sem query params).

### Tags

Uma chave pode ser registrada em múltiplas tags no `set()`. Ao invalidar uma tag:

```text
SMEMBERS petzo:tag:catalog:products  → lista de chaves de cache dentro dela
DEL <chaves> petzo:tag:catalog:products  → limpa tudo em um round-trip
```

**Trade-off**: tags acumulam membros ao longo do tempo (não expiram sozinhas). Aceitável porque cada `invalidateTag` limpa o set inteiro; entre invalidations o set cresce na proporção dos writes de cache — cache curto (30 s) mantém o tamanho bounded.

---

## 3. Estratégia de invalidação

**Read-through, invalidação por tag.** Nunca stale-while-revalidate ou similar. TTL curto + invalidação explícita em writes.

### Onde invalidamos

| Write | Chamada |
|---|---|
| `POST /products` | `cache.invalidateTag('catalog:products')` |
| `PATCH /products/:id` | idem |
| `DELETE /products/:id` (soft-delete) | idem |
| Categorias / marcas | Categorias não têm write endpoints; brands não têm CRUD ainda. Se/quando existirem, chamam `invalidateTag('catalog:categories'|'catalog:brands')`. |

### Efeitos colaterais aceitos

- `PATCH /products/:id` invalida **todo** `catalog:products` (list + details). Alternativa seria invalidar só a chave do produto específico + varrer listas por padrão de query — muito complexo para pouco ganho.
- Cache pode retornar dado "de até 30 s atrás" no storefront entre invalidações. Aceito para catálogo comercial.

### Fallback silencioso

Se Redis cair (erro de conexão, timeout, etc.), a implementação `RedisCache` retorna `null` no `get()` e `no-op` no `set()`. A app **continua funcionando** com hit direto no DB. Métricas de misses sobem — sinal de alerta para observabilidade.

---

## 4. Instrumentação

`Cache.stats(): { hits, misses }` — hits/misses acumulados no processo. Útil para:

- Testes unitários (assert que 2ª chamada foi HIT).
- Health/metrics endpoint futuro poderia expor essa contagem para monitoração.

**Não expomos header `X-Cache: HIT|MISS`** — evita "cache oracle" para atacantes que inferem estado interno. Alternativa se precisar: métrica agregada, não por-request.

---

## 5. PostgreSQL — auditoria

### Índices existentes (schema)

Todos os JOIN e WHERE quentes têm índice:

- `Product`: `categoryId`, `brandId`, `species`, `active`, `slug`, `createdAt`, PK `id`.
- `Order`: `userId`, `status`, `createdAt`, `couponId`, PK `id`.
- `OrderItem`: `orderId`, `productId`.
- `Cart` / `CartItem`: `userId` (unique), `cartId+productId` (unique).
- `Wishlist` / `WishlistItem`: `userId` (unique), `wishlistId+productId` (unique).
- `Review`: `productId+userId` (unique — usada pela regra "uma review por user"), `rating`.
- `Address`: `userId`, `userId+isDefault`, `zip`.
- `Inventory`: `productId` (unique), `quantity`.
- `User`: `email` (unique), `roleId`, `createdAt`.
- `RefreshToken`: `userId`, `tokenHash` (unique), `expiresAt`, `revokedAt`.

**Fonte da verdade**: `apps/api/prisma/schema.prisma`. Todo `@@index` foi escolhido para cobrir a leitura mais quente do módulo dono.

### N+1 audit

Todos os `findMany`/`findFirst` no código usam `include` ou `select` explícitos. Casos revisados:

| Local | Estratégia |
|---|---|
| `ProductRepository.list()` | `include: { category, brand, images, inventory }` — 1 query. |
| `ProductRepository.findByIdOrSlug()` | Mesmo include — 1 query. |
| `CartRepository.findOrCreateByUser()` | `items → product → images (take:1) + inventory` — 1 query. |
| `OrderRepository.listByUser()` | `items → product.slug` + `payment` — 1 query (dois `$transaction` — um para count). |
| `AdminService.listCustomers()` | Uma `findMany` de users + **uma única** `groupBy` agregando `_count._all` e `_sum.total` por `userId` — evita N queries. |
| `MetricsService.build()` | 10 queries em `Promise.all()`, cada uma cobrindo uma métrica (raw SQL para series 30d e low-stock). Sem loops. |

Confirmação de que **não há N+1**: `grep -r "forEach.*await\|for.*await.*prisma\." apps/api/src` retorna vazio.

### Paginação

- Todas as listagens paginam com `skip/take` + `total` via `count`.
- **`skip`-based tem custo em páginas altas** (Postgres varre `OFFSET`). Aceito porque:
  - Storefront público usa `limit=20` — usuário raramente ultrapassa página 5.
  - Admin usa `limit=50-100` — volume ainda tratável.
- Cursor-based paginação (via `createdAt+id`) fica no roadmap de otimização se algum endpoint mostrar cauda de `skip` alta.

### Payloads

- **`GET /products` inclui `description`** — pode custar tráfego em listas grandes. Trade-off aceito: descrição serve preview de card. Se o custo escalar, roadmap: adicionar param `?fields=summary` que retorna versão sem `description`.
- **`ProductImage`**: em list e detalhe, `include: { images: { take: 1 } }` traz só a imagem principal. Detalhe amplia depois (a página de detail no web faz outra fetch).
- **`Inventory`**: nunca vaza `quantity` cru em endpoint público. Só booleano `available`. Detalhe da posição de estoque é admin-only.

---

## 6. Next.js — RSC, streaming, caching, revalidation

### Estado atual (branch `feature/product-catalog-web`, propagado para as outras que dependem)

- **RSC por padrão** — só é `use client` quando há hook do browser, evento, ou estado local. Auditado (grep `use client` retorna arquivos justificados).
- **Data fetching server-side** via `lib/http.ts`:
  - `cache: 'force-cache'` para catálogo.
  - `next.revalidate`: 60 s para `products` / `product`; 300 s para `categories` / `brands`.
  - `next.tags`: `catalog:products`, `catalog:categories`, `catalog:brands` — permitirá invalidação por `revalidateTag()` server-side quando escrever admin no web.
- **Metadata dinâmica** por produto/categoria em `generateMetadata` — mesma requisição server-side é reusada via de-dupe do Next.
- **JSON-LD estruturado** (Product + BreadcrumbList) para SEO — RSC.

### Streaming com Suspense (branch `refactor/web-react-quality`)

A branch de refactor divide `/products` em `<Suspense>` boundaries:
- `<FiltersAsideAsync>` — categorias + marcas (cache 300 s → tipicamente hit rápido).
- `<ProductsSectionAsync>` — produtos (cache 60 s + variação por query).

Cada um streama assim que seu fetch termina — sidebar aparece antes do grid quando o grid demora.

**`<Suspense key={JSON.stringify(query)}>`** força remontagem no boundary do grid quando os filtros mudam → skeleton aparece durante o novo fetch, sem "produtos velhos" na tela.

### O que fica de fora do RSC / caching do Next

- `/carrinho`, `/checkout`, `/conta/*` — per-user, sem cache útil no Next; `loading.tsx` cobre percepção de carga.
- `/admin/*` — igual: dados voláteis, sem cache no Next.

### Alinhamento com o Redis do backend

- Next chama `apps/api` via `fetch`. A **primeira** requisição de RSC bate no Redis (via `readThrough`) — HIT retorna em ~1 ms.
- Segunda requisição na janela de `next.revalidate` (60 s) nem chega ao backend — Next serve do próprio cache.
- Em cascata: `Redis cache: HIT` no backend + `Next fetch cache: HIT` na frente → payload não sai do processo Next em nenhuma direção. Um checkout de STAFF que muda o produto invalida **AMBOS**: `cache.invalidateTag('catalog:products')` no backend + (futuro) `revalidateTag('catalog:products')` no Next.

---

## 7. Testes

- **Unit** (`shared/cache.spec.ts`, 12 tests):
  - `stableKey` idempotente (ordem de chaves), ignora `undefined`.
  - `NullCache` sempre retorna null, contagem de misses.
  - `MemoryCache`: set/get, expiração via fake timers, del, `invalidateTag`.
  - `readThrough`: MISS chama fetch; HIT não; `invalidateTag` rehidrata; exceção não fica cacheada.

- **Integration com Redis real** (`shared/cache.integration.spec.ts`, 6 tests):
  - `RedisCache` direto: set/get, TTL expira, `invalidateTag` limpa todas as chaves da tag.
  - End-to-end no catálogo: 2ª GET `/categories` vem do cache mesmo com dado alterado direto no DB; `POST /products` invalida `catalog:products` e o próximo GET reflete o novo total.

---

## 8. Roadmap (não implementado nesta fase)

- **Rate limiting** com Redis (`@fastify/rate-limit` + Redis store) — proteção contra abuso.
- **Cache warming** de `/products` para queries populares no boot.
- **Cursor pagination** se `skip` grande virar bottleneck em produção.
- **`revalidateTag` no Next.js** disparado do backend via webhook — hoje o Next usa TTL puro.
- **`unaccent` no Postgres** para busca `ILIKE` accent-insensitive (documentado no product catalog spec).
- **CDN + `Cache-Control` s-maxage** nas respostas de catálogo — nesta fase só cache no processo, sem edge.
