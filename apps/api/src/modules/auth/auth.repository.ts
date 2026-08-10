import type { PrismaClient, User, Role, RefreshToken } from '@prisma/client';

export type UserWithRole = User & { role: Role };

export class AuthRepository {
  constructor(private readonly prisma: PrismaClient) {}

  findUserByEmail(email: string): Promise<UserWithRole | null> {
    return this.prisma.user.findUnique({
      where: { email },
      include: { role: true },
    });
  }

  findUserById(id: string): Promise<UserWithRole | null> {
    return this.prisma.user.findUnique({
      where: { id },
      include: { role: true },
    });
  }

  async createCustomer(input: {
    email: string;
    name: string;
    phone?: string;
    passwordHash: string;
  }): Promise<UserWithRole> {
    const customerRole = await this.prisma.role.findUniqueOrThrow({ where: { name: 'CUSTOMER' } });
    return this.prisma.user.create({
      data: {
        email: input.email,
        name: input.name,
        phone: input.phone,
        passwordHash: input.passwordHash,
        roleId: customerRole.id,
      },
      include: { role: true },
    });
  }

  createRefreshToken(input: {
    userId: string;
    tokenHash: string;
    expiresAt: Date;
    userAgent?: string;
    ip?: string;
  }): Promise<RefreshToken> {
    return this.prisma.refreshToken.create({
      data: {
        userId: input.userId,
        tokenHash: input.tokenHash,
        expiresAt: input.expiresAt,
        userAgent: input.userAgent,
        ip: input.ip,
      },
    });
  }

  findActiveRefreshToken(tokenHash: string): Promise<RefreshToken | null> {
    return this.prisma.refreshToken.findFirst({
      where: {
        tokenHash,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
    });
  }

  /**
   * Rotação: marca o antigo como revogado apontando para o novo (para detecção
   * de replay se alguém tentar reusar o antigo).
   */
  async rotateRefreshToken(input: {
    oldId: string;
    userId: string;
    newTokenHash: string;
    newExpiresAt: Date;
    userAgent?: string;
    ip?: string;
  }): Promise<RefreshToken> {
    return this.prisma.$transaction(async (tx) => {
      const created = await tx.refreshToken.create({
        data: {
          userId: input.userId,
          tokenHash: input.newTokenHash,
          expiresAt: input.newExpiresAt,
          userAgent: input.userAgent,
          ip: input.ip,
        },
      });
      await tx.refreshToken.update({
        where: { id: input.oldId },
        data: { revokedAt: new Date(), replacedById: created.id },
      });
      return created;
    });
  }

  revokeRefreshToken(id: string): Promise<RefreshToken> {
    return this.prisma.refreshToken.update({
      where: { id },
      data: { revokedAt: new Date() },
    });
  }

  /** Revoga TODOS os refresh tokens ativos de um user (útil em logout global). */
  async revokeAllRefreshTokensForUser(userId: string): Promise<number> {
    const result = await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return result.count;
  }
}
