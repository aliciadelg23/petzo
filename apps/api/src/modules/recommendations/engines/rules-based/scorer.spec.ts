import { describe, it, expect } from 'vitest';
import {
  derivePetStage,
  diversifyByCategory,
  scoreProduct,
  type ScoringContext,
} from './scorer';
import type { RecommendationCandidate } from '../../recommendation.types';

const NOW = new Date('2026-01-01T00:00:00Z');

function makeCtx(overrides: Partial<ScoringContext> = {}): ScoringContext {
  return {
    boughtCategoryIds: new Set(),
    boughtProductIds: new Set(),
    wishlistProductIds: new Set(),
    popularity: new Map(),
    petStage: 'adult',
    petWeightKg: null,
    petName: 'Rex',
    petAgeMonths: 36,
    now: NOW,
    ...overrides,
  };
}

function makeCandidate(
  overrides: Partial<RecommendationCandidate['product']> = {},
): RecommendationCandidate {
  return {
    product: {
      id: overrides.id ?? 'p1',
      slug: overrides.slug ?? 'p1',
      name: overrides.name ?? 'Ração para Adulto 10kg',
      description: overrides.description ?? 'Alimento seco.',
      categoryId: overrides.categoryId ?? 'catA',
      brandId: overrides.brandId ?? 'brandA',
      species: 'DOG',
      price: overrides.price ?? 1000,
      active: true,
      createdAt: overrides.createdAt ?? new Date('2024-01-01T00:00:00Z'),
      updatedAt: overrides.createdAt ?? new Date('2024-01-01T00:00:00Z'),
      category: {
        id: overrides.categoryId ?? 'catA',
        name: 'Ração para Cães',
        slug: 'racao-caes',
        parentId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      brand: {
        id: overrides.brandId ?? 'brandA',
        name: 'GoldenBite',
        slug: 'golden-bite',
        logoUrl: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      images: [],
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any,
  };
}

describe('scoreProduct', () => {
  it('score base 0 para candidato sem sinais', () => {
    const { score, reasons } = scoreProduct(makeCandidate(), makeCtx());
    expect(score).toBe(0);
    expect(reasons).toEqual([]);
  });

  it('wishlist é o maior boost individual (+15)', () => {
    const c = makeCandidate({ id: 'wp' });
    const { score, reasons } = scoreProduct(
      c,
      makeCtx({ wishlistProductIds: new Set(['wp']) }),
    );
    expect(score).toBe(15);
    expect(reasons).toContain('Está na sua wishlist.');
  });

  it('mesma categoria de compra passada (+10)', () => {
    const c = makeCandidate({ categoryId: 'catX' });
    const { score } = scoreProduct(
      c,
      makeCtx({ boughtCategoryIds: new Set(['catX']) }),
    );
    expect(score).toBe(10);
  });

  it('recompra (+3) combina com mesma categoria (+10) = 13', () => {
    const c = makeCandidate({ id: 'p', categoryId: 'c' });
    const { score } = scoreProduct(
      c,
      makeCtx({
        boughtProductIds: new Set(['p']),
        boughtCategoryIds: new Set(['c']),
      }),
    );
    expect(score).toBe(13);
  });

  it('popularidade cap em 5 mesmo com muitos pedidos', () => {
    const c = makeCandidate({ id: 'pop' });
    const { score } = scoreProduct(
      c,
      makeCtx({ popularity: new Map([["pop", 100]]) }),
    );
    expect(score).toBe(5);
  });

  it('life stage young + nome "filhote" → +8', () => {
    const c = makeCandidate({ name: 'Ração para Filhotes 3kg' });
    const { score, reasons } = scoreProduct(c, makeCtx({ petStage: 'young', petAgeMonths: 4 }));
    expect(score).toBe(8);
    expect(reasons[0]).toMatch(/Adequado para pet jovem/);
  });

  it('life stage senior + palavra "senior" → +8', () => {
    const c = makeCandidate({ name: 'Ração Senior 3kg' });
    const { score } = scoreProduct(c, makeCtx({ petStage: 'senior', petAgeMonths: 120 }));
    expect(score).toBe(8);
  });

  it('adult NÃO recebe boost de life stage mesmo com keywords', () => {
    const c = makeCandidate({ name: 'Ração Filhote' });
    const { score } = scoreProduct(c, makeCtx({ petStage: 'adult' }));
    expect(score).toBe(0);
  });

  it('peso pequeno + "pequenos" no nome → +3', () => {
    const c = makeCandidate({ name: 'Coleira para Cães Pequenos' });
    const { score } = scoreProduct(c, makeCtx({ petWeightKg: 5 }));
    expect(score).toBe(3);
  });

  it('peso grande + "15kg" no nome → +3', () => {
    const c = makeCandidate({ name: 'Ração 15kg' });
    const { score } = scoreProduct(c, makeCtx({ petWeightKg: 30 }));
    expect(score).toBe(3);
  });

  it('novidade: produto criado há < 30 dias → +2', () => {
    const c = makeCandidate({ createdAt: new Date('2025-12-20T00:00:00Z') });
    const { score } = scoreProduct(c, makeCtx());
    expect(score).toBe(2);
  });

  it('soma tudo: wishlist + categoria + popularidade + jovem = 15+10+5+8 = 38', () => {
    const c = makeCandidate({
      id: 'x',
      categoryId: 'ração',
      name: 'Ração Filhote 3kg',
    });
    const { score } = scoreProduct(
      c,
      makeCtx({
        wishlistProductIds: new Set(['x']),
        boughtCategoryIds: new Set(['ração']),
        popularity: new Map([['x', 10]]),
        petStage: 'young',
        petAgeMonths: 6,
      }),
    );
    expect(score).toBe(38);
  });
});

describe('derivePetStage', () => {
  it('null birthDate → unknown', () => {
    const { stage, ageMonths } = derivePetStage(null, NOW);
    expect(stage).toBe('unknown');
    expect(ageMonths).toBeNull();
  });

  it('nascido há 6 meses → young', () => {
    const birth = new Date(NOW);
    birth.setMonth(birth.getMonth() - 6);
    const { stage } = derivePetStage(birth, NOW);
    expect(stage).toBe('young');
  });

  it('nascido há 3 anos → adult', () => {
    const birth = new Date(NOW);
    birth.setFullYear(birth.getFullYear() - 3);
    const { stage } = derivePetStage(birth, NOW);
    expect(stage).toBe('adult');
  });

  it('nascido há 10 anos → senior', () => {
    const birth = new Date(NOW);
    birth.setFullYear(birth.getFullYear() - 10);
    const { stage } = derivePetStage(birth, NOW);
    expect(stage).toBe('senior');
  });
});

describe('diversifyByCategory', () => {
  const items = [
    { product: { categoryId: 'A' } },
    { product: { categoryId: 'A' } },
    { product: { categoryId: 'A' } },
    { product: { categoryId: 'B' } },
    { product: { categoryId: 'A' } },
    { product: { categoryId: 'B' } },
  ];

  it('cap 2 por categoria mantém ordem original', () => {
    const out = diversifyByCategory(items, 2);
    expect(out).toHaveLength(4);
    expect(out.filter((i) => i.product.categoryId === 'A')).toHaveLength(2);
    expect(out.filter((i) => i.product.categoryId === 'B')).toHaveLength(2);
  });

  it('cap 1 remove todas as duplicatas por categoria', () => {
    const out = diversifyByCategory(items, 1);
    expect(out).toHaveLength(2);
  });

  it('cap alto ≥ tamanho não filtra nada', () => {
    const out = diversifyByCategory(items, 100);
    expect(out).toHaveLength(items.length);
  });
});
