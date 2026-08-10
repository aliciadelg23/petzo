import { createHash, randomBytes } from 'node:crypto';
import argon2 from 'argon2';
import type { FastifyInstance } from 'fastify';
import { ConflictError, UnauthorizedError } from '@/shared/errors';
import type { RoleName } from '@prisma/client';
import { AuthRepository, type UserWithRole } from './auth.repository';
import type { LoginBody, PublicUser, RegisterBody } from './auth.schemas';
import {
  ACCESS_TOKEN_TTL_SECONDS,
  REFRESH_TOKEN_BYTES,
  REFRESH_TOKEN_TTL_SECONDS,
} from './auth.constants';

export interface AccessTokenPayload {
  sub: string;
  role: RoleName;
  email: string;
}

export class AuthService {
  constructor(
    private readonly repo: AuthRepository,
    private readonly app: FastifyInstance,
  ) {}

  // ---------------------------------------------------------------------------
  // Hashing
  // ---------------------------------------------------------------------------

  private hashPassword(plain: string): Promise<string> {
    return argon2.hash(plain, { type: argon2.argon2id });
  }

  private verifyPassword(hash: string, plain: string): Promise<boolean> {
    return argon2.verify(hash, plain);
  }

  // ---------------------------------------------------------------------------
  // Tokens
  // ---------------------------------------------------------------------------

  private signAccessToken(user: UserWithRole): string {
    const payload: AccessTokenPayload = {
      sub: user.id,
      role: user.role.name,
      email: user.email,
    };
    return this.app.jwt.sign(payload, { expiresIn: ACCESS_TOKEN_TTL_SECONDS });
  }

  private generateRefreshToken(): { token: string; hash: string; expiresAt: Date } {
    const token = randomBytes(REFRESH_TOKEN_BYTES).toString('base64url');
    const hash = createHash('sha256').update(token).digest('hex');
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_SECONDS * 1000);
    return { token, hash, expiresAt };
  }

  private hashRefreshToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  // ---------------------------------------------------------------------------
  // Mappers
  // ---------------------------------------------------------------------------

  private toPublicUser(user: UserWithRole): PublicUser {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      phone: user.phone,
      role: user.role.name,
      emailVerifiedAt: user.emailVerifiedAt?.toISOString() ?? null,
      createdAt: user.createdAt.toISOString(),
    };
  }

  // ---------------------------------------------------------------------------
  // Casos de uso
  // ---------------------------------------------------------------------------

  async register(input: RegisterBody, ctx: { userAgent?: string; ip?: string }) {
    const existing = await this.repo.findUserByEmail(input.email);
    if (existing) {
      throw new ConflictError('Email já cadastrado.');
    }

    const passwordHash = await this.hashPassword(input.password);
    const user = await this.repo.createCustomer({
      email: input.email,
      name: input.name,
      phone: input.phone,
      passwordHash,
    });

    const accessToken = this.signAccessToken(user);
    const refresh = this.generateRefreshToken();
    await this.repo.createRefreshToken({
      userId: user.id,
      tokenHash: refresh.hash,
      expiresAt: refresh.expiresAt,
      userAgent: ctx.userAgent,
      ip: ctx.ip,
    });

    return {
      user: this.toPublicUser(user),
      accessToken,
      refreshToken: refresh.token,
      accessTokenExpiresIn: ACCESS_TOKEN_TTL_SECONDS,
    };
  }

  async login(input: LoginBody, ctx: { userAgent?: string; ip?: string }) {
    const user = await this.repo.findUserByEmail(input.email);
    // Mensagem genérica evita enumeração de usuários
    if (!user) throw new UnauthorizedError('Credenciais inválidas.');

    const ok = await this.verifyPassword(user.passwordHash, input.password);
    if (!ok) throw new UnauthorizedError('Credenciais inválidas.');

    const accessToken = this.signAccessToken(user);
    const refresh = this.generateRefreshToken();
    await this.repo.createRefreshToken({
      userId: user.id,
      tokenHash: refresh.hash,
      expiresAt: refresh.expiresAt,
      userAgent: ctx.userAgent,
      ip: ctx.ip,
    });

    return {
      user: this.toPublicUser(user),
      accessToken,
      refreshToken: refresh.token,
      accessTokenExpiresIn: ACCESS_TOKEN_TTL_SECONDS,
    };
  }

  async refresh(refreshToken: string, ctx: { userAgent?: string; ip?: string }) {
    const hash = this.hashRefreshToken(refreshToken);
    const stored = await this.repo.findActiveRefreshToken(hash);
    if (!stored) throw new UnauthorizedError('Refresh token inválido ou expirado.');

    const user = await this.repo.findUserById(stored.userId);
    if (!user) throw new UnauthorizedError('Usuário não encontrado.');

    const next = this.generateRefreshToken();
    await this.repo.rotateRefreshToken({
      oldId: stored.id,
      userId: user.id,
      newTokenHash: next.hash,
      newExpiresAt: next.expiresAt,
      userAgent: ctx.userAgent,
      ip: ctx.ip,
    });

    const accessToken = this.signAccessToken(user);
    return {
      user: this.toPublicUser(user),
      accessToken,
      refreshToken: next.token,
      accessTokenExpiresIn: ACCESS_TOKEN_TTL_SECONDS,
    };
  }

  async logout(refreshToken: string | undefined): Promise<void> {
    if (!refreshToken) return;
    const hash = this.hashRefreshToken(refreshToken);
    const stored = await this.repo.findActiveRefreshToken(hash);
    if (stored) {
      await this.repo.revokeRefreshToken(stored.id);
    }
  }

  async me(userId: string): Promise<PublicUser> {
    const user = await this.repo.findUserById(userId);
    if (!user) throw new UnauthorizedError('Usuário não encontrado.');
    return this.toPublicUser(user);
  }
}
