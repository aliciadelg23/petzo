# @petzo/mobile

App móvel do Petzo em **React Native + Expo SDK 52 + expo-router + TypeScript**. Consome a mesma API REST (`apps/api`) que o web — **zero backend próprio, zero regra de negócio duplicada**.

## Arquitetura

```text
apps/mobile/
├── app/                       # Rotas expo-router (file-based)
│   ├── _layout.tsx            # Providers globais
│   ├── (auth)/                # Grupo público
│   │   ├── entrar.tsx
│   │   └── cadastrar.tsx
│   ├── (tabs)/                # Grupo autenticado com tab bar
│   │   ├── index.tsx          # Home
│   │   ├── produtos.tsx       # Catálogo
│   │   ├── carrinho.tsx       # Carrinho
│   │   └── perfil.tsx         # Perfil
│   ├── produto/[slug].tsx     # Detalhe de produto
│   ├── categoria/[slug].tsx   # Filtro por categoria
│   ├── busca.tsx              # Search
│   ├── checkout.tsx
│   ├── pedidos/               # Pedidos
│   │   ├── index.tsx
│   │   └── [id].tsx
│   ├── pets/                  # Pets (CRUD)
│   │   ├── index.tsx
│   │   ├── novo.tsx
│   │   └── [id].tsx
│   └── favoritos.tsx          # Wishlist
└── src/
    ├── features/              # Módulos de domínio (mesma divisão do web)
    │   ├── auth/              # store + api + hooks
    │   ├── catalog/           # api + hooks + types
    │   ├── cart/
    │   ├── orders/
    │   ├── pets/
    │   ├── wishlist/
    │   └── checkout/
    ├── components/            # Botão, Input, ScreenContainer, PriceTag
    ├── lib/                   # http, errors, formatters, colors
    ├── providers/             # QueryProvider, AuthHydrator
    ├── config/                # env
    └── hooks/
```

## Autenticação

- **Access token** (JWT, 15 min): em memória (Zustand sem persist).
- **Refresh token**: **Expo SecureStore** (Keychain iOS / Keystore Android). O JS
  nunca vê o token em plain-text após o boot — vem cifrado do OS.
- Boot: `<AuthHydrator/>` lê SecureStore, chama `POST /auth/refresh` com o token
  para revalidar e devolver access; se falha, limpa e redireciona para `(auth)/`.
- Logout: revoga no servidor + limpa store + apaga SecureStore.

**Diferente do web (que usa cookie httpOnly)**: RN não tem cookies nativos.
SecureStore é o equivalente seguro no OS.

## Comunicação com a API

Um único `src/lib/http.ts` — fetch tipado, injeta `Authorization: Bearer` do
store, faz retry-com-refresh no 401. Base URL vem de `app.json` (`expo.extra.apiUrl`)
via `expo-constants`.

## Reuso vs duplicação

- **Nunca duplicado**: preço, desconto, frete, total (backend calcula em `apps/api`).
- **Levemente duplicado** (portfólio-realistic): formatters (formatBRL, buildProductsQueryString)
  e tipos de resposta. Nota: **próximo passo é extrair para `packages/types` + `packages/shared`.**

## Scripts

```bash
pnpm --filter @petzo/mobile lint         # expo lint
pnpm --filter @petzo/mobile typecheck    # tsc --noEmit
pnpm --filter @petzo/mobile test         # jest
pnpm --filter @petzo/mobile start        # expo dev server
pnpm --filter @petzo/mobile ios          # abre em simulador iOS (requer Xcode)
pnpm --filter @petzo/mobile android      # abre em Android (requer emulador)
```

## Como testar em dispositivo real

1. Suba a API: `pnpm --filter @petzo/api start` (porta 3333).
2. Descubra o IP da máquina: `ipconfig getifaddr en0` (macOS) ou `ip addr` (Linux).
3. Ajuste `app.json → expo.extra.apiUrl` para `http://<SEU-IP>:3333`.
4. Rode `pnpm --filter @petzo/mobile start` e escaneie o QR code no Expo Go.
