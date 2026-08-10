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
        version: '0.0.0',
      },
      servers: [{ url: 'http://localhost:3333', description: 'local' }],
      tags: [{ name: 'health', description: 'Liveness/readiness da API' }],
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
