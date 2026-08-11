import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'node:path';

/**
 * Node por default (funções puras rápidas). Specs de componente ativam jsdom
 * com `// @vitest-environment jsdom` no topo do arquivo — evita pagar o custo
 * do jsdom em testes de funções puras.
 */
export default defineConfig({
  plugins: [react()],
  test: {
    globals: false,
    environment: 'node',
    include: ['src/**/*.{spec,test}.{ts,tsx}'],
    setupFiles: ['./src/test/setup.ts'],
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
