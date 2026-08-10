import { ConflictError, NotFoundError, ValidationError } from '@/shared/errors';
import type { ProductRepository, ProductWithRelations } from './product.repository';
import type {
  CreateProductBody,
  ListQuery,
  ProductResponse,
  UpdateProductBody,
} from './product.schemas';

/**
 * Regras de negócio do catálogo de produtos.
 *
 * `opts.includeInactive` liga apenas para STAFF/ADMIN (o controller decide).
 * Rotas públicas SEMPRE passam `false`, garantindo que produtos soft-deleted
 * não vazem para o storefront.
 */
export class ProductService {
  constructor(private readonly repo: ProductRepository) {}

  async list(query: ListQuery, opts: { includeInactive: boolean }) {
    if (
      query.minPrice !== undefined &&
      query.maxPrice !== undefined &&
      query.minPrice > query.maxPrice
    ) {
      throw new ValidationError('minPrice não pode ser maior que maxPrice.');
    }

    const { items, total } = await this.repo.list(query, opts);
    return {
      items: items.map((p) => this.toResponse(p)),
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.ceil(total / query.limit),
    };
  }

  async findOne(idOrSlug: string, opts: { includeInactive: boolean }): Promise<ProductResponse> {
    const p = await this.repo.findByIdOrSlug(idOrSlug, opts);
    if (!p) throw new NotFoundError('Produto não encontrado.');
    return this.toResponse(p);
  }

  async create(input: CreateProductBody): Promise<ProductResponse> {
    // Referências devem existir
    if (!(await this.repo.categoryExists(input.categoryId))) {
      throw new ValidationError('Categoria informada não existe.', { field: 'categoryId' });
    }
    if (!(await this.repo.brandExists(input.brandId))) {
      throw new ValidationError('Marca informada não existe.', { field: 'brandId' });
    }

    const slug = input.slug ?? this.slugify(input.name);
    const dup = await this.repo.findBySlug(slug);
    if (dup) throw new ConflictError('Já existe um produto com este slug.');

    const created = await this.repo.create({
      name: input.name,
      slug,
      description: input.description,
      categoryId: input.categoryId,
      brandId: input.brandId,
      species: input.species,
      price: input.price,
      active: input.active,
      images: input.images,
      inventory: input.inventory,
    });
    return this.toResponse(created);
  }

  async update(id: string, input: UpdateProductBody): Promise<ProductResponse> {
    if (Object.keys(input).length === 0) {
      throw new ValidationError('Envie ao menos um campo para atualizar.');
    }
    if (!(await this.repo.exists(id))) {
      throw new NotFoundError('Produto não encontrado.');
    }
    if (input.categoryId !== undefined && !(await this.repo.categoryExists(input.categoryId))) {
      throw new ValidationError('Categoria informada não existe.', { field: 'categoryId' });
    }
    if (input.brandId !== undefined && !(await this.repo.brandExists(input.brandId))) {
      throw new ValidationError('Marca informada não existe.', { field: 'brandId' });
    }
    if (input.slug !== undefined) {
      const dup = await this.repo.findBySlug(input.slug);
      if (dup && dup.id !== id) {
        throw new ConflictError('Já existe outro produto com este slug.');
      }
    }
    const updated = await this.repo.update(id, input);
    return this.toResponse(updated);
  }

  async softDelete(id: string): Promise<void> {
    if (!(await this.repo.exists(id))) {
      throw new NotFoundError('Produto não encontrado.');
    }
    await this.repo.softDelete(id);
  }

  // ---------------------------------------------------------------------------
  // Utilitários
  // ---------------------------------------------------------------------------

  private slugify(input: string): string {
    return input
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 200);
  }

  private toResponse(p: ProductWithRelations): ProductResponse {
    const inventoryQty = p.inventory?.quantity ?? 0;
    const reserved = p.inventory?.reserved ?? 0;
    const available = inventoryQty - reserved > 0;

    return {
      id: p.id,
      slug: p.slug,
      name: p.name,
      description: p.description,
      price: p.price,
      species: p.species,
      active: p.active,
      available,
      category: p.category,
      brand: p.brand,
      images: p.images.map((img) => ({
        url: img.url,
        alt: img.alt,
        position: img.position,
      })),
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
    };
  }
}
