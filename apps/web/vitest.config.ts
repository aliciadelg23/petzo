import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  test: {
    globals: false,
    environment: 'node',
    include: ['src/**/*.{spec,test}.ts'],
    // Placeholder: NEXT_PUBLIC_API_URL para não quebrar env.ts em import.
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
