import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    exclude: ['**/node_modules/**', '**/.claude/worktrees/**', '**/.hatch-runs/**', 'supabase/functions/**'],
  },
  resolve: {
    // Resolve `@/...` exactly like the Next.js build: to the web sources.
    // Redirecting shared-module specifiers at @primedex/core made tests pass
    // against code that never ships to the browser while the web copies
    // drifted ahead; both trees still exist, so tests must follow the build.
    alias: [{ find: /^@\/(.*)$/, replacement: path.resolve(__dirname, './src/$1') }],
  },
});
