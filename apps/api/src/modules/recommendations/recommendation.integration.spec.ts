/**
 * Integration test do endpoint /pets/:petId/recommendations.
 * Requer Postgres + seed.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../../app';
import { prisma } from '../../shared/prisma';

async function loginAs(app: FastifyInstance, email: string): Promise<string> {
  const res = await app.inject({
    method: 'POST',
    url: '/auth/login',
    payload: { email, password: 'Password!1' },
  });
  if (res.statusCode !== 200) throw new Error(`login ${email}: ${res.body}`);
  return (res.json() as { accessToken: string }).accessToken;
}

describe('recommendations / integração', () => {
  let app: FastifyInstance;
  let aliceToken: string;
  let staffToken: string;
  let alicePetDog: { id: string };
  let alicePetCat: { id: string };
  let brunoPet: { id: string };

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
    [aliceToken, staffToken] = await Promise.all([
      loginAs(app, 'alice.dev@petzo.test'),
      loginAs(app, 'staff@petzo.test'),
    ]);
    const [luna, thor, nina] = await Promise.all([
      prisma.pet.findUniqueOrThrow({ where: { id: 'seed-pet-luna' } }),
      prisma.pet.findUniqueOrThrow({ where: { id: 'seed-pet-thor' } }),
      prisma.pet.findUniqueOrThrow({ where: { id: 'seed-pet-nina' } }),
    ]);
    alicePetDog = { id: luna.id };
    alicePetCat = { id: thor.id };
    brunoPet = { id: nina.id };
  });

  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
  });

  it('sem auth → 401', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/pets/${alicePetDog.id}/recommendations`,
    });
    expect(res.statusCode).toBe(401);
  });

  it('pet inexistente → 404', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/pets/nao-existe-xyz/recommendations`,
      headers: { authorization: `Bearer ${aliceToken}` },
    });
    expect(res.statusCode).toBe(404);
  });

  it('pet alheio → 404 (não vaza existência)', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/pets/${brunoPet.id}/recommendations`,
      headers: { authorization: `Bearer ${aliceToken}` },
    });
    expect(res.statusCode).toBe(404);
  });

  it('STAFF pode ver recomendações de qualquer pet', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/pets/${brunoPet.id}/recommendations`,
      headers: { authorization: `Bearer ${staffToken}` },
    });
    expect(res.statusCode).toBe(200);
  });

  it('para pet CAT (thor) retorna somente produtos de gatos', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/pets/${alicePetCat.id}/recommendations?limit=20`,
      headers: { authorization: `Bearer ${aliceToken}` },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json() as {
      strategy: string;
      disclaimer: string;
      items: { productId: string; category: { slug: string }; name: string }[];
    };
    expect(body.strategy).toBe('rules-v1');
    expect(body.disclaimer).toMatch(/comerciais/i);
    expect(body.items.length).toBeGreaterThan(0);
    // Nenhum item deve ser de categoria de cães ou medicamentos
    for (const item of body.items) {
      expect(item.category.slug.includes('caes') || item.category.slug === 'medicamentos').toBe(false);
    }
  });

  it('NUNCA recomenda produtos da categoria "medicamentos"', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/pets/${alicePetDog.id}/recommendations?limit=50`,
      headers: { authorization: `Bearer ${aliceToken}` },
    });
    expect(res.statusCode).toBe(200);
    const items = (res.json() as { items: { category: { slug: string }; name: string }[] }).items;
    for (const it of items) {
      expect(it.category.slug).not.toBe('medicamentos');
      expect(it.name.toLowerCase()).not.toMatch(/vermífug|antiparasit|antibiótic|medicament/);
    }
  });

  it('reasons são humanas e cada item traz score ≥ 0', async () => {
    // Adiciona algo à wishlist da alice para gerar reason "está na wishlist"
    const someCatProduct = await prisma.product.findFirstOrThrow({
      where: { species: 'CAT', active: true },
    });
    const wishlist = await prisma.wishlist.upsert({
      where: { userId: (await prisma.user.findUniqueOrThrow({ where: { email: 'alice.dev@petzo.test' } })).id },
      update: {},
      create: {
        userId: (await prisma.user.findUniqueOrThrow({ where: { email: 'alice.dev@petzo.test' } })).id,
      },
    });
    await prisma.wishlistItem.upsert({
      where: {
        wishlistId_productId: { wishlistId: wishlist.id, productId: someCatProduct.id },
      },
      update: {},
      create: { wishlistId: wishlist.id, productId: someCatProduct.id },
    });

    const res = await app.inject({
      method: 'GET',
      url: `/pets/${alicePetCat.id}/recommendations?limit=20`,
      headers: { authorization: `Bearer ${aliceToken}` },
    });
    const items = (res.json() as {
      items: { productId: string; score: number; reasons: string[] }[];
    }).items;
    for (const it of items) {
      expect(it.score).toBeGreaterThanOrEqual(0);
      expect(Array.isArray(it.reasons)).toBe(true);
    }
    const wishItem = items.find((i) => i.productId === someCatProduct.id);
    if (wishItem) {
      expect(wishItem.reasons.some((r) => /wishlist/i.test(r))).toBe(true);
    }
  });

  it('respeita limit', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/pets/${alicePetDog.id}/recommendations?limit=3`,
      headers: { authorization: `Bearer ${aliceToken}` },
    });
    const items = (res.json() as { items: unknown[] }).items;
    expect(items.length).toBeLessThanOrEqual(3);
  });

  it('limit inválido (0 ou 999) cai em 400', async () => {
    const zero = await app.inject({
      method: 'GET',
      url: `/pets/${alicePetDog.id}/recommendations?limit=0`,
      headers: { authorization: `Bearer ${aliceToken}` },
    });
    expect(zero.statusCode).toBe(400);
    const huge = await app.inject({
      method: 'GET',
      url: `/pets/${alicePetDog.id}/recommendations?limit=999`,
      headers: { authorization: `Bearer ${aliceToken}` },
    });
    expect(huge.statusCode).toBe(400);
  });
});
