import type { FastifyInstance } from 'fastify';
import { healthRoutes } from './health/health.routes';
import { authRoutes } from './auth/auth.routes';
import { catalogRoutes } from './catalog';
import { cartRoutes } from './cart/cart.routes';
import { orderRoutes } from './orders/order.routes';
import { recommendationRoutes } from './recommendations/recommendation.routes';
import { adminRoutes } from './admin/admin.routes';
import { petRoutes } from './pets/pet.routes';
import { wishlistRoutes } from './wishlist/wishlist.routes';

/**
 * Registra todos os módulos de domínio da API.
 */
export async function registerModules(app: FastifyInstance) {
  await app.register(healthRoutes);
  await app.register(authRoutes);
  await app.register(catalogRoutes);
  await app.register(cartRoutes);
  await app.register(orderRoutes);
  await app.register(recommendationRoutes);
  await app.register(adminRoutes);
  await app.register(petRoutes);
  await app.register(wishlistRoutes);
}
