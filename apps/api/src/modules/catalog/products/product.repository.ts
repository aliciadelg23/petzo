import type { Prisma, PrismaClient, Product, Species } from '@prisma/client';
import type { ListQuery, Sort } from './product.schemas';

const RELATIONS = {
  category: { select: { id: true, name: true, slug: true } },
  brand: { select: { id: true, name: true, slug: true } },
  images: { orderBy: { position: 'asc' } as const, select: { url: true, alt: true, position: true } },
  inventory: { select: { quantity: true, reserved: true } },
} satisfies Prisma.ProductInclude;

export type ProductWithRelations = Prisma.ProductGetPayload<{ include: typeof RELATIONS }>;

export class ProductRepository {
  constructor(private readonly prisma: PrismaClient) {}

  private buildWhere(q: ListQuery, opts: { includeInactive: boolean }): Prisma.ProductWhereInput {
    const where: Prisma.ProductWhereInput = {};
    if (!opts.includeInactive) where.active = true;

    if (q.search) {
      where.OR = [
        { name: { contains: q.search, mode: 'insensitive' } },
        { description: { contains: q.search, mode: 'insensitive' } },
      ];
    }
    if (q.category) where.category = { slug: q.category };
    if (q.brand) where.brand = { slug: q.brand };
    if (q.species) where.species = q.species as Species;
    if (q.minPrice !== undefined || q.maxPrice !== undefined) {
      where.price = {
        ...(q.minPrice !== undefined ? { gte: q.minPrice } : {}),
        ...(q.maxPrice !== undefined ? { lte: q.maxPrice } : {}),
      };
    }
    if (q.available === true) {
      where.inventory = { quantity: { gt: 0 } };
    }
    return where;
  }

  private buildOrderBy(sort: Sort): Prisma.ProductOrderByWithRelationInput {
    switch (sort) {
      case 'price_asc':
        return { price: 'asc' };
      case 'price_desc':
        return { price: 'desc' };
      case 'name_asc':
        return { name: 'asc' };
      case 'name_desc':
        return { name: 'desc' };
      case 'oldest':
        return { createdAt: 'asc' };
      case 'newest':
      default:
        return { createdAt: 'desc' };
    }
  }

  async list(
    q: ListQuery,
    opts: { includeInactive: boolean },
  ): Promise<{ items: ProductWithRelations[]; total: number }> {
    const where = this.buildWhere(q, opts);
    const [items, total] = await this.prisma.$transaction([
      this.prisma.product.findMany({
        where,
        orderBy: this.buildOrderBy(q.sort),
        skip: (q.page - 1) * q.limit,
        take: q.limit,
        include: RELATIONS,
      }),
      this.prisma.product.count({ where }),
    ]);
    return { items, total };
  }

  findByIdOrSlug(
    idOrSlug: string,
    opts: { includeInactive: boolean },
  ): Promise<ProductWithRelations | null> {
    return this.prisma.product.findFirst({
      where: {
        AND: [
          opts.includeInactive ? {} : { active: true },
          { OR: [{ id: idOrSlug }, { slug: idOrSlug }] },
        ],
      },
      include: RELATIONS,
    });
  }

  async create(input: {
    name: string;
    slug: string;
    description: string;
    categoryId: string;
    brandId: string;
    species: Species;
    price: number;
    active: boolean;
    images: { url: string; alt: string; position: number }[];
    inventory: { quantity: number; reorderPoint: number };
  }): Promise<ProductWithRelations> {
    return this.prisma.product.create({
      data: {
        name: input.name,
        slug: input.slug,
        description: input.description,
        categoryId: input.categoryId,
        brandId: input.brandId,
        species: input.species,
        price: input.price,
        active: input.active,
        images: { create: input.images },
        inventory: { create: input.inventory },
      },
      include: RELATIONS,
    });
  }

  update(
    id: string,
    data: Partial<Pick<Product, 'name' | 'slug' | 'description' | 'categoryId' | 'brandId' | 'species' | 'price' | 'active'>>,
  ): Promise<ProductWithRelations> {
    return this.prisma.product.update({
      where: { id },
      data,
      include: RELATIONS,
    });
  }

  softDelete(id: string): Promise<Product> {
    return this.prisma.product.update({ where: { id }, data: { active: false } });
  }

  // Estes três só querem saber "existe?" — projetamos apenas a PK para
  // evitar transferir todas as colunas em cada write. Ganho micro mas
  // gratuito (é literalmente 1 palavra `select`).
  exists(id: string): Promise<boolean> {
    return this.prisma.product
      .findUnique({ where: { id }, select: { id: true } })
      .then((p) => p !== null);
  }

  categoryExists(id: string): Promise<boolean> {
    return this.prisma.category
      .findUnique({ where: { id }, select: { id: true } })
      .then((c) => c !== null);
  }

  brandExists(id: string): Promise<boolean> {
    return this.prisma.brand
      .findUnique({ where: { id }, select: { id: true } })
      .then((b) => b !== null);
  }

  findBySlug(slug: string): Promise<Product | null> {
    return this.prisma.product.findUnique({ where: { slug } });
  }
}
