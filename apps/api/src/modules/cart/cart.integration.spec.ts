import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
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

describe('cart / integração', () => {
  let app: FastifyInstance;
  let aliceToken: string;
  let brunoToken: string;
  let productA: { id: string; slug: string };
  let productB: { id: string };

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
    [aliceToken, brunoToken] = await Promise.all([
      loginAs(app, 'alice.dev@petzo.test'),
      loginAs(app, 'bruno.dev@petzo.test'),
    ]);
    const [a, b] = await Promise.all([
      prisma.product.findUniqueOrThrow({ where: { slug: 'bola-borracha-caes-p' } }),
      prisma.product.findUniqueOrThrow({ where: { slug: 'petisco-natural-caes-500g' } }),
    ]);
    productA = { id: a.id, slug: a.slug };
    productB = { id: b.id };
  });

  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    // Zera cart da alice a cada teste (POST cria on-demand)
    await app.inject({
      method: 'DELETE',
      url: '/cart',
      headers: { authorization: `Bearer ${aliceToken}` },
    });
  });

  it('GET /cart sem token → 401', async () => {
    const res = await app.inject({ method: 'GET', url: '/cart' });
    expect(res.statusCode).toBe(401);
  });

  it('GET /cart cria carrinho vazio na primeira chamada', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/cart',
      headers: { authorization: `Bearer ${aliceToken}` },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json() as { items: unknown[]; subtotal: number; itemCount: number };
    expect(body.items).toEqual([]);
    expect(body.subtotal).toBe(0);
    expect(body.itemCount).toBe(0);
  });

  it('POST /cart/items adiciona item; segundo POST do mesmo product SOMA quantidade', async () => {
    const first = await app.inject({
      method: 'POST',
      url: '/cart/items',
      headers: { authorization: `Bearer ${aliceToken}` },
      payload: { productId: productA.id, quantity: 2 },
    });
    expect(first.statusCode).toBe(201);
    let body = first.json() as { items: { productId: string; quantity: number }[]; subtotal: number };
    expect(body.items).toHaveLength(1);
    expect(body.items[0]?.quantity).toBe(2);

    const second = await app.inject({
      method: 'POST',
      url: '/cart/items',
      headers: { authorization: `Bearer ${aliceToken}` },
      payload: { productId: productA.id, quantity: 3 },
    });
    body = second.json() as { items: { productId: string; quantity: number }[]; subtotal: number };
    expect(body.items).toHaveLength(1);
    expect(body.items[0]?.quantity).toBe(5);
  });

  it('subtotal recalculado pelo backend usa preço atual do produto', async () => {
    const product = await prisma.product.findUniqueOrThrow({ where: { id: productA.id } });
    await app.inject({
      method: 'POST',
      url: '/cart/items',
      headers: { authorization: `Bearer ${aliceToken}` },
      payload: { productId: productA.id, quantity: 2 },
    });
    const get = await app.inject({
      method: 'GET',
      url: '/cart',
      headers: { authorization: `Bearer ${aliceToken}` },
    });
    const body = get.json() as { subtotal: number; items: { unitPrice: number; lineTotal: number }[] };
    expect(body.items[0]?.unitPrice).toBe(product.price);
    expect(body.items[0]?.lineTotal).toBe(product.price * 2);
    expect(body.subtotal).toBe(product.price * 2);
  });

  it('POST com quantity > estoque → 409', async () => {
    const product = await prisma.product.findUniqueOrThrow({
      where: { id: productA.id },
      include: { inventory: true },
    });
    const stock = product.inventory?.quantity ?? 0;
    const res = await app.inject({
      method: 'POST',
      url: '/cart/items',
      headers: { authorization: `Bearer ${aliceToken}` },
      payload: { productId: productA.id, quantity: stock + 100 },
    });
    expect(res.statusCode).toBe(409);
  });

  it('PATCH quantity atualiza; DELETE item remove', async () => {
    await app.inject({
      method: 'POST',
      url: '/cart/items',
      headers: { authorization: `Bearer ${aliceToken}` },
      payload: { productId: productA.id, quantity: 2 },
    });
    const cart = await app.inject({
      method: 'GET',
      url: '/cart',
      headers: { authorization: `Bearer ${aliceToken}` },
    });
    const { items } = cart.json() as { items: { id: string }[] };
    const itemId = items[0]!.id;

    const patch = await app.inject({
      method: 'PATCH',
      url: `/cart/items/${itemId}`,
      headers: { authorization: `Bearer ${aliceToken}` },
      payload: { quantity: 4 },
    });
    expect(patch.statusCode).toBe(200);
    expect((patch.json() as { items: { quantity: number }[] }).items[0]?.quantity).toBe(4);

    const del = await app.inject({
      method: 'DELETE',
      url: `/cart/items/${itemId}`,
      headers: { authorization: `Bearer ${aliceToken}` },
    });
    expect(del.statusCode).toBe(200);
    expect((del.json() as { items: unknown[] }).items).toEqual([]);
  });

  it('outro usuário não consegue tocar em item alheio (retorna 404 para não vazar existência)', async () => {
    await app.inject({
      method: 'POST',
      url: '/cart/items',
      headers: { authorization: `Bearer ${aliceToken}` },
      payload: { productId: productA.id, quantity: 1 },
    });
    const cart = await app.inject({
      method: 'GET',
      url: '/cart',
      headers: { authorization: `Bearer ${aliceToken}` },
    });
    const itemId = (cart.json() as { items: { id: string }[] }).items[0]!.id;

    // quantity dentro do limite Zod — o teste é sobre AUTORIZAÇÃO, não validação
    const attack = await app.inject({
      method: 'PATCH',
      url: `/cart/items/${itemId}`,
      headers: { authorization: `Bearer ${brunoToken}` },
      payload: { quantity: 2 },
    });
    expect(attack.statusCode).toBe(404);
  });

  it('DELETE /cart esvazia tudo', async () => {
    await Promise.all([
      app.inject({
        method: 'POST',
        url: '/cart/items',
        headers: { authorization: `Bearer ${aliceToken}` },
        payload: { productId: productA.id, quantity: 1 },
      }),
      app.inject({
        method: 'POST',
        url: '/cart/items',
        headers: { authorization: `Bearer ${aliceToken}` },
        payload: { productId: productB.id, quantity: 2 },
      }),
    ]);
    const clear = await app.inject({
      method: 'DELETE',
      url: '/cart',
      headers: { authorization: `Bearer ${aliceToken}` },
    });
    expect(clear.statusCode).toBe(200);
    expect((clear.json() as { items: unknown[]; subtotal: number }).items).toEqual([]);
    expect((clear.json() as { subtotal: number }).subtotal).toBe(0);
  });
});
