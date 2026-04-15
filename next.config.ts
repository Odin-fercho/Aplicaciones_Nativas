import type { NextConfig } from 'next';

/**
 * CORS para la app en https://go.odenix.shop → `src/middleware.ts` (matcher `/api/*`).
 * Orígenes extra: variable `CORS_ALLOWED_ORIGINS` (lista separada por comas).
 */
const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: 'standalone',
};

export default nextConfig;
