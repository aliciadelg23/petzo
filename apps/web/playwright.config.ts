import { defineConfig, devices } from '@playwright/test';

/**
 * Configuração Playwright.
 *
 * Estratégia:
 * - `webServer` do Playwright inicia API + Web ANTES dos testes rodarem.
 * - Testes assumem que a DB do Postgres já foi resetada + seed rodado (o
 *   script pnpm test:e2e cuida disso).
 * - Chromium only — cobre a maioria dos comportamentos; adicionar Firefox
 *   e WebKit é trivial mas encarece o CI.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false, // pedidos criam ordens no DB — serial evita conflito
  workers: 1,
  timeout: 30_000,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    actionTimeout: 10_000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: [
    {
      // API — assume DB já preparada
      command: 'cd ../api && node dist/server.js',
      url: 'http://localhost:3333/health',
      timeout: 30_000,
      reuseExistingServer: !process.env.CI,
      env: {
        NODE_ENV: 'development',
        API_PORT: '3333',
        LOG_LEVEL: 'error',
        DATABASE_URL: 'postgresql://petzo:petzo@localhost:5433/petzo',
      },
    },
    {
      command: 'pnpm start',
      url: 'http://localhost:3000',
      timeout: 60_000,
      reuseExistingServer: !process.env.CI,
      env: {
        NEXT_PUBLIC_API_URL: 'http://localhost:3333',
      },
    },
  ],
});
