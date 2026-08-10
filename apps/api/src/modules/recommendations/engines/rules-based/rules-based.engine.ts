/**
 * Motor de recomendação baseado em regras. Estratégia atual: `rules-v1`.
 *
 * Responsabilidades:
 *  1. Carrega candidatos (produtos ativos, com estoque, da espécie do pet)
 *  2. Filtra categorias médicas (nunca recomendar remédios)
 *  3. Carrega contexto do usuário (histórico + wishlist + popularidade)
 *  4. Chama o scorer puro por candidato
 *  5. Ordena por score, aplica diversidade, corta em `limit`
 */
import type { PrismaClient, Pet } from '@prisma/client';
import type {
  Recommendation,
  RecommendationCandidate,
  RecommendationEngine,
} from '../../recommendation.types';
import {
  derivePetStage,
  diversifyByCategory,
  scoreProduct,
  type ScoringContext,
} from './scorer';

/**
 * Slugs e keywords que NUNCA entram em recomendações comerciais.
 * Alteração aqui é decisão de segurança — deve passar por revisão.
 */
const MEDICAL_CATEGORY_SLUGS = new Set(['medicamentos', 'medicinal', 'prescricao']);
const MEDICAL_KEYWORDS = /(vermífug|antiparasit|antibiótic|prescri|vacina|medicament)/i;

const MAX_PER_CATEGORY = 3;
const DEFAULT_NOW = () => new Date();

export class RulesBasedRecommendationEngine implements RecommendationEngine {
  readonly strategy = 'rules-v1';

  constructor(
    private readonly prisma: PrismaClient,
    /** Injeção de "agora" para testes determinísticos. */
    private readonly nowFactory: () => Date = DEFAULT_NOW,
  ) {}

  async recommendForPet(input: {
    pet: Pet;
    userId: string;
    limit: number;
  }): Promise<Recommendation[]> {
    const now = this.nowFactory();

    // 1. Candidatos
    const rawCandidates = await this.prisma.product.findMany({
      where: {
        active: true,
        species: input.pet.species,
        inventory: { quantity: { gt: 0 } },
      },
      include: {
        category: true,
        brand: true,
        images: { orderBy: { position: 'asc' }, take: 1 },
      },
    });

    // 2. Filtro médico (categoria + keywords no nome/description)
    const candidates: RecommendationCandidate[] = rawCandidates
      .filter((p) => !MEDICAL_CATEGORY_SLUGS.has(p.category.slug))
      .filter((p) => !MEDICAL_KEYWORDS.test(`${p.name} ${p.description}`))
      .map((product) => ({ product }));

    if (candidates.length === 0) return [];

    // 3. Contexto do usuário
    const [orderItems, wishlistItems, popularityRows] = await Promise.all([
      this.prisma.orderItem.findMany({
        where: {
          order: {
            userId: input.userId,
            status: { in: ['PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED'] },
          },
        },
        select: { productId: true, product: { select: { categoryId: true } } },
      }),
      this.prisma.wishlistItem.findMany({
        where: { wishlist: { userId: input.userId } },
        select: { productId: true },
      }),
      this.prisma.orderItem.groupBy({
        by: ['productId'],
        _count: { _all: true },
      }),
    ]);

    const boughtProductIds = new Set(orderItems.map((oi) => oi.productId));
    const boughtCategoryIds = new Set(orderItems.map((oi) => oi.product.categoryId));
    const wishlistProductIds = new Set(wishlistItems.map((w) => w.productId));
    const popularity = new Map(popularityRows.map((r) => [r.productId, r._count._all]));

    const { stage: petStage, ageMonths: petAgeMonths } = derivePetStage(
      input.pet.birthDate,
      now,
    );

    const ctx: ScoringContext = {
      boughtCategoryIds,
      boughtProductIds,
      wishlistProductIds,
      popularity,
      petStage,
      petWeightKg: input.pet.weight,
      petName: input.pet.name,
      petAgeMonths,
      now,
    };

    // 4. Score
    const scored = candidates.map((c) => {
      const { score, reasons } = scoreProduct(c, ctx);
      return { ...c, score, reasons };
    });

    // 5. Ordenar por score desc; tiebreaker = createdAt desc (produto mais novo)
    scored.sort(
      (a, b) =>
        b.score - a.score || b.product.createdAt.getTime() - a.product.createdAt.getTime(),
    );

    // 6. Diversidade (no máx N por categoria) + corte no limit
    const diversified = diversifyByCategory(scored, MAX_PER_CATEGORY).slice(0, input.limit);

    // 7. Mapeia para o shape público
    return diversified.map((it) => ({
      productId: it.product.id,
      slug: it.product.slug,
      name: it.product.name,
      price: it.product.price,
      imageUrl: it.product.images[0]?.url ?? null,
      category: {
        id: it.product.category.id,
        name: it.product.category.name,
        slug: it.product.category.slug,
      },
      brand: {
        id: it.product.brand.id,
        name: it.product.brand.name,
        slug: it.product.brand.slug,
      },
      score: it.score,
      reasons: it.reasons,
    }));
  }
}
