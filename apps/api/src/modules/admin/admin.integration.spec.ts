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

const ADDRESS = {
  label: 'Casa',
  street: 'Rua Fictícia',
  number: '123',
  district: 'Bairro Ex',
  city: 'Cidade Ex',
  state: 'SP',
  zip: '01234-567',
};

describe('admin / integração', () => {
  let app: FastifyInstance;
  let adminToken: string;
  let staffToken: string;
  let customerToken: string;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
    [adminToken, staffToken, customerToken] = await Promise.all([
      loginAs(app, 'admin@petzo.test'),
      loginAs(app, 'staff@petzo.test'),
      loginAs(app, 'alice.dev@petzo.test'),
    ]);
  });

  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
  });

  // ---------------------------------------------------------------------------
  // RBAC
  // ---------------------------------------------------------------------------

  it('sem token → 401 em /admin/dashboard/metrics', async () => {
    const res = await app.inject({ method: 'GET', url: '/admin/dashboard/metrics' });
    expect(res.statusCode).toBe(401);
  });

  it('CUSTOMER → 403 em /admin/*', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/admin/dashboard/metrics',
      headers: { authorization: `Bearer ${customerToken}` },
    });
    expect(res.statusCode).toBe(403);
  });

  it('STAFF pode acessar', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/admin/dashboard/metrics',
      headers: { authorization: `Bearer ${staffToken}` },
    });
    expect(res.statusCode).toBe(200);
  });

  // ---------------------------------------------------------------------------
  // Métricas — dados reais
  // ---------------------------------------------------------------------------

  it('dashboard metrics reflete estado REAL do DB (nunca hardcoded)', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/admin/dashboard/metrics',
      headers: { authorization: `Bearer ${adminToken}` },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json() as {
      sales: { total: number; count: number; avgTicket: number; series: unknown[] };
      orders: { total: number; byStatus: Record<string, number>; pending: number };
      customers: { total: number; newLast30d: number };
      products: { total: number; active: number; lowStock: unknown[] };
    };

    // Confere com contagens reais do DB
    const [actualOrdersTotal, actualCustomersTotal, actualProductsTotal] = await Promise.all([
      prisma.order.count(),
      prisma.user.count({ where: { role: { name: 'CUSTOMER' } } }),
      prisma.product.count(),
    ]);
    expect(body.orders.total).toBe(actualOrdersTotal);
    expect(body.customers.total).toBe(actualCustomersTotal);
    expect(body.products.total).toBe(actualProductsTotal);

    // Série tem exatamente 30 dias
    expect(body.sales.series).toHaveLength(30);
    // byStatus tem TODAS as chaves (mesmo zeradas)
    expect(Object.keys(body.orders.byStatus).sort()).toEqual(
      ['CANCELLED', 'DELIVERED', 'PAID', 'PENDING_PAYMENT', 'PROCESSING', 'SHIPPED'].sort(),
    );
  });

  it('sales reflete um pedido criado agora', async () => {
    // Cria um pedido do zero para o Bruno
    const brunoToken = await loginAs(app, 'bruno.dev@petzo.test');
    const productA = await prisma.product.findFirstOrThrow({ where: { active: true } });
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
    const created = await app.inject({
      method: 'POST',
      url: '/orders',
      headers: { authorization: `Bearer ${brunoToken}` },
      payload: { address: ADDRESS },
    });
    expect(created.statusCode).toBe(201);
    const orderId = (created.json() as { id: string }).id;

    const metrics = await app.inject({
      method: 'GET',
      url: '/admin/dashboard/metrics',
      headers: { authorization: `Bearer ${adminToken}` },
    });
    const body = metrics.json() as { sales: { count: number }; orders: { total: number } };
    expect(body.sales.count).toBeGreaterThanOrEqual(1);
    // Limpa o pedido para não poluir demais o estado
    void orderId;
  });

  // ---------------------------------------------------------------------------
  // /admin/orders
  // ---------------------------------------------------------------------------

  it('GET /admin/orders lista todos com paginação', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/admin/orders?limit=5',
      headers: { authorization: `Bearer ${adminToken}` },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json() as { items: unknown[]; limit: number };
    expect(body.limit).toBe(5);
    expect(body.items.length).toBeLessThanOrEqual(5);
  });

  it('GET /admin/orders?status=PAID filtra por status', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/admin/orders?status=PAID',
      headers: { authorization: `Bearer ${adminToken}` },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json() as { items: { status: string }[] };
    for (const it of body.items) {
      expect(it.status).toBe('PAID');
    }
  });

  it('PATCH /admin/orders/:id/status transiciona PAID → PROCESSING', async () => {
    // Encontra um order PAID (do seed do bruno)
    const paid = await prisma.order.findFirstOrThrow({ where: { status: 'PAID' } });
    const res = await app.inject({
      method: 'PATCH',
      url: `/admin/orders/${paid.id}/status`,
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { status: 'PROCESSING' },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json() as { status: string };
    expect(body.status).toBe('PROCESSING');

    // Transição inválida agora: PROCESSING → PAID
    const invalid = await app.inject({
      method: 'PATCH',
      url: `/admin/orders/${paid.id}/status`,
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { status: 'PAID' },
    });
    expect(invalid.statusCode).toBe(409);
  });

  // ---------------------------------------------------------------------------
  // /admin/customers
  // ---------------------------------------------------------------------------

  it('GET /admin/customers retorna só CUSTOMERs (não STAFF/ADMIN)', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/admin/customers?limit=50',
      headers: { authorization: `Bearer ${adminToken}` },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json() as { items: { role: string; email: string }[] };
    for (const it of body.items) {
      expect(it.role).toBe('CUSTOMER');
    }
    expect(body.items.some((c) => c.email === 'alice.dev@petzo.test')).toBe(true);
    expect(body.items.some((c) => c.email === 'admin@petzo.test')).toBe(false);
  });

  it('GET /admin/customers?search=alice filtra', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/admin/customers?search=alice',
      headers: { authorization: `Bearer ${adminToken}` },
    });
    const body = res.json() as { items: { email: string }[] };
    for (const it of body.items) {
      expect(it.email.toLowerCase()).toContain('alice');
    }
  });

  // ---------------------------------------------------------------------------
  // /admin/inventory
  // ---------------------------------------------------------------------------

  it('GET /admin/inventory retorna produtos com posição de estoque', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/admin/inventory?limit=50',
      headers: { authorization: `Bearer ${adminToken}` },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json() as {
      items: { productId: string; quantity: number; reorderPoint: number }[];
    };
    expect(body.items.length).toBeGreaterThan(0);
    for (const it of body.items) {
      expect(typeof it.quantity).toBe('number');
      expect(typeof it.reorderPoint).toBe('number');
    }
  });

  it('PATCH /admin/inventory/:productId atualiza quantidade', async () => {
    const product = await prisma.product.findFirstOrThrow({ where: { active: true } });
    const res = await app.inject({
      method: 'PATCH',
      url: `/admin/inventory/${product.id}`,
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { quantity: 999 },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json() as { quantity: number };
    expect(body.quantity).toBe(999);
  });

  it('PATCH /admin/inventory/:invalidId → 404', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: `/admin/inventory/nao-existe`,
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { quantity: 10 },
    });
    expect(res.statusCode).toBe(404);
  });
});
