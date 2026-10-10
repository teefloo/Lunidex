import { defineConfig } from '@playwright/test';

const externalBaseUrl = process.env.E2E_BASE_URL;

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
    baseURL: externalBaseUrl ?? 'http://127.0.0.1:3000',
    browserName: 'chromium',
    headless: true,
    trace: 'off',
  },
  ...(externalBaseUrl ? {} : {
    webServer: {
      command: 'npm run dev -- --hostname 127.0.0.1',
      url: 'http://127.0.0.1:3000',
      reuseExistingServer: !process.env.CI,
      timeout: 180_000,
      env: { NEXT_TELEMETRY_DISABLED: '1' },
    },
  }),
});
