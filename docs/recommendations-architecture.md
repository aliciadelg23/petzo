# Recommendation Engine — Arquitetura

## Objetivo

Endpoint público:

```text
GET /pets/:petId/recommendations?limit=10
Authorization: Bearer <access>
```

Retorna produtos comerciais relevantes para um pet do usuário autenticado. **Primeira versão (`rules-v1`) é 100% determinística — não usa IA generativa.**

## Princípios

1. **Interface estável.** O consumidor da API não sabe (nem precisa saber) qual algoritmo produziu o resultado. O campo `strategy` na resposta é um rótulo — não faz parte do contrato de comportamento.
2. **Substituível.** Trocar de regras para ML, serviço externo (Amazon Personalize, etc.) ou LLM significa **implementar outra classe** que satisfaz o mesmo contrato + registrar no factory. Nada muda em `apps/web` nem na assinatura HTTP.
3. **Não médico.** Categorias médicas (slug `medicamentos`) e produtos com keywords médicas são **excluídos por filtro**, antes do scorer. O disclaimer no response reforça o escopo comercial.
4. **Testável isoladamente.** A lógica de scoring é uma função pura (`scoreProduct`) sem dependência de banco. A engine faz o "SQL + orquestração", o scorer faz "matemática".

## Diagrama

```text
                    ┌────────────────────────────┐
                    │ GET /pets/:id/recommenda…  │
                    └──────────────┬─────────────┘
                                   │
                    ┌──────────────▼─────────────┐
                    │  RecommendationController   │
                    │  - reqUser (JWT)            │
                    │  - reqParams / query        │
                    └──────────────┬─────────────┘
                                   │
                    ┌──────────────▼─────────────┐
                    │  RecommendationService      │
                    │  - fetch Pet                │
                    │  - ownership check          │
                    │  - wraps engine + disclaimer│
                    └──────────────┬─────────────┘
                                   │
                     ┌─────────────▼──────────────┐
                     │  RecommendationEngine (I)  │  ← contrato
                     └─────────────┬──────────────┘
                                   │
        ┌──────────────────────────┼──────────────────────────┐
        │                          │                          │
┌───────▼──────────┐    ┌──────────▼─────────┐   ┌────────────▼───────────┐
│ RulesBasedEngine │    │ MLEngine (futuro)  │   │ ExternalEngine (futuro)│
│  strategy=       │    │  strategy=ml       │   │  strategy=external     │
│    "rules-v1"    │    │                    │   │                        │
└───────┬──────────┘    └────────────────────┘   └────────────────────────┘
        │
        │  usa:
        │
┌───────▼──────────────────────────┐
│  scoreProduct(candidate, ctx)    │  ← função pura
│  derivePetStage(birth, now)      │
│  diversifyByCategory(items, n)   │
└──────────────────────────────────┘
```

## Contrato do motor

```ts
interface RecommendationEngine {
  readonly strategy: string;
  recommendForPet(input: {
    pet: Pet;
    userId: string;
    limit: number;
  }): Promise<Recommendation[]>;
}
```

Regra: qualquer implementação deve devolver uma lista já ordenada por relevância (do mais relevante para o menos), com `score` monotônico decrescente (ou aproximado). Diversidade é responsabilidade do motor.

## Factory

`src/modules/recommendations/engines/engine-factory.ts`:

```ts
export function makeRecommendationEngine(prisma, strategy) {
  switch (strategy) {
    case 'rules-v1':
    default:
      return new RulesBasedRecommendationEngine(prisma);
    // futuro:
    // case 'ml':       return new MLRecommendationEngine(prisma, env.ML_SERVICE_URL);
    // case 'external': return new ExternalEngine(prisma, env.PERSONALIZE_ARN);
  }
}
```

Registro: `RECOMMENDATION_ENGINE` (env var, default `rules-v1`).

## Regras da estratégia `rules-v1`

### Candidatos elegíveis (filtros hard)

- `active = true`
- `species = pet.species` (exato)
- `inventory.quantity > 0`
- **Não** pertence à categoria `medicamentos` (slug bloqueado)
- **Não** contém keywords médicas no nome ou descrição (regex `vermífug|antiparasit|antibiótic|prescri|vacina|medicament`)

### Sinais de pontuação

| Sinal | Peso | Origem |
|---|---|---|
| Está na wishlist do usuário | **+15** | `WishlistItem` |
| Mesma categoria que compras passadas | **+10** | `OrderItem.product.categoryId` |
| Adequado ao estágio de vida do pet (young/senior + keywords) | **+8** | `birthDate` + regex |
| Popularidade global (cap em 5) | **+1..+5** | `OrderItem.groupBy(productId)` |
| Recompra (produto já foi comprado) | **+3** | `OrderItem.productId` |
| Porte adequado ao peso do pet (< 10 kg + "pequeno" / ≥ 25 kg + "grande") | **+3** | `pet.weight` + regex |
| Novidade (criado há < 30 dias) | **+2** | `createdAt` |

Todos os pesos vivem em constantes no scorer (`WEIGHTS`) — trocar não requer mudança de contrato.

### Pós-processamento

1. **Ordenar** por `score desc`. Tiebreaker: `createdAt desc`.
2. **Diversidade**: cortar em no máximo 3 produtos por categoria (`MAX_PER_CATEGORY`).
3. **Limit**: cortar em `limit` (default 10, max 50).

### Explainability

Cada item retorna `reasons: string[]` — mensagens humano-legíveis de por que ele apareceu. Útil para:
- Debugging do algoritmo em campo.
- UI mostrar "Recomendamos porque…".
- Comparar com futura implementação ML.

## Segurança

- Autenticação obrigatória (`app.authenticate`).
- Owner-only para CUSTOMER. STAFF/ADMIN podem consultar recomendações de qualquer pet (útil para suporte).
- Retorna 404 (não 403) para pet alheio — não vaza existência.
- Zod valida `petId` e `limit` (com `coerce.number()` para query).

## Anti-medical guardrail

Filtros:

```ts
const MEDICAL_CATEGORY_SLUGS = new Set(['medicamentos', 'medicinal', 'prescricao']);
const MEDICAL_KEYWORDS = /(vermífug|antiparasit|antibiótic|prescri|vacina|medicament)/i;
```

Roda no engine, ANTES do scorer. O scorer sequer vê esses candidatos — não há como um bug de pontuação promover um produto médico.

Disclaimer no response:

```json
{
  "disclaimer": "Recomendações comerciais baseadas em regras determinísticas. NÃO substituem aconselhamento veterinário. Consulte um profissional antes de decisões de saúde."
}
```

Alterações nas listas de exclusão são **decisões de segurança** — devem passar por revisão.

## Testes

**Unit** (`scorer.spec.ts`, 18 tests):
- Cada peso individual e combinações.
- `derivePetStage` (4 cenários: null / young / adult / senior).
- `diversifyByCategory` (3 cenários).

**Integration** (`recommendation.integration.spec.ts`, 9 tests):
- Auth (401), ownership (404 para alheio; 404 para inexistente; STAFF vê qualquer).
- Espécie: CAT só recebe produtos de gatos.
- Categoria médica **nunca** aparece.
- Reasons humanas, score ≥ 0.
- `limit` respeitado; inválido → 400.

## Migração futura para ML/IA — checklist

Para trocar de `rules-v1` para outra estratégia:

1. Implementar nova classe (ex.: `MLRecommendationEngine`) que satisfaça `RecommendationEngine`.
2. Adicionar `case 'ml'` no `engine-factory.ts`.
3. Setar `RECOMMENDATION_ENGINE=ml` no ambiente-alvo.
4. **Manter os filtros de segurança médica** — copiar/importar de `rules-based`.
5. Manter o `strategy` no response para permitir A/B testing.
6. Rodar `pnpm --filter @petzo/api test:integration` — o contrato do endpoint permanece.

Se o novo motor precisa de features do pet que hoje não expomos (ex.: histórico agregado), estender o `input` da interface é aceitável — desde que retrocompatível para implementações antigas.
