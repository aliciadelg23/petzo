/**
 * Integration test — REQUER Postgres em pé com migrations aplicadas e seed rodado.
 *
 * Executar:
 *   pnpm --filter @petzo/api docker:up
 *   pnpm --filter @petzo/api db:migrate:dev
 *   pnpm --filter @petzo/api db:seed
 *   pnpm --filter @petzo/api test:integration
 *
 * Excluído do `pnpm test` (unit) via config do vitest.
 */
import { describe, it, expect, afterAll } from 'vitest';
import { prisma } from './prisma';

describe('prisma / integração com Postgres', () => {
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('conecta e executa SELECT 1', async () => {
    const rows = await prisma.$queryRaw<{ ok: number }[]>`SELECT 1::int AS ok`;
    expect(rows[0]?.ok).toBe(1);
  });

  it('seed populou as tabelas base', async () => {
    const [roles, users, categories, brands, products, inventory] = await Promise.all([
      prisma.role.count(),
      prisma.user.count(),
      prisma.category.count(),
      prisma.brand.count(),
      prisma.product.count(),
      prisma.inventory.count(),
    ]);

    expect(roles).toBeGreaterThanOrEqual(3);
    expect(users).toBeGreaterThanOrEqual(3);
    expect(categories).toBeGreaterThanOrEqual(4);
    expect(brands).toBeGreaterThanOrEqual(3);
    expect(products).toBeGreaterThanOrEqual(5);
    expect(inventory).toBe(products);
  });

  it('unique constraint em Product.slug rejeita duplicata', async () => {
    const existing = await prisma.product.findFirstOrThrow();
    await expect(
      prisma.product.create({
        data: {
          slug: existing.slug,
          name: 'duplicado',
          description: 'x',
          categoryId: existing.categoryId,
          brandId: existing.brandId,
          species: existing.species,
          price: 100,
        },
      }),
    ).rejects.toThrow();
  });

  it('cascade delete: apagar User remove Pets e Cart', async () => {
    // cria um user descartável, associa pet + cart, apaga user e verifica
    const role = await prisma.role.findFirstOrThrow({ where: { name: 'CUSTOMER' } });
    const throwaway = await prisma.user.create({
      data: {
        email: `throwaway-${Date.now()}@petzo.test`,
        passwordHash: 'x',
        name: 'Descartável',
        roleId: role.id,
      },
    });
    const pet = await prisma.pet.create({
      data: { userId: throwaway.id, name: 'Temp', species: 'DOG' },
    });
    const cart = await prisma.cart.create({ data: { userId: throwaway.id } });

    await prisma.user.delete({ where: { id: throwaway.id } });

    expect(await prisma.pet.findUnique({ where: { id: pet.id } })).toBeNull();
    expect(await prisma.cart.findUnique({ where: { id: cart.id } })).toBeNull();
  });

  it('OrderItem preserva snapshot mesmo se o preço do Product mudar', async () => {
    const order = await prisma.order.findFirstOrThrow({ include: { items: true } });
    const item = order.items[0];
    expect(item).toBeDefined();
    if (!item) return;

    const product = await prisma.product.findUniqueOrThrow({ where: { id: item.productId } });

    // O snapshot é imutável — mesmo se atualizarmos o preço do produto, o item permanece
    await prisma.product.update({
      where: { id: product.id },
      data: { price: product.price + 999_99 },
    });

    const reloaded = await prisma.orderItem.findUniqueOrThrow({ where: { id: item.id } });
    expect(reloaded.priceSnapshot).toBe(item.priceSnapshot);

    // restaura o preço para não poluir o estado
    await prisma.product.update({ where: { id: product.id }, data: { price: product.price } });
  });
});
