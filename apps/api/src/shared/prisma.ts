import { PrismaClient } from '@prisma/client';
import { env } from '@/config/env';

/**
 * Singleton do PrismaClient.
 *
 * - Compartilhado por todos os repositories da API.
 * - Em testes, o hot-reload do Vitest re-importa o módulo várias vezes; usamos
 *   `globalThis` para não vazar conexões.
 * - `shutdown()` é registrado uma única vez para evitar warning de "max listeners".
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      env.LOG_LEVEL === 'debug' || env.LOG_LEVEL === 'trace'
        ? ['query', 'info', 'warn', 'error']
        : ['warn', 'error'],
  });

if (env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

const registered = globalThis as unknown as { __petzoShutdownRegistered?: boolean };
if (!registered.__petzoShutdownRegistered) {
  registered.__petzoShutdownRegistered = true;
  const shutdown = async () => {
    await prisma.$disconnect();
  };
  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);
}
