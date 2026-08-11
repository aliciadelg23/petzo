import path from 'node:path';
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  typedRoutes: true,
  // Empacota apenas o necessário para rodar em produção (imagem Docker slim).
  // Gera .next/standalone com server.js + node_modules mínimo.
  output: 'standalone',
  // Como estamos em um monorepo pnpm, o file-tracing do Next precisa apontar
  // para a raiz do workspace — caso contrário deps hoisted ficam de fora.
  outputFileTracingRoot: path.join(import.meta.dirname, '../../'),
};

export default nextConfig;
