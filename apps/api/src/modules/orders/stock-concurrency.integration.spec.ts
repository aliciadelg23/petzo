import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../../app';
import { prisma } from '../../shared/prisma';

/**
 * Regressão para C1 da auditoria: dois checkouts concorrentes para o
 * mesmo último item do estoque.
 *
 * Antes da correção (decremento não atômico), ambos passavam no check
 * e ambos viravam PAID → estoque ficava negativo.
 * Depois (UPDATE condicional com WHERE quantity >= N):
 *   - 1 checkout vira PAID
 *   - o outro recebe 409 CONFLICT
 *   - estoque final = 0 (nunca negativo)
 */

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

describe('orders / concorrência de estoque', () => {
  let app: FastifyInstance;
  let aliceToken: string;
  let brunoToken: string;
  let productId: string;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
    [aliceToken, brunoToken] = await Promise.all([
      loginAs(app, 'alice.dev@petzo.test'),
      loginAs(app, 'bruno.dev@petzo.test'),
    ]);
    const p = await prisma.product.findUniqueOrThrow({ where: { slug: 'bola-borracha-caes-p' } });
    productId = p.id;
  });

  afterAll(async () => {
    // Restaura o estoque para não afetar specs que rodam depois no mesmo DB.
    // Sem isso, cart/orders specs falham com 409 "sem estoque".
    await prisma.inventory.update({
      where: { productId },
      data: { quantity: 50 },
    });
    await app.close();
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    // Reset: 1 unidade de estoque para o produto sob teste.
    await prisma.inventory.update({
      where: { productId },
      data: { quantity: 1 },
    });
    // Zera os carrinhos dos dois usuários e coloca 1 unidade em cada.
    for (const token of [aliceToken, brunoToken]) {
      await app.inject({
        method: 'DELETE',
        url: '/cart',
        headers: { authorization: `Bearer ${token}` },
      });
      const add = await app.inject({
        method: 'POST',
        url: '/cart/items',
        headers: { authorization: `Bearer ${token}` },
        payload: { productId, quantity: 1 },
      });
      expect(add.statusCode).toBeLessThan(300);
    }
  });

  it('dois checkouts simultâneos com estoque=1 → só 1 vence; estoque nunca negativo', async () => {
    const [ra, rb] = await Promise.all([
      app.inject({
        method: 'POST',
        url: '/orders',
        headers: { authorization: `Bearer ${aliceToken}` },
        payload: { address: ADDRESS },
      }),
      app.inject({
        method: 'POST',
        url: '/orders',
        headers: { authorization: `Bearer ${brunoToken}` },
        payload: { address: ADDRESS },
      }),
    ]);

    const codes = [ra.statusCode, rb.statusCode].sort();
    // Exatamente uma vitória (201) e uma derrota por conflito (409).
    expect(codes).toEqual([201, 409]);

    const inventoryAfter = await prisma.inventory.findUniqueOrThrow({ where: { productId } });
    expect(inventoryAfter.quantity).toBe(0);
    expect(inventoryAfter.quantity).toBeGreaterThanOrEqual(0);
  });

  it('cart addItem simultâneo com mesmo produto → sem duplicata, sem 500', async () => {
    // Aumenta estoque para permitir 2 clicks
    await prisma.inventory.update({ where: { productId }, data: { quantity: 10 } });

    // Zera o cart da alice e dispara 3 addItems em paralelo com o MESMO produto.
    await app.inject({
      method: 'DELETE',
      url: '/cart',
      headers: { authorization: `Bearer ${aliceToken}` },
    });
    const results = await Promise.all(
      [1, 1, 1].map(() =>
        app.inject({
          method: 'POST',
          url: '/cart/items',
          headers: { authorization: `Bearer ${aliceToken}` },
          payload: { productId, quantity: 1 },
        }),
      ),
    );

    for (const r of results) {
      expect(r.statusCode).toBeLessThan(300);
    }

    // Cart deve ter EXATAMENTE 1 linha para esse produto (o upsert consolida).
    const cart = await prisma.cart.findUniqueOrThrow({
      where: { userId: (await prisma.user.findUniqueOrThrow({
        where: { email: 'alice.dev@petzo.test' },
      })).id },
      include: { items: true },
    });
    const linesForProduct = cart.items.filter((i) => i.productId === productId);
    expect(linesForProduct).toHaveLength(1);
  });
});
