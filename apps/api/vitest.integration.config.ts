import { defineConfig } from 'vitest/config';
import path from 'node:path';

/**
 * Runner só para testes de integração (dependem de Postgres up + seed).
 * Uso: `pnpm test:integration`
 */
export default defineConfig({
  test: {
    globals: false,
    environment: 'node',
    include: ['src/**/*.integration.spec.ts'],
    testTimeout: 15_000,
    hookTimeout: 15_000,
    // Integration tests compartilham o Postgres — rodar 1 arquivo por vez
    // evita corrida em contadores de estoque, cart entre specs, etc.
    fileParallelism: false,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
