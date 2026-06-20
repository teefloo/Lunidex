import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

const core = (p: string) => path.resolve(__dirname, `./packages/core/src/${p}`);

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
  },
  resolve: {
    // Mirror the tsconfig path mapping so `@/...` imports that now live in the
    // shared @primedex/core package still resolve under Vitest. Specific rules
    // must precede the generic `@/*` fallback (first match wins).
    alias: [
      { find: /^@\/types\/(.*)$/, replacement: core('types/$1') },
      { find: /^@\/store\/(.*)$/, replacement: core('store/$1') },
      { find: /^@\/lib\/api$/, replacement: core('api/index') },
      { find: /^@\/lib\/api\/(.*)$/, replacement: core('api/$1') },
      { find: /^@\/lib\/i18n\/(.*)$/, replacement: core('i18n/$1') },
      { find: /^@\/lib\/supabase\/(.*)$/, replacement: core('supabase/$1') },
      {
        find: /^@\/lib\/(languages|utils|pokemon-utils|team-analysis|auto-complete|badges|tcg-rarity)$/,
        replacement: core('lib/$1'),
      },
      { find: /^@\/(.*)$/, replacement: path.resolve(__dirname, './src/$1') },
    ],
  },
});
