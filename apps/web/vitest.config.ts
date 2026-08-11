import { defineConfig } from 'vitest/config';
import path from 'node:path';

/**
 * Node environment por default. Specs que precisam de DOM setam
 * `// @vitest-environment jsdom` no topo do arquivo — evita pagar o custo
 * do jsdom em testes de funções puras.
 */
export default defineConfig({
  test: {
    globals: false,
    environment: 'node',
    include: ['src/**/*.{spec,test}.{ts,tsx}'],
    env: {
      NEXT_PUBLIC_API_URL: 'http://localhost:3333',
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
