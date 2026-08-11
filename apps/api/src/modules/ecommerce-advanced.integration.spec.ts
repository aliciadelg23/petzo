/**
 * Integration tests para wishlist, reviews (regra de compra), coupons
 * (validação de expiração/limite/mínimo) e subscriptions (state machine).
 *
 * Precisa Postgres up + seed rodado.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../app';
import { prisma } from '../shared/prisma';

async function loginAs(app: FastifyInstance, email: string): Promise<string> {
  const res = await app.inject({
    method: 'POST',
    url: '/auth/login',
    payload: { email, password: 'Password!1' },
  });
  if (res.statusCode !== 200) throw new Error(`login ${email}: ${res.body}`);
  return (res.json() as { accessToken: string }).accessToken;
}

const ADDRESS = {
  label: 'Casa',
  street: 'Rua Fictícia',
  number: '123',
  district: 'Bairro Ex',
  city: 'Cidade Ex',
  state: 'SP',
  zip: '01234-567',
};

describe('e-commerce advanced / integração', () => {
  let app: FastifyInstance;
  let aliceToken: string;
  let brunoToken: string;
  let adminToken: string;
  let productA: { id: string; slug: string; price: number };
  let productB: { id: string; slug: string; price: number };

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
    [aliceToken, brunoToken, adminToken] = await Promise.all([
      loginAs(app, 'alice.dev@petzo.test'),
      loginAs(app, 'bruno.dev@petzo.test'),
      loginAs(app, 'admin@petzo.test'),
    ]);
    const [a, b] = await Promise.all([
      prisma.product.findUniqueOrThrow({ where: { slug: 'bola-borracha-caes-p' } }),
      prisma.product.findUniqueOrThrow({ where: { slug: 'petisco-natural-caes-500g' } }),
    ]);
    productA = { id: a.id, slug: a.slug, price: a.price };
    productB = { id: b.id, slug: b.slug, price: b.price };
  });

  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
  });

  // =============================================================================
  // WISHLIST
  // =============================================================================

  describe('wishlist', () => {
    it('GET vazia sem token → 401', async () => {
      const r = await app.inject({ method: 'GET', url: '/wishlist' });
      expect(r.statusCode).toBe(401);
    });

    it('POST /wishlist/:productId é idempotente', async () => {
      const r1 = await app.inject({
        method: 'POST',
        url: `/wishlist/items`,
        payload: { productId: productA.id },
        headers: { authorization: `Bearer ${brunoToken}` },
      });
      expect(r1.statusCode).toBe(200);
      const r2 = await app.inject({
        method: 'POST',
        url: `/wishlist/items`,
        payload: { productId: productA.id },
        headers: { authorization: `Bearer ${brunoToken}` },
      });
      expect(r2.statusCode).toBe(200);
      const items = (r2.json() as { items: { productId: string }[] }).items;
      expect(items.filter((i) => i.productId === productA.id)).toHaveLength(1);
    });

    it('POST com productId inexistente → 404', async () => {
      const r = await app.inject({
        method: 'POST',
        url: '/wishlist/items',
        payload: { productId: 'nao-existe-xyz' },
        headers: { authorization: `Bearer ${brunoToken}` },
      });
      expect(r.statusCode).toBe(404);
    });

    it('DELETE remove; deleto duas vezes não erra (idempotente)', async () => {
      await app.inject({
        method: 'POST',
        url: '/wishlist/items',
        payload: { productId: productB.id },
        headers: { authorization: `Bearer ${brunoToken}` },
      });
      const r1 = await app.inject({
        method: 'DELETE',
        url: `/wishlist/items/${productB.id}`,
        headers: { authorization: `Bearer ${brunoToken}` },
      });
      expect(r1.statusCode).toBe(200);
      const r2 = await app.inject({
        method: 'DELETE',
        url: `/wishlist/items/${productB.id}`,
        headers: { authorization: `Bearer ${brunoToken}` },
      });
      expect(r2.statusCode).toBe(200);
    });
  });

  // =============================================================================
  // REVIEWS
  // =============================================================================

  describe('reviews', () => {
    it('POST review de produto NÃO comprado → 403', async () => {
      // alice não comprou productA
      const r = await app.inject({
        method: 'POST',
        url: `/products/${productA.id}/reviews`,
        headers: { authorization: `Bearer ${aliceToken}` },
        payload: { rating: 5, title: 'Meh', comment: 'testando sem comprar' },
      });
      expect(r.statusCode).toBe(403);
      const body = r.json() as { code: string };
      expect(body.code).toBe('FORBIDDEN');
    });

    it('após comprar, POST review 201 e é única por (produto,user)', async () => {
      // bruno compra productA
      await app.inject({
        method: 'DELETE',
        url: '/cart',
        headers: { authorization: `Bearer ${brunoToken}` },
      });
      await app.inject({
        method: 'POST',
        url: '/cart/items',
        headers: { authorization: `Bearer ${brunoToken}` },
        payload: { productId: productA.id, quantity: 1 },
      });
      await app.inject({
        method: 'POST',
        url: '/orders',
        headers: { authorization: `Bearer ${brunoToken}` },
        payload: { address: ADDRESS },
      });

      const first = await app.inject({
        method: 'POST',
        url: `/products/${productA.id}/reviews`,
        headers: { authorization: `Bearer ${brunoToken}` },
        payload: { rating: 4, comment: 'Bom brinquedo.' },
      });
      expect(first.statusCode).toBe(201);
      const created = first.json() as { id: string; rating: number };
      expect(created.rating).toBe(4);

      const second = await app.inject({
        method: 'POST',
        url: `/products/${productA.id}/reviews`,
        headers: { authorization: `Bearer ${brunoToken}` },
        payload: { rating: 5 },
      });
      expect(second.statusCode).toBe(409);
    });

    it('GET lista pública com average', async () => {
      const r = await app.inject({ method: 'GET', url: `/products/${productA.id}/reviews` });
      expect(r.statusCode).toBe(200);
      const body = r.json() as { count: number; averageRating: number | null; items: unknown[] };
      expect(body.count).toBeGreaterThanOrEqual(1);
      expect(body.averageRating).toBeGreaterThan(0);
    });

    it('PATCH da própria review; PATCH de review alheia → 404', async () => {
      const list = await app.inject({ method: 'GET', url: `/products/${productA.id}/reviews` });
      const reviewId = (list.json() as { items: { id: string }[] }).items[0]!.id;

      const own = await app.inject({
        method: 'PATCH',
        url: `/reviews/${reviewId}`,
        headers: { authorization: `Bearer ${brunoToken}` },
        payload: { rating: 5 },
      });
      expect(own.statusCode).toBe(200);
      expect((own.json() as { rating: number }).rating).toBe(5);

      // alice tenta editar review de bruno
      const attack = await app.inject({
        method: 'PATCH',
        url: `/reviews/${reviewId}`,
        headers: { authorization: `Bearer ${aliceToken}` },
        payload: { rating: 1 },
      });
      expect(attack.statusCode).toBe(404);
    });

    it('DELETE da própria review funciona; alheia → 404', async () => {
      const list = await app.inject({ method: 'GET', url: `/products/${productA.id}/reviews` });
      const reviewId = (list.json() as { items: { id: string }[] }).items[0]!.id;

      const attack = await app.inject({
        method: 'DELETE',
        url: `/reviews/${reviewId}`,
        headers: { authorization: `Bearer ${aliceToken}` },
      });
      expect(attack.statusCode).toBe(404);

      const own = await app.inject({
        method: 'DELETE',
        url: `/reviews/${reviewId}`,
        headers: { authorization: `Bearer ${brunoToken}` },
      });
      expect(own.statusCode).toBe(204);
    });
  });

  // =============================================================================
  // COUPONS
  // =============================================================================

  describe('coupons', () => {
    let couponId: string;
    const CODE = `PROMO${Date.now()}`;

    it('POST /coupons como CUSTOMER → 403', async () => {
      const r = await app.inject({
        method: 'POST',
        url: '/coupons',
        headers: { authorization: `Bearer ${aliceToken}` },
        payload: { code: CODE, discountPercent: 10 },
      });
      expect(r.statusCode).toBe(403);
    });

    it('ADMIN cria cupom com percentual', async () => {
      const r = await app.inject({
        method: 'POST',
        url: '/coupons',
        headers: { authorization: `Bearer ${adminToken}` },
        payload: {
          code: CODE,
          discountPercent: 20,
          minOrderAmount: 5000,
          maxUses: 100,
        },
      });
      expect(r.statusCode).toBe(201);
      const body = r.json() as { id: string; code: string };
      couponId = body.id;
      expect(body.code).toBe(CODE);
    });

    it('rejeita cupom com percentual E amount ao mesmo tempo → 400', async () => {
      const r = await app.inject({
        method: 'POST',
        url: '/coupons',
        headers: { authorization: `Bearer ${adminToken}` },
        payload: { code: `X${Date.now()}`, discountPercent: 10, discountAmount: 500 },
      });
      expect(r.statusCode).toBe(400);
    });

    it('rejeita startsAt > endsAt → 400', async () => {
      const r = await app.inject({
        method: 'POST',
        url: '/coupons',
        headers: { authorization: `Bearer ${adminToken}` },
        payload: {
          code: `Y${Date.now()}`,
          discountPercent: 10,
          startsAt: '2030-01-01T00:00:00Z',
          endsAt: '2029-01-01T00:00:00Z',
        },
      });
      expect(r.statusCode).toBe(400);
    });

    it('validate abaixo do mínimo → invalid', async () => {
      const r = await app.inject({
        method: 'POST',
        url: '/coupons/validate',
        headers: { authorization: `Bearer ${aliceToken}` },
        payload: { code: CODE, subtotal: 1000 },
      });
      expect(r.statusCode).toBe(200);
      const body = r.json() as { valid: boolean; discount: number };
      expect(body.valid).toBe(false);
      expect(body.discount).toBe(0);
    });

    it('validate acima do mínimo → valid, discount = 20%', async () => {
      const r = await app.inject({
        method: 'POST',
        url: '/coupons/validate',
        headers: { authorization: `Bearer ${aliceToken}` },
        payload: { code: CODE, subtotal: 10000 },
      });
      const body = r.json() as { valid: boolean; discount: number };
      expect(body.valid).toBe(true);
      expect(body.discount).toBe(2000);
    });

    it('inativar via PATCH → validate retorna invalid', async () => {
      const r = await app.inject({
        method: 'PATCH',
        url: `/coupons/${couponId}`,
        headers: { authorization: `Bearer ${adminToken}` },
        payload: { active: false },
      });
      expect(r.statusCode).toBe(200);
      const check = await app.inject({
        method: 'POST',
        url: '/coupons/validate',
        headers: { authorization: `Bearer ${aliceToken}` },
        payload: { code: CODE, subtotal: 10000 },
      });
      expect((check.json() as { valid: boolean }).valid).toBe(false);
    });

    it('DELETE soft-deleta (active=false)', async () => {
      const r = await app.inject({
        method: 'DELETE',
        url: `/coupons/${couponId}`,
        headers: { authorization: `Bearer ${adminToken}` },
      });
      expect(r.statusCode).toBe(204);
    });
  });

  // =============================================================================
  // SUBSCRIPTIONS
  // =============================================================================

  describe('subscriptions', () => {
    let subId: string;

    it('POST cria subscription ACTIVE com nextChargeAt no futuro', async () => {
      const r = await app.inject({
        method: 'POST',
        url: '/subscriptions',
        headers: { authorization: `Bearer ${aliceToken}` },
        payload: { productId: productA.id, frequency: 'MONTHLY' },
      });
      expect(r.statusCode).toBe(201);
      const body = r.json() as { id: string; status: string; nextChargeAt: string | null };
      subId = body.id;
      expect(body.status).toBe('ACTIVE');
      expect(body.nextChargeAt).not.toBeNull();
      expect(new Date(body.nextChargeAt!).getTime()).toBeGreaterThan(Date.now());
    });

    it('PATCH status: ACTIVE → PAUSED (nextChargeAt limpa)', async () => {
      const r = await app.inject({
        method: 'PATCH',
        url: `/subscriptions/${subId}/status`,
        headers: { authorization: `Bearer ${aliceToken}` },
        payload: { status: 'PAUSED' },
      });
      expect(r.statusCode).toBe(200);
      const body = r.json() as { status: string; nextChargeAt: string | null };
      expect(body.status).toBe('PAUSED');
      expect(body.nextChargeAt).toBeNull();
    });

    it('PAUSED → ACTIVE reagenda nextChargeAt', async () => {
      const r = await app.inject({
        method: 'PATCH',
        url: `/subscriptions/${subId}/status`,
        headers: { authorization: `Bearer ${aliceToken}` },
        payload: { status: 'ACTIVE' },
      });
      expect(r.statusCode).toBe(200);
      const body = r.json() as { status: string; nextChargeAt: string | null };
      expect(body.status).toBe('ACTIVE');
      expect(body.nextChargeAt).not.toBeNull();
    });

    it('mesma-transição (ACTIVE → ACTIVE) → 409', async () => {
      const r = await app.inject({
        method: 'PATCH',
        url: `/subscriptions/${subId}/status`,
        headers: { authorization: `Bearer ${aliceToken}` },
        payload: { status: 'ACTIVE' },
      });
      expect(r.statusCode).toBe(409);
    });

    it('CANCELLED é terminal — nada depois', async () => {
      const cancel = await app.inject({
        method: 'PATCH',
        url: `/subscriptions/${subId}/status`,
        headers: { authorization: `Bearer ${aliceToken}` },
        payload: { status: 'CANCELLED' },
      });
      expect(cancel.statusCode).toBe(200);
      const body = cancel.json() as { canceledAt: string | null; nextChargeAt: string | null };
      expect(body.canceledAt).not.toBeNull();
      expect(body.nextChargeAt).toBeNull();

      const retry = await app.inject({
        method: 'PATCH',
        url: `/subscriptions/${subId}/status`,
        headers: { authorization: `Bearer ${aliceToken}` },
        payload: { status: 'ACTIVE' },
      });
      expect(retry.statusCode).toBe(409);
    });

    it('subscription alheia → 404 (não vaza existência)', async () => {
      const attack = await app.inject({
        method: 'PATCH',
        url: `/subscriptions/${subId}/status`,
        headers: { authorization: `Bearer ${brunoToken}` },
        payload: { status: 'ACTIVE' },
      });
      expect(attack.statusCode).toBe(404);
    });
  });
});
