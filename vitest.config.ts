import { defineConfig } from 'vitest/config';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@primedex/core': fileURLToPath(new URL('./packages/core/src', import.meta.url)),
      'server-only': fileURLToPath(new URL('./node_modules/server-only/empty.js', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    include: [
      'src/**/*.test.ts',
      'packages/core/src/**/*.test.ts',
    ],
  },
});
