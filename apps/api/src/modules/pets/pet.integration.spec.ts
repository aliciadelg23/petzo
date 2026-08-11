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

describe('pets / integração', () => {
  let app: FastifyInstance;
  let aliceToken: string;
  let brunoToken: string;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
    [aliceToken, brunoToken] = await Promise.all([
      loginAs(app, 'alice.dev@petzo.test'),
      loginAs(app, 'bruno.dev@petzo.test'),
    ]);
  });

  afterAll(async () => {
    // Limpa pets criados nos testes
    await prisma.pet.deleteMany({ where: { name: { startsWith: 'test-' } } });
    await app.close();
    await prisma.$disconnect();
  });

  it('sem auth → 401 em todos os endpoints', async () => {
    expect((await app.inject({ method: 'GET', url: '/pets' })).statusCode).toBe(401);
    expect(
      (await app.inject({ method: 'POST', url: '/pets', payload: {} })).statusCode,
    ).toBe(401);
    expect(
      (await app.inject({ method: 'PATCH', url: '/pets/x', payload: {} })).statusCode,
    ).toBe(401);
    expect((await app.inject({ method: 'DELETE', url: '/pets/x' })).statusCode).toBe(401);
  });

  it('POST /pets cria pet do usuário e GET lista somente os DELE', async () => {
    const create = await app.inject({
      method: 'POST',
      url: '/pets',
      headers: { authorization: `Bearer ${aliceToken}` },
      payload: { name: 'test-Rex', species: 'DOG', breed: 'Vira-lata' },
    });
    expect(create.statusCode).toBe(201);
    const body = create.json() as { id: string; name: string; species: string };
    expect(body.name).toBe('test-Rex');
    expect(body.species).toBe('DOG');

    const listA = await app.inject({
      method: 'GET',
      url: '/pets',
      headers: { authorization: `Bearer ${aliceToken}` },
    });
    const aliceItems = (listA.json() as { items: { id: string; name: string }[] }).items;
    expect(aliceItems.some((p) => p.name === 'test-Rex')).toBe(true);

    // Bruno NÃO vê o pet da Alice
    const listB = await app.inject({
      method: 'GET',
      url: '/pets',
      headers: { authorization: `Bearer ${brunoToken}` },
    });
    const brunoItems = (listB.json() as { items: { name: string }[] }).items;
    expect(brunoItems.some((p) => p.name === 'test-Rex')).toBe(false);
  });

  it('PATCH e DELETE em pet alheio → 404 (não vaza existência)', async () => {
    const create = await app.inject({
      method: 'POST',
      url: '/pets',
      headers: { authorization: `Bearer ${aliceToken}` },
      payload: { name: 'test-Alheio', species: 'CAT' },
    });
    const { id } = create.json() as { id: string };

    const patch = await app.inject({
      method: 'PATCH',
      url: `/pets/${id}`,
      headers: { authorization: `Bearer ${brunoToken}` },
      payload: { name: 'sequestrado' },
    });
    expect(patch.statusCode).toBe(404);

    const del = await app.inject({
      method: 'DELETE',
      url: `/pets/${id}`,
      headers: { authorization: `Bearer ${brunoToken}` },
    });
    expect(del.statusCode).toBe(404);
  });

  it('PATCH do próprio pet: atualização parcial preserva campos', async () => {
    const create = await app.inject({
      method: 'POST',
      url: '/pets',
      headers: { authorization: `Bearer ${aliceToken}` },
      payload: { name: 'test-Luna', species: 'DOG', breed: 'Golden' },
    });
    const { id } = create.json() as { id: string };

    const patch = await app.inject({
      method: 'PATCH',
      url: `/pets/${id}`,
      headers: { authorization: `Bearer ${aliceToken}` },
      payload: { breed: 'Golden Retriever' },
    });
    expect(patch.statusCode).toBe(200);
    const body = patch.json() as { name: string; species: string; breed: string };
    expect(body.name).toBe('test-Luna'); // preserva
    expect(body.species).toBe('DOG'); // preserva
    expect(body.breed).toBe('Golden Retriever');
  });

  it('DELETE do próprio pet: 204 + some da listagem', async () => {
    const create = await app.inject({
      method: 'POST',
      url: '/pets',
      headers: { authorization: `Bearer ${aliceToken}` },
      payload: { name: 'test-Delete', species: 'BIRD' },
    });
    const { id } = create.json() as { id: string };

    const del = await app.inject({
      method: 'DELETE',
      url: `/pets/${id}`,
      headers: { authorization: `Bearer ${aliceToken}` },
    });
    expect(del.statusCode).toBe(204);

    const list = await app.inject({
      method: 'GET',
      url: '/pets',
      headers: { authorization: `Bearer ${aliceToken}` },
    });
    const items = (list.json() as { items: { id: string }[] }).items;
    expect(items.some((p) => p.id === id)).toBe(false);
  });

  it('validação: species inválida → 400', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/pets',
      headers: { authorization: `Bearer ${aliceToken}` },
      payload: { name: 'X', species: 'DRAGON' },
    });
    expect(res.statusCode).toBe(400);
  });
});
