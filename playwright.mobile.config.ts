import { defineConfig, devices } from '@playwright/test';

const baseURL = process.env.MOBILE_BASE_URL;
const port = process.env.MOBILE_WEB_PORT ?? '3210';
const productionPwaRun = process.env.MOBILE_E2E_PWA === '1';
const serverUrl = `http://127.0.0.1:${port}`;

const webServerCommand = productionPwaRun
  ? `npm run build && npm run start -- --hostname 127.0.0.1 --port ${port}`
  : `npm run dev -- --hostname 127.0.0.1 --port ${port}`;

export default defineConfig({
  testDir: './e2e/mobile',
  testMatch: '**/*.spec.ts',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report/mobile', open: 'never' }],
  ],
  outputDir: 'test-results/mobile-webkit',
  use: {
    ...devices['iPhone 14'],
    browserName: 'webkit',
    baseURL: baseURL ?? serverUrl,
    locale: 'en-US',
    serviceWorkers: 'allow',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  ...(baseURL ? {} : {
    webServer: {
      command: webServerCommand,
      url: serverUrl,
      reuseExistingServer: !process.env.CI,
      timeout: 300_000,
      env: {
        NEXT_TELEMETRY_DISABLED: '1',
        NEXT_PUBLIC_ENABLE_AGENTATION: 'false',
        // This repository contains many generated/static assets; polling avoids
        // Watchpack exhausting macOS file-watch resources in this test server.
        WATCHPACK_POLLING: process.env.WATCHPACK_POLLING ?? 'true',
      },
    },
  }),
});
