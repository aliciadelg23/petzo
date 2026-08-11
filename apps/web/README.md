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

## Autenticação — estratégia de tokens

Toda autenticação passa pela **API REST** (`apps/api`). O web **não** duplica a
lógica de auth. Estratégia híbrida por par de tokens:

| Token | O que é | Onde vive no browser | TTL | Trocado por |
|---|---|---|---|---|
| **Access token** | JWT HS256 assinado pela API. Payload: `{sub, role, email}`. | **Memória** (Zustand, sem persist). Nunca em localStorage/sessionStorage. | 15 min | `Authorization: Bearer <t>` a cada request |
| **Refresh token** | 32 bytes aleatórios em base64url. A API guarda apenas o hash SHA-256. | **Cookie httpOnly** + `SameSite=Lax` + `Path=/auth` (+ `Secure` em prod). | 7 dias | Cookie enviado automaticamente pelo browser |

### Fluxo

1. `POST /auth/login` (ou `/register`): API responde com `accessToken` no body e
   `Set-Cookie: petzo_refresh=…; HttpOnly; SameSite=Lax; Path=/auth`.
2. `lib/http.ts` lê o `accessToken` do store e injeta em todos os requests.
3. Quando o access expira, a API responde `401`. `lib/http.ts` faz **um único**
   `POST /auth/refresh` (browser envia o cookie automaticamente) e refaz o request original.
4. A cada `/auth/refresh`, o servidor **rotaciona** o refresh token (o antigo é marcado
   como `revokedAt` + `replacedById`, e um novo cookie substitui o anterior). Um
   replay do antigo cai em `401`.
5. `POST /auth/logout` revoga o cookie no servidor e limpa localmente.

### Riscos e mitigações

| Ameaça | Como fica mitigada |
|---|---|
| **XSS** rouba token de localStorage | Access token nunca sai da memória; F5 zera. Refresh está em cookie `httpOnly` (JS não lê). |
| **CSRF** contra `/auth/refresh` (só cookie) | `SameSite=Lax` bloqueia POSTs cross-site iniciados por outros domínios (padrão de browser). O cookie tem `Path=/auth`, então nem viaja para outras rotas. Endpoints mutativos com efeito de negócio (`/orders`, etc.) exigem `Bearer` (não só cookie), então CSRF não altera dados sozinho. |
| **Roubo de refresh + replay** | Rotação em cada uso + campo `replacedById` permite detectar tentativa de replay (extensível para "revogar toda a família" na Fase de segurança). |
| **Enumeração de usuários** no login | Mensagem `Credenciais inválidas` genérica para email inexistente e senha errada. |
| **Cookie roubado por MITM** | `Secure` em produção obriga HTTPS. |
| **Vazamento em log** | Access token não é logado; refresh nem sai do processo do servidor a menos que o browser reenvie o cookie. |

### Riscos assumidos (aceitos para escopo de portfólio)

- Sem **CSRF token duplo** — considerado desnecessário porque endpoints
  mutativos exigem `Bearer` (não só cookie); o cookie sozinho só serve
  `/auth/refresh` e `/auth/logout`, cujo impacto é mínimo.
- Sem **fingerprint do device** — refresh cookie é aceito de qualquer origem
  autorizada pelo CORS. Melhoria futura: binding a IP/UA + revogação em anomalia.
- Sem **rate limiting**: virá no plugin de segurança na próxima fase.

## Rotas protegidas

`/conta` (e sub-rotas) usam `<AuthGuard>` no layout (`src/app/conta/layout.tsx`).
Guard:

1. Bloqueia render até `hydrated=true` (o `<AuthHydrator/>` já rodou `/auth/refresh`)
2. Se não há user, redireciona para `/entrar?redirect=<pathname>`
3. Aceita opcional `allowRoles={[…]}` para gates STAFF/ADMIN

Não usamos `middleware.ts` do Next para guardar rotas de UI porque o middleware
roda no servidor e só enxerga cookies — sem o access token, ele não consegue
distinguir usuário válido de sessão expirada. O guard client faz o trabalho
com informação atualizada.
