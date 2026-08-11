import type { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import fastifySwagger from '@fastify/swagger';
import fastifySwaggerUi from '@fastify/swagger-ui';
import { jsonSchemaTransform } from 'fastify-type-provider-zod';

/**
 * OpenAPI 3.1 gerado a partir dos schemas Zod anexados às rotas.
 *
 * - JSON cru:  GET /docs/json
 * - Swagger UI: GET /docs
 */
async function swaggerPlugin(app: FastifyInstance) {
  await app.register(fastifySwagger, {
    openapi: {
      openapi: '3.1.0',
      info: {
        title: 'Petzo API',
        description: 'API REST do Petzo — e-commerce de produtos para pets.',
        version: '1.0.3',
      },
      servers: [{ url: 'http://localhost:3333', description: 'local' }],
      tags: [
        { name: 'health', description: 'Liveness/readiness da API' },
        { name: 'auth', description: 'Registro, login, refresh, logout, /me' },
        { name: 'products', description: 'Catálogo de produtos (leitura pública; escrita STAFF/ADMIN)' },
        { name: 'categories', description: 'Categorias do catálogo (leitura pública)' },
        { name: 'brands', description: 'Marcas do catálogo (leitura pública)' },
        { name: 'cart', description: 'Carrinho do usuário autenticado' },
        { name: 'orders', description: 'Pedidos do usuário autenticado + checkout' },
        {
          name: 'recommendations',
          description:
            'Recomendações comerciais por pet — determinísticas (regras). Nunca médicas.',
        },
        { name: 'admin', description: 'Painel administrativo (STAFF/ADMIN)' },
        { name: 'pets', description: 'CRUD de pets do usuário autenticado' },
        { name: 'wishlist', description: 'Wishlist (favoritos) do usuário autenticado' },
        { name: 'reviews', description: 'Reviews de produtos (compra prévia obrigatória)' },
        { name: 'coupons', description: 'Validação (auth) + gestão admin de cupons' },
        { name: 'subscriptions', description: 'Assinaturas recorrentes (sem cobrança real)' },
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
          },
        },
      },
    },
    transform: jsonSchemaTransform,
  });

  await app.register(fastifySwaggerUi, {
    routePrefix: '/docs',
    uiConfig: { docExpansion: 'list', deepLinking: false },
    staticCSP: true,
  });
}

export default fp(swaggerPlugin, { name: 'swagger' });
