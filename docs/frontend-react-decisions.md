# Decisões de React no Petzo Web

Este documento explica **por que** cada primitivo de React aparece (ou NÃO aparece) onde aparece no `apps/web`. Cada entrada deve poder ser defendida numa entrevista técnica sem cair em "teatro de tecnologia".

## Regra de ouro

> Só é usado se elimina duplicação real, corrige um bug de correção OU produz ganho de performance mensurável. Nada aqui existe "para demonstrar conhecimento".

---

## 1. Server Components vs Client Components

**Default: RSC.** Client Components só aparecem quando há interação, hooks, eventos do browser ou estado local.

Auditáveis via `grep -r "'use client'" apps/web/src` — 15 arquivos. Todos justificados:

| Arquivo | Motivo |
|---|---|
| `providers/index.tsx` | Barrel dos providers de client |
| `providers/query-provider.tsx` | `QueryClient` só existe no browser |
| `providers/toast-provider.tsx` | `useState` de toasts + Context |
| `components/ui/toast-container.tsx` | Consome ToastContext |
| `components/layout/site-header.tsx` | (RSC — não é client) |
| `features/auth/store.ts` | Zustand hook |
| `features/auth/hooks.ts` | React Query |
| `features/auth/components/auth-hydrator.tsx` | `useEffect` no boot |
| `features/auth/components/auth-guard.tsx` | Consome store + `useRouter` |
| `features/auth/components/user-menu.tsx` | Consome store |
| `features/auth/components/login-form.tsx` | RHF + `useRef` autofocus |
| `features/auth/components/register-form.tsx` | RHF |
| `features/cart/hooks.ts` | React Query |
| `features/cart/components/cart-badge.tsx` | Consome query |
| `features/cart/components/add-to-cart-button.tsx` | Mutation + toast |
| `features/orders/hooks.ts` | React Query |
| `features/catalog/use-catalog-url-state.ts` | Hooks do Next |
| `features/catalog/components/search-bar.tsx` | `useState` + debounce |
| `features/catalog/components/sort-select.tsx` | `onChange` |
| `features/catalog/components/filter-panel.tsx` | `useState` + `onClick` |
| `features/catalog/components/pagination.tsx` | `useRouter` |
| `hooks/use-debounced-value.ts` | Hook client-only |
| `hooks/use-toast.ts` | Consumidor de Context |
| `app/**/error.tsx` | Requisito do Next para error boundaries |
| `app/**/page.tsx` (client) | Usa hooks de auth/query — `/carrinho`, `/checkout/*`, `/conta/*` |

**Tudo o mais é RSC**, incluindo pages, product-card, product-grid, product-json-ld, api.ts, lib.ts, form-field.tsx, filters-aside-async.tsx, products-section-async.tsx.

---

## 2. Streaming com Suspense

**Onde aparece**: `app/products/page.tsx`.

**Por quê**: A página tem 2 pontos de fetch com características diferentes:
- **Sidebar**: precisa de `categories` + `brands` (cache 300s, quase sempre hit).
- **Grid**: precisa de `products` filtrado pela query (cache 60s + variação por parâmetros).

Antes: `Promise.all([produtos, categorias, marcas])` bloqueava a página até tudo chegar. A parte mais lenta ditava o tempo total.

Agora: cada seção é um RSC async isolado (`<FiltersAsideAsync>`, `<ProductsSectionAsync>`) envolvido em `<Suspense>` com seu skeleton próprio. Cada seção streama assim que seu fetch termina, independente da outra.

**Detalhe técnico defensável**: `<Suspense key={JSON.stringify(query)}>` no grid — força remontagem do boundary quando os filtros mudam, ativando o fallback. Sem `key`, o Next re-renderizaria sem novo boundary e o usuário veria produtos "velhos" enquanto o novo fetch estava em andamento.

**Onde NÃO aparece**: `/carrinho`, `/checkout`, `/conta` — tudo per-user, não streamável (não tem cache útil), requer `use client`. O `loading.tsx` de cada rota já resolve o "tempo de carregar" percebido; envolver em `<Suspense>` seria complexidade sem benefício.

---

## 3. Custom hooks

### `useDebouncedValue<T>(value, delay)`

**Onde**: `hooks/use-debounced-value.ts`. Usado por `SearchBar`.

**Por quê**: Extrai o `useEffect + setTimeout + clearTimeout` que estava dentro do componente. Ganho: (a) reusável se aparecerem outros inputs com debounce; (b) testável isoladamente (3 unit tests com fake timers).

### `useCatalogUrlState(options?)`

**Onde**: `features/catalog/use-catalog-url-state.ts`. Usado por `SearchBar`, `SortSelect`, `FilterPanel`, `Pagination`.

**Por quê**: Antes, 4 componentes duplicavam:
```tsx
const router = useRouter();
const pathname = usePathname();
const sp = useSearchParams();
const current = parseProductsQuery(new URLSearchParams(sp.toString()));
// ... router.replace(`${pathname}${buildProductsQueryString(mergeQuery(current, patch))}`)
```

Agora, cada consumidor faz `const { query, patch } = useCatalogUrlState()`. Contrato explícito: URL é a fonte da verdade dos filtros.

**Uso defensável de `useMemo`/`useCallback`**:
- `query` é derivado de `sp` — memoizar evita novo objeto a cada render. Consumidores (`SearchBar`) usam `urlSearch = query.search ?? ''` como dependência de `useEffect`; sem `useMemo`, o efeito rodaria em todo render.
- `patch` é retornado como parte do contrato público. Consumidores podem passar para filhos memoizados ou usar em `useEffect` deps. `useCallback` mantém identidade estável (mesmo padrão do `dispatch` do `useReducer`).

**Onde NÃO usei `useMemo`/`useCallback`**: em nenhum componente concreto. Só dentro dos hooks reutilizáveis, onde a identidade estável faz parte do contrato.

---

## 4. useState

Casos legítimos:
- `SearchBar.value` — input controlado local separado do valor debounced (padrão clássico).
- `FilterPanel.minPrice/maxPrice` — commit explícito por botão "Aplicar" (evita URL push a cada keystroke em input numérico).
- `ToastProvider.toasts` — estado dos toasts empilhados.

Formulários (`LoginForm`, `RegisterForm`, `CheckoutPage`) NÃO usam `useState` para o estado dos campos — RHF cuida disso (é o que RHF faz de melhor). Isso é um "não usar" defensável: forma se controla via `register()`.

---

## 5. useEffect

Casos legítimos:
- `AuthHydrator` — dispara `/auth/refresh` no boot (side-effect de mount).
- `AuthGuard` — redireciona quando `hydrated=true && !user` (reação a mudanças de estado).
- `SearchBar` — sincroniza `value` local ↔ URL debounced (2 efeitos separados, cada um com escopo claro).
- `FilterPanel` — sincroniza input de preço com URL quando volta externamente.
- `LoginForm` — autofocus no boot via ref.
- `error.tsx` (todos) — loga o erro capturado.
- `useDebouncedValue` — o efeito de debounce.

**Regra**: cada `useEffect` tem UM propósito claro. Não há efeitos genéricos que fazem várias coisas.

---

## 6. useMemo

**Só um lugar de uso concreto**: dentro de `useCatalogUrlState` (`query`). Motivo defensável explicado acima (evita re-runs de effects downstream).

Também em `ToastProvider.value` (o objeto do Context) — sem isso, todo re-render do provider invalidaria o context para *todos* os consumers. Isso é o padrão obrigatório de Context — não é teatro.

**Onde NÃO uso**: nada em ProductCard, ProductGrid, listas de items do cart/orders, forms. Cálculos ali são triviais e a árvore não é grande o suficiente para justificar.

---

## 7. useCallback

**Só dentro dos hooks de biblioteca** (`useCatalogUrlState.patch`, `ToastProvider.toast/dismiss`). Motivo em ambos: são funções expostas como parte do contrato do hook/provider. Estabilidade de identidade evita cascatas.

**Onde NÃO uso**: handlers inline em componentes (`onClick={() => ...}`). Componentes filhos não são memoizados, então `useCallback` seria custo sem ganho.

---

## 8. useRef

Usado em:
- `LoginForm.emailRef` — autofocus após hidratação (`autoFocus` do JSX seria antes do JS carregar em Next).
- `ToastProvider.counter` — contador incremental que **não deve** causar re-render.

**Regra**: `useRef` para valores mutáveis que NÃO fazem parte da UI, ou para acesso ao DOM.

---

## 9. useContext

**Um consumidor**: `useToast()` lê `ToastContext` (via `useContext`) e retorna a API.

**Por que Context aqui e Zustand para auth?**

- **Toast (Context)**: estado global simples, poucos consumers, poucas mudanças por sessão. Context é o casamento perfeito: 1 provider + 1 hook consumidor. Alternativa Zustand seria overkill (nova lib para 1 store).
- **Auth (Zustand)**: acessado por MUITOS componentes (guard, header, cart badge, add-to-cart, etc.). Context em auth teria dois problemas:
  1. Re-render de TODOS os consumers em qualquer mudança do usuário (mesmo que só o token mude e o consumer só use o nome).
  2. Zustand permite selectors granulares (`useAuthStore(s => s.user)`) — só re-renderiza consumers que dependem daquele slice.

**Onde EXPLICITAMENTE NÃO uso Context**:
- Server state (produtos, cart, orders) → TanStack Query (é para isso que ele existe).
- Estado de forma → RHF.
- Filtros do catálogo → URL (fonte da verdade externa, funciona com back/forward, deep link).

---

## 10. React.memo

**Não é usado em lugar nenhum.**

Justificativa: nenhum componente tem hot path de re-render com props estáveis. Concretamente:
- `ProductCard` recebe `product` prop que é sempre um novo objeto vindo do fetch → memo não pega.
- `SortSelect`, `Pagination`, `FilterPanel` são renderizados 1x por navegação → memo pointless.
- Formulários usam RHF, cujo componente-raiz não re-renderiza campos.

Adicionar `React.memo` sem uma métrica que justifique seria adicionar complexidade sem ganho — é o exemplo típico de "teatro de tecnologia" que o usuário pediu para evitar.

---

## 11. Composição de componentes

**FormField** (`components/ui/form-field.tsx`): extrai o triplet `<label>` + input (children) + mensagem de erro. Substitui a duplicação em 3 forms (login, register, checkout).

Padrão de composição via `children` — sem controlar o input, quem chama passa `<Input {...register('name')} />` como filho. FormField só é responsável pela decoração ao redor.

**Container**, **Button**, **Input** — primitives simples do design system, cada um com uma responsabilidade.

**AuthGuard** — HOC-like via children: envolve o layout com o gate. Composição sobre herança.

---

## 12. Controlled Components

Todos os inputs são controlados:
- Forms via RHF (`register(...)` conecta `onChange`/`onBlur`/`ref`).
- `SearchBar` via `useState`.
- `FilterPanel` preço via `useState`.
- `SortSelect` via `value={currentSort}` + `onChange`.

Nenhum input não-controlado. Nenhum `defaultValue` sem `onChange`.

---

## 13. Error boundaries

App Router: cada rota pode ter `error.tsx` (client, requisito do Next).

Onde adicionamos:
- `app/error.tsx` — boundary global (fallback do fallback).
- `app/products/error.tsx` — recovery contextual do catálogo.
- `app/carrinho/error.tsx` — recovery com CTA para tentar novamente.
- `app/checkout/error.tsx` — recovery com CTA "voltar para carrinho" (não perder o contexto do usuário).
- `app/conta/error.tsx` — recovery da área do cliente.

**Regra**: cada boundary tem UM propósito claro e um botão `reset()` funcional. Sem "boundary genérica que só mostra um sad face".

---

## 14. Escolhas negativas (o que NÃO fiz e por quê)

- **Suspense em /carrinho, /checkout, /conta**: são per-user, sem cache de RSC. `loading.tsx` já resolve.
- **React.memo em ProductCard**: props sempre novas do fetch — memo não pega.
- **useContext para cart/orders**: TanStack Query já cobre. Duplicar quebra sync.
- **useContext para auth**: Zustand + selectors evita re-render em cascata.
- **useCallback em handlers inline**: filhos não são memoizados → custo sem ganho.
- **useMemo em derivações triviais**: recomputar `x + y` é mais barato que memoizar.
- **useState global para toast**: `useState` só serve LOCAL. Toasts precisam Context.
- **Substituir Zustand por Context em auth**: seria regressão em performance.

---

## 15. Testes

`useDebouncedValue.spec.ts` — 3 tests com jsdom + fake timers cobrindo:
1. Valor inicial imediato.
2. Debounce estabiliza em `delay` ms.
3. Timers em cascata cancelam anteriores (só o último valor "vence").

Justifica ter `@testing-library/react` como devDep — hoje é 1 hook, amanhã são componentes.

`features/catalog/lib.spec.ts` — 13 tests puros (formatBRL, buildProductsQueryString, parseProductsQuery, mergeQuery). Sem DOM. Rápidos.
