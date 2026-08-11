/**
 * Integration test do auth. Requer Postgres up + seed rodado.
 *
 * Executar: `pnpm --filter @petzo/api test:integration`
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../../app';
import { prisma } from '../../shared/prisma';
import { REFRESH_COOKIE_NAME } from './auth.constants';

const NEW_USER = {
  email: `int-${Date.now()}@petzo.test`,
  password: 'Password!1',
  name: 'Integration User',
};

function extractRefreshCookie(setCookie: string | string[] | undefined): string | undefined {
  if (!setCookie) return undefined;
  const arr = Array.isArray(setCookie) ? setCookie : [setCookie];
  const found = arr.find((c) => c.startsWith(`${REFRESH_COOKIE_NAME}=`));
  if (!found) return undefined;
  const value = found.split(';')[0]?.split('=')[1];
  return value;
}

describe('auth / integração', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
    // limpa a poeira do user criado + refresh tokens dele
    await prisma.user.deleteMany({ where: { email: NEW_USER.email } });
    await prisma.$disconnect();
  });

  it('POST /auth/register cria usuário CUSTOMER e devolve access + cookie', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: NEW_USER,
    });

    expect(res.statusCode).toBe(201);
    const body = res.json() as {
      user: { id: string; email: string; role: string };
      accessToken: string;
      accessTokenExpiresIn: number;
    };
    expect(body.user.email).toBe(NEW_USER.email);
    expect(body.user.role).toBe('CUSTOMER');
    expect(body.accessToken).toMatch(/^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/);
    expect(body.accessTokenExpiresIn).toBe(15 * 60);
    expect(extractRefreshCookie(res.headers['set-cookie'])).toBeDefined();
  });

  it('registrar novamente o mesmo email retorna 409', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: NEW_USER,
    });
    expect(res.statusCode).toBe(409);
    const body = res.json() as { code: string };
    expect(body.code).toBe('CONFLICT');
  });

  it('senha fraca cai na validação Zod (400)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: {
        email: `weak-${Date.now()}@petzo.test`,
        password: 'weakpass',
        name: 'Weakly',
      },
    });
    expect(res.statusCode).toBe(400);
    const body = res.json() as { code: string };
    expect(body.code).toBe('VALIDATION_ERROR');
  });

  it('POST /auth/login com credenciais válidas devolve access + cookie', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email: NEW_USER.email, password: NEW_USER.password },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json() as { accessToken: string };
    expect(body.accessToken).toBeDefined();
    expect(extractRefreshCookie(res.headers['set-cookie'])).toBeDefined();
  });

  it('POST /auth/login com senha errada devolve 401 com mensagem genérica', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email: NEW_USER.email, password: 'WrongPass!1' },
    });
    expect(res.statusCode).toBe(401);
    const body = res.json() as { code: string; message: string };
    expect(body.code).toBe('UNAUTHORIZED');
    // não deve vazar se o email existe ou não
    expect(body.message).toMatch(/credenciais/i);
  });

  it('GET /auth/me com Bearer válido retorna o user', async () => {
    const login = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email: NEW_USER.email, password: NEW_USER.password },
    });
    const { accessToken } = login.json() as { accessToken: string };

    const me = await app.inject({
      method: 'GET',
      url: '/auth/me',
      headers: { authorization: `Bearer ${accessToken}` },
    });

    expect(me.statusCode).toBe(200);
    const body = me.json() as { email: string; role: string };
    expect(body.email).toBe(NEW_USER.email);
    expect(body.role).toBe('CUSTOMER');
  });

  it('GET /auth/me sem token → 401', async () => {
    const res = await app.inject({ method: 'GET', url: '/auth/me' });
    expect(res.statusCode).toBe(401);
  });

  it('POST /auth/refresh rotaciona: novo access + novo cookie; o antigo é revogado', async () => {
    const login = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email: NEW_USER.email, password: NEW_USER.password },
    });
    const oldCookie = extractRefreshCookie(login.headers['set-cookie'])!;

    const first = await app.inject({
      method: 'POST',
      url: '/auth/refresh',
      cookies: { [REFRESH_COOKIE_NAME]: oldCookie },
    });
    expect(first.statusCode).toBe(200);
    const newCookie = extractRefreshCookie(first.headers['set-cookie'])!;
    expect(newCookie).toBeDefined();
    expect(newCookie).not.toBe(oldCookie);

    // reutilizar o antigo agora deve falhar (revogado durante a rotação)
    const replay = await app.inject({
      method: 'POST',
      url: '/auth/refresh',
      cookies: { [REFRESH_COOKIE_NAME]: oldCookie },
    });
    expect(replay.statusCode).toBe(401);
  });

  it('POST /auth/logout revoga o cookie e responde 204', async () => {
    const login = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email: NEW_USER.email, password: NEW_USER.password },
    });
    const cookie = extractRefreshCookie(login.headers['set-cookie'])!;

    const logout = await app.inject({
      method: 'POST',
      url: '/auth/logout',
      cookies: { [REFRESH_COOKIE_NAME]: cookie },
    });
    expect(logout.statusCode).toBe(204);

    // O cookie foi invalidado — não deve refresh
    const post = await app.inject({
      method: 'POST',
      url: '/auth/refresh',
      cookies: { [REFRESH_COOKIE_NAME]: cookie },
    });
    expect(post.statusCode).toBe(401);
  });
});
