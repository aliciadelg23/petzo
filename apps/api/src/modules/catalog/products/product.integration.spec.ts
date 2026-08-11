/**
 * Integration test do catálogo. Requer Postgres + seed rodados.
 * Executar: `pnpm --filter @petzo/api test:integration`
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../../../app';
import { prisma } from '../../../shared/prisma';

interface AuthPayload {
  user: { role: string; email: string };
  accessToken: string;
}

async function loginAs(app: FastifyInstance, email: string): Promise<string> {
  const res = await app.inject({
    method: 'POST',
    url: '/auth/login',
    payload: { email, password: 'Password!1' },
  });
  if (res.statusCode !== 200) {
    throw new Error(`login failed for ${email}: ${res.statusCode} ${res.body}`);
  }
  return (res.json() as AuthPayload).accessToken;
}

describe('catalog / integração', () => {
  let app: FastifyInstance;
  let adminToken: string;
  let staffToken: string;
  let customerToken: string;
  let categoryId: string;
  let brandId: string;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();

    [adminToken, staffToken, customerToken] = await Promise.all([
      loginAs(app, 'admin@petzo.test'),
      loginAs(app, 'staff@petzo.test'),
      loginAs(app, 'alice.dev@petzo.test'),
    ]);

    const [cat, brand] = await Promise.all([
      prisma.category.findFirstOrThrow({ where: { slug: 'racao-caes' } }),
      prisma.brand.findFirstOrThrow({ where: { slug: 'petzo-labs' } }),
    ]);
    categoryId = cat.id;
    brandId = brand.id;
  });

  afterAll(async () => {
    // limpa produtos criados no teste
    await prisma.product.deleteMany({ where: { slug: { startsWith: 'test-' } } });
    await app.close();
    await prisma.$disconnect();
  });

  // ---------------------------------------------------------------------------
  // GET /products
  // ---------------------------------------------------------------------------

  it('lista produtos com paginação padrão (page=1, limit=20)', async () => {
    const res = await app.inject({ method: 'GET', url: '/products' });
    expect(res.statusCode).toBe(200);
    const body = res.json() as {
      items: unknown[];
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
    expect(body.page).toBe(1);
    expect(body.limit).toBe(20);
    expect(body.total).toBeGreaterThanOrEqual(10);
    expect(body.items.length).toBeGreaterThanOrEqual(10);
  });

  it('respeita page e limit', async () => {
    const res = await app.inject({ method: 'GET', url: '/products?page=1&limit=3' });
    expect(res.statusCode).toBe(200);
    const body = res.json() as { items: unknown[]; page: number; limit: number };
    expect(body.limit).toBe(3);
    expect(body.items.length).toBe(3);
  });

  it('filtra por search em name/description (case-insensitive; termo ASCII)', async () => {
    // ILIKE do PG não é accent-insensitive por padrão. Usamos termo ASCII presente
    // no seed ("brinquedo") para validar a busca sem depender de extension unaccent.
    const res = await app.inject({ method: 'GET', url: '/products?search=brinquedo' });
    expect(res.statusCode).toBe(200);
    const body = res.json() as { items: { name: string; description: string }[] };
    expect(body.items.length).toBeGreaterThan(0);
    for (const p of body.items) {
      const hay = `${p.name} ${p.description}`.toLowerCase();
      expect(hay.includes('brinquedo')).toBe(true);
    }
  });

  it('filtra por slug de categoria', async () => {
    const res = await app.inject({ method: 'GET', url: '/products?category=racao-gatos' });
    expect(res.statusCode).toBe(200);
    const body = res.json() as { items: { category: { slug: string } }[] };
    expect(body.items.length).toBeGreaterThan(0);
    for (const p of body.items) {
      expect(p.category.slug).toBe('racao-gatos');
    }
  });

  it('filtra por faixa de preço (centavos)', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/products?minPrice=2000&maxPrice=5000',
    });
    expect(res.statusCode).toBe(200);
    const body = res.json() as { items: { price: number }[] };
    for (const p of body.items) {
      expect(p.price).toBeGreaterThanOrEqual(2000);
      expect(p.price).toBeLessThanOrEqual(5000);
    }
  });

  it('rejeita minPrice > maxPrice com 400', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/products?minPrice=9000&maxPrice=100',
    });
    expect(res.statusCode).toBe(400);
    const body = res.json() as { code: string };
    expect(body.code).toBe('VALIDATION_ERROR');
  });

  it('ordena por price_asc', async () => {
    const res = await app.inject({ method: 'GET', url: '/products?sort=price_asc&limit=100' });
    expect(res.statusCode).toBe(200);
    const items = (res.json() as { items: { price: number }[] }).items;
    for (let i = 1; i < items.length; i += 1) {
      const prev = items[i - 1]!.price;
      const curr = items[i]!.price;
      expect(curr).toBeGreaterThanOrEqual(prev);
    }
  });

  it('sort inválido cai em 400', async () => {
    const res = await app.inject({ method: 'GET', url: '/products?sort=eu_quero_esse' });
    expect(res.statusCode).toBe(400);
  });

  it('limit acima do teto (100) cai em 400', async () => {
    const res = await app.inject({ method: 'GET', url: '/products?limit=500' });
    expect(res.statusCode).toBe(400);
  });

  // ---------------------------------------------------------------------------
  // GET /products/:id — aceita id OU slug
  // ---------------------------------------------------------------------------

  it('GET /products/:slug retorna produto por slug', async () => {
    const res = await app.inject({ method: 'GET', url: '/products/bola-borracha-caes-p' });
    expect(res.statusCode).toBe(200);
    const body = res.json() as { slug: string; category: { slug: string } };
    expect(body.slug).toBe('bola-borracha-caes-p');
  });

  it('GET /products/desconhecido retorna 404', async () => {
    const res = await app.inject({ method: 'GET', url: '/products/inexistente-slug-xyz' });
    expect(res.statusCode).toBe(404);
  });

  // ---------------------------------------------------------------------------
  // RBAC nas mutações
  // ---------------------------------------------------------------------------

  it('POST /products sem token → 401', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/products',
      payload: {
        name: 'Ignorado',
        description: 'x',
        categoryId,
        brandId,
        species: 'DOG',
        price: 1000,
      },
    });
    expect(res.statusCode).toBe(401);
  });

  it('POST /products como CUSTOMER → 403', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/products',
      headers: { authorization: `Bearer ${customerToken}` },
      payload: {
        name: 'Ignorado',
        description: 'x',
        categoryId,
        brandId,
        species: 'DOG',
        price: 1000,
      },
    });
    expect(res.statusCode).toBe(403);
  });

  it('POST /products como STAFF cria e devolve 201', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/products',
      headers: { authorization: `Bearer ${staffToken}` },
      payload: {
        name: 'Test Staff Product',
        slug: 'test-staff-product',
        description: 'Criado pelo teste (STAFF).',
        categoryId,
        brandId,
        species: 'DOG',
        price: 4990,
        images: [{ url: 'https://placehold.co/200x200', alt: 'x', position: 0 }],
        inventory: { quantity: 5, reorderPoint: 2 },
      },
    });
    expect(res.statusCode).toBe(201);
    const body = res.json() as { slug: string; available: boolean; images: unknown[] };
    expect(body.slug).toBe('test-staff-product');
    expect(body.available).toBe(true);
    expect(body.images.length).toBe(1);
  });

  it('POST /products com slug duplicado → 409', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/products',
      headers: { authorization: `Bearer ${adminToken}` },
      payload: {
        name: 'Duplicado',
        slug: 'test-staff-product',
        description: 'x',
        categoryId,
        brandId,
        species: 'DOG',
        price: 1000,
      },
    });
    expect(res.statusCode).toBe(409);
  });

  it('POST /products com categoryId inválido → 400', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/products',
      headers: { authorization: `Bearer ${adminToken}` },
      payload: {
        name: 'Categoria fantasma',
        description: 'x',
        categoryId: 'nao-existe',
        brandId,
        species: 'DOG',
        price: 1000,
      },
    });
    expect(res.statusCode).toBe(400);
  });

  it('PATCH /products/:id como ADMIN atualiza preço', async () => {
    const created = await app.inject({
      method: 'POST',
      url: '/products',
      headers: { authorization: `Bearer ${adminToken}` },
      payload: {
        name: 'Patchable',
        slug: 'test-patchable',
        description: 'x',
        categoryId,
        brandId,
        species: 'CAT',
        price: 2000,
      },
    });
    const { id } = created.json() as { id: string };

    const patch = await app.inject({
      method: 'PATCH',
      url: `/products/${id}`,
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { price: 3500 },
    });
    expect(patch.statusCode).toBe(200);
    const body = patch.json() as { price: number };
    expect(body.price).toBe(3500);
  });

  it('PATCH sem campos → 400', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: '/products/qualquer-id',
      headers: { authorization: `Bearer ${adminToken}` },
      payload: {},
    });
    expect(res.statusCode).toBe(400);
  });

  it('DELETE /products/:id soft-deleta (não aparece mais para public)', async () => {
    const created = await app.inject({
      method: 'POST',
      url: '/products',
      headers: { authorization: `Bearer ${staffToken}` },
      payload: {
        name: 'Deletable',
        slug: 'test-deletable',
        description: 'x',
        categoryId,
        brandId,
        species: 'FISH',
        price: 990,
      },
    });
    const { id, slug } = created.json() as { id: string; slug: string };

    const del = await app.inject({
      method: 'DELETE',
      url: `/products/${id}`,
      headers: { authorization: `Bearer ${staffToken}` },
    });
    expect(del.statusCode).toBe(204);

    // Público não vê mais
    const pub = await app.inject({ method: 'GET', url: `/products/${slug}` });
    expect(pub.statusCode).toBe(404);

    // ADMIN ainda enxerga
    const admin = await app.inject({
      method: 'GET',
      url: `/products/${slug}`,
      headers: { authorization: `Bearer ${adminToken}` },
    });
    expect(admin.statusCode).toBe(200);
    const body = admin.json() as { active: boolean };
    expect(body.active).toBe(false);
  });

  // ---------------------------------------------------------------------------
  // GET /categories e /brands
  // ---------------------------------------------------------------------------

  it('GET /categories devolve lista com parentId', async () => {
    const res = await app.inject({ method: 'GET', url: '/categories' });
    expect(res.statusCode).toBe(200);
    const body = res.json() as { items: { slug: string; parentId: string | null }[] };
    expect(body.items.length).toBeGreaterThanOrEqual(4);
    expect(body.items.some((c) => c.parentId === null)).toBe(true);
    expect(body.items.some((c) => c.parentId !== null)).toBe(true);
  });

  it('GET /brands devolve lista em ordem alfabética', async () => {
    const res = await app.inject({ method: 'GET', url: '/brands' });
    expect(res.statusCode).toBe(200);
    const body = res.json() as { items: { name: string }[] };
    expect(body.items.length).toBeGreaterThanOrEqual(3);
    const names = body.items.map((b) => b.name);
    const sorted = [...names].sort((a, b) => a.localeCompare(b, 'pt-BR'));
    expect(names).toEqual(sorted);
  });
});
