import type { FastifyInstance } from 'fastify';
import { productRoutes } from './products/product.routes';
import { categoryRoutes } from './categories/category.routes';
import { brandRoutes } from './brands/brand.routes';

/**
 * Barrel do bounded context "catalog".
 * Registra products, categories e brands na mesma raiz.
 */
export async function catalogRoutes(app: FastifyInstance) {
  await app.register(productRoutes);
  await app.register(categoryRoutes);
  await app.register(brandRoutes);
}
