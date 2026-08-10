# CLAUDE.md — Petzo

Instruções específicas para Claude Code neste repositório. Complementam as regras globais em `~/.claude/`.

## Contexto do projeto

Petzo é um **monorepo** pnpm + Turborepo com três apps (API, Web, Mobile) e três packages compartilhados (types, shared, config). Objetivo: portfólio full-stack demonstrando React + React Native + Node.js + TypeScript + PostgreSQL.

Arquitetura da API: **Modular Monolith** (não microservices). Cada domínio é um módulo isolado em `apps/api/src/modules/*`.

## Regras específicas

### Package manager

- **pnpm exclusivamente.** Nunca `npm install` ou `yarn`. Se encontrar `package-lock.json` ou `yarn.lock`, remova antes de qualquer operação.
- Sempre rodar comandos a partir da raiz do repo, ou usar `pnpm --filter <workspace>` para escopo.

### Idioma

- Prosa em arquivos (README, docs, ADRs, PRDs, planos, commits em prosa): **português (PT-BR)**.
- Código, identificadores, tipos, nomes de funções: **inglês**.
- Mensagens de commit seguindo Conventional Commits: descrição em inglês curto (padrão de mercado).

### Git Flow

- Nunca commitar direto em `main` ou `develop`.
- Toda funcionalidade nasce em `feature/<slug>` a partir de `develop`.
- Releases em `release/<versão>` a partir de `develop`, merge em `main` + back-merge em `develop`.
- Hotfixes em `hotfix/<slug>` a partir de `main`, merge em `main` + `develop`.

### Conventional Commits

Tipos permitidos (enforçados por commitlint):

```text
feat, fix, docs, refactor, test, chore, build, ci, perf
```

Escopos sugeridos: `api`, `web`, `mobile`, `shared`, `types`, `config`, `docker`, `ci`, `repo`.

### Sem menção a IA em artefatos

Commits, PRs, issues, code reviews: **zero menção** a IA, assistente, Claude, LLM ou geradores. Regra do CLAUDE.md global — reforçada aqui.

### Arquitetura por camadas (API)

Cada módulo em `apps/api/src/modules/<nome>/` segue:

```text
<módulo>/
├── <módulo>.routes.ts         # binding HTTP (Fastify)
├── <módulo>.controller.ts     # orquestração de request/response
├── <módulo>.service.ts        # regras de negócio
├── <módulo>.repository.ts     # acesso a dados (Prisma)
├── <módulo>.schemas.ts        # Zod schemas (importa de packages/types quando compartilhado)
└── <módulo>.spec.ts           # testes (Vitest)
```

Comunicação entre módulos: via chamadas diretas de service (nunca via HTTP interno).

### Validação

Toda entrada é validada com Zod. Schemas ficam em `packages/types` quando compartilhados entre web/mobile/api.

### Testes

- Rodar `pnpm test` antes de reportar tarefa concluída.
- Cobertura alvo: 70% na API, 50% em web/mobile.

### Referências

- Roadmap completo: `docs/roadmap.md`
- Decisões arquiteturais: `docs/adr/`
- OpenAPI da API: `apps/api` em runtime, exposta em `/docs`.
