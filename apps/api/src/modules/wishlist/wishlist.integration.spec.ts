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

describe('wishlist / integração', () => {
  let app: FastifyInstance;
  let aliceToken: string;
  let brunoToken: string;
  let productA: { id: string };
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
    productA = { id: a.id };
    productB = { id: b.id };
  });

  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
  });

  it('sem auth → 401', async () => {
    expect((await app.inject({ method: 'GET', url: '/wishlist' })).statusCode).toBe(401);
  });

  it('GET cria wishlist vazia na primeira chamada', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/wishlist',
      headers: { authorization: `Bearer ${brunoToken}` },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json() as { id: string; items: unknown[] };
    expect(body.id).toBeDefined();
    expect(Array.isArray(body.items)).toBe(true);
  });

  it('POST /wishlist/items é idempotente (não duplica)', async () => {
    const first = await app.inject({
      method: 'POST',
      url: '/wishlist/items',
      headers: { authorization: `Bearer ${aliceToken}` },
      payload: { productId: productA.id },
    });
    expect(first.statusCode).toBe(200);
    const second = await app.inject({
      method: 'POST',
      url: '/wishlist/items',
      headers: { authorization: `Bearer ${aliceToken}` },
      payload: { productId: productA.id },
    });
    expect(second.statusCode).toBe(200);
    const body = second.json() as { items: { productId: string }[] };
    expect(body.items.filter((i) => i.productId === productA.id)).toHaveLength(1);
  });

  it('POST com productId inexistente → 404', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/wishlist/items',
      headers: { authorization: `Bearer ${aliceToken}` },
      payload: { productId: 'nao-existe-xyz' },
    });
    expect(res.statusCode).toBe(404);
  });

  it('cada usuário vê APENAS os próprios itens', async () => {
    // Alice adiciona productB
    await app.inject({
      method: 'POST',
      url: '/wishlist/items',
      headers: { authorization: `Bearer ${aliceToken}` },
      payload: { productId: productB.id },
    });
    // Bruno não tem productB
    const brunoList = await app.inject({
      method: 'GET',
      url: '/wishlist',
      headers: { authorization: `Bearer ${brunoToken}` },
    });
    const brunoItems = (brunoList.json() as { items: { productId: string }[] }).items;
    expect(brunoItems.some((i) => i.productId === productB.id)).toBe(false);
  });

  it('DELETE remove item; segundo DELETE idempotente (não erra)', async () => {
    await app.inject({
      method: 'POST',
      url: '/wishlist/items',
      headers: { authorization: `Bearer ${brunoToken}` },
      payload: { productId: productB.id },
    });
    const del1 = await app.inject({
      method: 'DELETE',
      url: `/wishlist/items/${productB.id}`,
      headers: { authorization: `Bearer ${brunoToken}` },
    });
    expect(del1.statusCode).toBe(200);
    const items = (del1.json() as { items: { productId: string }[] }).items;
    expect(items.some((i) => i.productId === productB.id)).toBe(false);

    // Idempotente
    const del2 = await app.inject({
      method: 'DELETE',
      url: `/wishlist/items/${productB.id}`,
      headers: { authorization: `Bearer ${brunoToken}` },
    });
    expect(del2.statusCode).toBe(200);
  });
});
