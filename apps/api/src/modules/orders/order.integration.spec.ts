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

const ADDRESS = {
  label: 'Casa',
  street: 'Rua Fictícia',
  number: '123',
  district: 'Bairro Ex',
  city: 'Cidade Ex',
  state: 'SP',
  zip: '01234-567',
};

describe('orders / integração', () => {
  let app: FastifyInstance;
  let aliceToken: string;
  let productA: { id: string; price: number };

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
    aliceToken = await loginAs(app, 'alice.dev@petzo.test');
    const a = await prisma.product.findUniqueOrThrow({ where: { slug: 'bola-borracha-caes-p' } });
    productA = { id: a.id, price: a.price };
  });

  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    await app.inject({
      method: 'DELETE',
      url: '/cart',
      headers: { authorization: `Bearer ${aliceToken}` },
    });
  });

  it('POST /orders com cart vazio → 400', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/orders',
      headers: { authorization: `Bearer ${aliceToken}` },
      payload: { address: ADDRESS },
    });
    expect(res.statusCode).toBe(400);
  });

  it('POST /orders com cart populado → 201 com status PAID + payment CAPTURED', async () => {
    await app.inject({
      method: 'POST',
      url: '/cart/items',
      headers: { authorization: `Bearer ${aliceToken}` },
      payload: { productId: productA.id, quantity: 2 },
    });
    const res = await app.inject({
      method: 'POST',
      url: '/orders',
      headers: { authorization: `Bearer ${aliceToken}` },
      payload: { address: ADDRESS },
    });
    expect(res.statusCode).toBe(201);
    const body = res.json() as {
      status: string;
      subtotal: number;
      shipping: number;
      total: number;
      items: { priceSnapshot: number; quantity: number }[];
      payment: { status: string; paidAt: string | null };
    };
    expect(body.status).toBe('PAID');
    expect(body.subtotal).toBe(productA.price * 2);
    // Frete depende do subtotal (>= R$100 → grátis)
    if (body.subtotal >= 10000) {
      expect(body.shipping).toBe(0);
    } else {
      expect(body.shipping).toBe(1500);
    }
    expect(body.items[0]?.priceSnapshot).toBe(productA.price);
    expect(body.payment?.status).toBe('CAPTURED');
    expect(body.payment?.paidAt).not.toBeNull();
  });

  it('checkout esvazia o carrinho e decrementa estoque', async () => {
    const before = await prisma.product.findUniqueOrThrow({
      where: { id: productA.id },
      include: { inventory: true },
    });
    const stockBefore = before.inventory?.quantity ?? 0;

    await app.inject({
      method: 'POST',
      url: '/cart/items',
      headers: { authorization: `Bearer ${aliceToken}` },
      payload: { productId: productA.id, quantity: 3 },
    });
    await app.inject({
      method: 'POST',
      url: '/orders',
      headers: { authorization: `Bearer ${aliceToken}` },
      payload: { address: ADDRESS },
    });

    const after = await prisma.product.findUniqueOrThrow({
      where: { id: productA.id },
      include: { inventory: true },
    });
    expect((after.inventory?.quantity ?? 0)).toBe(stockBefore - 3);

    const cart = await app.inject({
      method: 'GET',
      url: '/cart',
      headers: { authorization: `Bearer ${aliceToken}` },
    });
    expect((cart.json() as { items: unknown[] }).items).toEqual([]);
  });

  it('backend ignora preço malicioso enviado pelo cliente (não existe campo)', async () => {
    await app.inject({
      method: 'POST',
      url: '/cart/items',
      headers: { authorization: `Bearer ${aliceToken}` },
      payload: { productId: productA.id, quantity: 1 },
    });
    // Envia campos extras que a Zod deveria ignorar (removeAdditional=all no Ajv);
    // total/subtotal mesmo se aceitos, backend recalcula.
    const res = await app.inject({
      method: 'POST',
      url: '/orders',
      headers: { authorization: `Bearer ${aliceToken}` },
      payload: {
        address: ADDRESS,
        total: 1,        // ignorado
        subtotal: 1,     // ignorado
        shipping: 0,     // ignorado
      },
    });
    expect(res.statusCode).toBe(201);
    const body = res.json() as { total: number; subtotal: number };
    expect(body.subtotal).toBe(productA.price); // reflete o preço real, não 1
    expect(body.total).toBeGreaterThan(1);
  });

  it('CEP inválido no address é rejeitado (400 VALIDATION)', async () => {
    await app.inject({
      method: 'POST',
      url: '/cart/items',
      headers: { authorization: `Bearer ${aliceToken}` },
      payload: { productId: productA.id, quantity: 1 },
    });
    const res = await app.inject({
      method: 'POST',
      url: '/orders',
      headers: { authorization: `Bearer ${aliceToken}` },
      payload: { address: { ...ADDRESS, zip: 'nao-é-cep' } },
    });
    expect(res.statusCode).toBe(400);
  });

  it('cupom BEMVINDO10 aplica 10% de desconto se subtotal >= R$50 (5000c)', async () => {
    // Preço da bola: R$24,90 (2490 c). 3 unidades = 7470 c >= 5000. Deve aplicar 10% = 747 c.
    await app.inject({
      method: 'POST',
      url: '/cart/items',
      headers: { authorization: `Bearer ${aliceToken}` },
      payload: { productId: productA.id, quantity: 3 },
    });
    const res = await app.inject({
      method: 'POST',
      url: '/orders',
      headers: { authorization: `Bearer ${aliceToken}` },
      payload: { address: ADDRESS, couponCode: "BEMVINDO10" },
    });
    expect(res.statusCode).toBe(201);
    const body = res.json() as { subtotal: number; discount: number };
    expect(body.discount).toBe(Math.floor(body.subtotal * 10 / 100));
  });

  it('cupom inexistente é rejeitado (400)', async () => {
    await app.inject({
      method: 'POST',
      url: '/cart/items',
      headers: { authorization: `Bearer ${aliceToken}` },
      payload: { productId: productA.id, quantity: 1 },
    });
    const res = await app.inject({
      method: 'POST',
      url: '/orders',
      headers: { authorization: `Bearer ${aliceToken}` },
      payload: { address: ADDRESS, couponCode: "NAO_EXISTE" },
    });
    expect(res.statusCode).toBe(400);
  });

  it('GET /orders devolve os pedidos do usuário; GET /orders/:id apenas se dele', async () => {
    // cria um pedido
    await app.inject({
      method: 'POST',
      url: '/cart/items',
      headers: { authorization: `Bearer ${aliceToken}` },
      payload: { productId: productA.id, quantity: 1 },
    });
    const created = await app.inject({
      method: 'POST',
      url: '/orders',
      headers: { authorization: `Bearer ${aliceToken}` },
      payload: { address: ADDRESS },
    });
    const orderId = (created.json() as { id: string }).id;

    const list = await app.inject({
      method: 'GET',
      url: '/orders',
      headers: { authorization: `Bearer ${aliceToken}` },
    });
    expect(list.statusCode).toBe(200);
    const listBody = list.json() as { items: { id: string }[]; total: number };
    expect(listBody.items.some((i) => i.id === orderId)).toBe(true);

    const one = await app.inject({
      method: 'GET',
      url: `/orders/${orderId}`,
      headers: { authorization: `Bearer ${aliceToken}` },
    });
    expect(one.statusCode).toBe(200);
    expect((one.json() as { id: string }).id).toBe(orderId);

    // outro usuário não vê
    const brunoToken = await loginAs(app, 'bruno.dev@petzo.test');
    const attack = await app.inject({
      method: 'GET',
      url: `/orders/${orderId}`,
      headers: { authorization: `Bearer ${brunoToken}` },
    });
    expect(attack.statusCode).toBe(404);
  });
});
