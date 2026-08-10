import type { FastifyReply, FastifyRequest } from 'fastify';
import type { AuthService } from './auth.service';
import type { LoginBody, RegisterBody } from './auth.schemas';
import {
  REFRESH_COOKIE_NAME,
  REFRESH_COOKIE_PATH,
  REFRESH_TOKEN_TTL_SECONDS,
} from './auth.constants';
import { UnauthorizedError } from '@/shared/errors';
import { env } from '@/config/env';

/**
 * Adapta request/reply → service. Aqui vive TODO o toque em cookies —
 * o service não sabe nem se importa que o refresh viaja por cookie.
 */
export class AuthController {
  constructor(private readonly service: AuthService) {}

  private cookieOptions() {
    return {
      httpOnly: true,
      sameSite: 'lax' as const,
      secure: env.NODE_ENV === 'production',
      path: REFRESH_COOKIE_PATH,
      maxAge: REFRESH_TOKEN_TTL_SECONDS,
    };
  }

  private setRefreshCookie(reply: FastifyReply, token: string) {
    reply.setCookie(REFRESH_COOKIE_NAME, token, this.cookieOptions());
  }

  private clearRefreshCookie(reply: FastifyReply) {
    reply.clearCookie(REFRESH_COOKIE_NAME, { path: REFRESH_COOKIE_PATH });
  }

  private ctx(request: FastifyRequest) {
    return {
      userAgent: request.headers['user-agent']?.slice(0, 500),
      ip: request.ip,
    };
  }

  register = async (
    request: FastifyRequest<{ Body: RegisterBody }>,
    reply: FastifyReply,
  ) => {
    const result = await this.service.register(request.body, this.ctx(request));
    this.setRefreshCookie(reply, result.refreshToken);
    return reply.status(201).send({
      user: result.user,
      accessToken: result.accessToken,
      accessTokenExpiresIn: result.accessTokenExpiresIn,
    });
  };

  login = async (request: FastifyRequest<{ Body: LoginBody }>, reply: FastifyReply) => {
    const result = await this.service.login(request.body, this.ctx(request));
    this.setRefreshCookie(reply, result.refreshToken);
    return reply.status(200).send({
      user: result.user,
      accessToken: result.accessToken,
      accessTokenExpiresIn: result.accessTokenExpiresIn,
    });
  };

  refresh = async (request: FastifyRequest, reply: FastifyReply) => {
    const cookie = request.cookies[REFRESH_COOKIE_NAME];
    if (!cookie) throw new UnauthorizedError('Cookie de refresh ausente.');

    const result = await this.service.refresh(cookie, this.ctx(request));
    this.setRefreshCookie(reply, result.refreshToken);
    return reply.status(200).send({
      user: result.user,
      accessToken: result.accessToken,
      accessTokenExpiresIn: result.accessTokenExpiresIn,
    });
  };

  logout = async (request: FastifyRequest, reply: FastifyReply) => {
    const cookie = request.cookies[REFRESH_COOKIE_NAME];
    await this.service.logout(cookie);
    this.clearRefreshCookie(reply);
    return reply.status(204).send();
  };

  me = async (request: FastifyRequest, reply: FastifyReply) => {
    if (!request.currentUser) throw new UnauthorizedError('Não autenticado.');
    const user = await this.service.me(request.currentUser.sub);
    return reply.status(200).send(user);
  };
}
