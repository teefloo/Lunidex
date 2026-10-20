import { defineConfig } from '@playwright/test';

const externalBaseUrl = process.env.E2E_BASE_URL;
const customCollectionsE2E = process.env.E2E_CUSTOM_COLLECTIONS === '1';
const investmentsE2E = process.env.E2E_INVESTMENTS === '1';
const localPort = investmentsE2E ? 3001 : 3000;

export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.spec.ts',
  timeout: 60_000,
  expect: { timeout: 5_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  outputDir: 'test-results/hermes-retest',
  use: {
    baseURL: externalBaseUrl ?? `http://127.0.0.1:${localPort}`,
    browserName: 'chromium',
    headless: true,
    trace: 'off',
  },
  ...(externalBaseUrl ? {} : {
    webServer: {
      command: `npm run dev -- --hostname 127.0.0.1 --port ${localPort}`,
      url: `http://127.0.0.1:${localPort}`,
      reuseExistingServer: !process.env.CI,
      timeout: 180_000,
      env: {
        NEXT_TELEMETRY_DISABLED: '1',
        ...(investmentsE2E ? { NEXT_PUBLIC_ENABLE_AGENTATION: 'false' } : {}),
        ...(customCollectionsE2E || investmentsE2E ? { NEXT_PUBLIC_NEON_AUTH_URL: `http://127.0.0.1:${localPort}/api/auth` } : {}),
      },
    },
  }),
});
