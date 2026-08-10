/**
 * Scorer PURO — nenhuma dependência de banco. Testável isoladamente.
 *
 * Recebe um candidato + o contexto do usuário/pet já materializado; devolve
 * `{ score, reasons }`. Zero I/O aqui.
 *
 * A responsabilidade de "excluir produtos médicos" vive no engine (é filtro,
 * não score — score negativo poderia ainda entrar em edge cases). Aqui só
 * assumimos que o candidato já passou pelos filtros de segurança.
 */
import type { Recommendation, RecommendationCandidate } from '../../recommendation.types';

export interface ScoringContext {
  /** ID das categorias em que o usuário já comprou (any status ≥ PAID). */
  boughtCategoryIds: Set<string>;
  /** ID dos produtos já comprados (para boost de recompra). */
  boughtProductIds: Set<string>;
  /** ID dos produtos na wishlist do usuário. */
  wishlistProductIds: Set<string>;
  /** productId → contagem de vezes que aparece em OrderItem (popularidade). */
  popularity: Map<string, number>;
  /** Estágio de vida derivado da idade do pet. */
  petStage: 'young' | 'adult' | 'senior' | 'unknown';
  /** Peso do pet em kg (opcional). */
  petWeightKg: number | null;
  /** Nome do pet — só cosmético nas reasons. */
  petName: string;
  /** Idade do pet em meses (para reasons humanas). */
  petAgeMonths: number | null;
  /** Timestamp de referência (para novidade). Facilita testes determinísticos. */
  now: Date;
}

// Pesos calibrados por bom-senso (não são hyperparams treinados).
const WEIGHTS = {
  wishlist: 15,
  sameCategoryBought: 10,
  lifeStageMatch: 8,
  weightMatch: 3,
  popularityCap: 5,
  repurchase: 3,
  novelty: 2,
} as const;

/** Pontua um candidato dado o contexto. Nunca retorna score negativo. */
export function scoreProduct(
  candidate: RecommendationCandidate,
  ctx: ScoringContext,
): Pick<Recommendation, 'score' | 'reasons'> {
  const { product } = candidate;
  const reasons: string[] = [];
  let score = 0;

  // Wishlist — sinal explícito de interesse
  if (ctx.wishlistProductIds.has(product.id)) {
    score += WEIGHTS.wishlist;
    reasons.push('Está na sua wishlist.');
  }

  // Mesma categoria de compras passadas
  if (ctx.boughtCategoryIds.has(product.categoryId)) {
    score += WEIGHTS.sameCategoryBought;
    reasons.push(`Combina com o que você compra em "${product.category.name}".`);
  }

  // Recompra — sinal moderado (usuário já demonstrou vontade uma vez)
  if (ctx.boughtProductIds.has(product.id)) {
    score += WEIGHTS.repurchase;
    reasons.push('Você já comprou este produto.');
  }

  // Popularidade — evita depender só de sinais do próprio usuário
  const pop = ctx.popularity.get(product.id) ?? 0;
  if (pop > 0) {
    const cap = Math.min(pop, WEIGHTS.popularityCap);
    score += cap;
    if (pop >= 3) reasons.push('Popular na loja.');
  }

  // Estágio de vida — via KEYWORDS de marketing (não é conselho veterinário).
  //   young: filhote, puppy, junior
  //   senior: senior, idoso
  // Ignoramos "adult" — a maioria dos produtos serve.
  const hay = `${product.name} ${product.description}`.toLowerCase();
  if (ctx.petStage === 'young' && /(filhote|puppy|junior)/i.test(hay)) {
    score += WEIGHTS.lifeStageMatch;
    reasons.push(
      ctx.petAgeMonths !== null
        ? `Adequado para pet jovem (${ctx.petName} tem ${ctx.petAgeMonths} meses).`
        : `Adequado para pet jovem.`,
    );
  } else if (ctx.petStage === 'senior' && /(senior|idoso)/i.test(hay)) {
    score += WEIGHTS.lifeStageMatch;
    reasons.push('Adequado para pet sênior.');
  }

  // Porte por peso — heurística grosseira usando palavras-chave de embalagem
  if (ctx.petWeightKg !== null) {
    if (ctx.petWeightKg < 10 && /(pequen[oa]|mini|small|1kg|3kg)/i.test(hay)) {
      score += WEIGHTS.weightMatch;
      reasons.push(`Porte adequado ao peso do pet (${ctx.petWeightKg} kg).`);
    } else if (ctx.petWeightKg >= 25 && /(grande|large|15kg|20kg|10kg)/i.test(hay)) {
      score += WEIGHTS.weightMatch;
      reasons.push(`Porte adequado ao peso do pet (${ctx.petWeightKg} kg).`);
    }
  }

  // Novidade — 30 dias
  const daysSinceCreation = Math.floor(
    (ctx.now.getTime() - product.createdAt.getTime()) / (1000 * 60 * 60 * 24),
  );
  if (daysSinceCreation < 30) {
    score += WEIGHTS.novelty;
    reasons.push('Novo no catálogo.');
  }

  return { score, reasons };
}

/**
 * Filtro de diversidade: no máximo `maxPerCategory` produtos da mesma categoria.
 * Roda DEPOIS de ordenar por score desc (mantém os melhores de cada categoria).
 */
export function diversifyByCategory<T extends { product: { categoryId: string } }>(
  ranked: T[],
  maxPerCategory: number,
): T[] {
  const perCat = new Map<string, number>();
  const out: T[] = [];
  for (const item of ranked) {
    const c = perCat.get(item.product.categoryId) ?? 0;
    if (c >= maxPerCategory) continue;
    perCat.set(item.product.categoryId, c + 1);
    out.push(item);
  }
  return out;
}

/**
 * Deriva estágio de vida a partir de birthDate.
 * < 12 meses → young
 * ≥ 96 meses (8 anos) → senior
 * caso contrário → adult
 * null → unknown
 */
export function derivePetStage(
  birthDate: Date | null,
  now: Date,
): { stage: ScoringContext['petStage']; ageMonths: number | null } {
  if (!birthDate) return { stage: 'unknown', ageMonths: null };
  const ageMonths = Math.floor(
    (now.getTime() - birthDate.getTime()) / (1000 * 60 * 60 * 24 * 30),
  );
  const stage: ScoringContext['petStage'] =
    ageMonths < 12 ? 'young' : ageMonths >= 96 ? 'senior' : 'adult';
  return { stage, ageMonths };
}
