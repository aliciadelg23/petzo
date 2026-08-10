import { describe, expect, it, afterEach, beforeEach } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../../app';

describe('health module', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    app = await buildApp();
    await app.ready();
  });

  afterEach(async () => {
    await app.close();
  });

  it('GET /health responde 200 com { status: "ok" }', async () => {
    const res = await app.inject({ method: 'GET', url: '/health' });

    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toContain('application/json');
    expect(res.json()).toEqual({ status: 'ok' });
  });

  it('rota inexistente retorna 404 no formato padronizado', async () => {
    const res = await app.inject({ method: 'GET', url: '/rota-que-nao-existe' });

    expect(res.statusCode).toBe(404);
    const body = res.json() as { code: string; message: string; requestId: string };
    expect(body.code).toBe('NOT_FOUND');
    expect(body.message).toMatch(/rota não encontrada/i);
    expect(typeof body.requestId).toBe('string');
  });

  it('OpenAPI JSON está disponível em /docs/json', async () => {
    const res = await app.inject({ method: 'GET', url: '/docs/json' });

    expect(res.statusCode).toBe(200);
    const doc = res.json() as { openapi: string; paths: Record<string, unknown> };
    expect(doc.openapi).toMatch(/^3\./);
    expect(doc.paths['/health']).toBeDefined();
  });
});
