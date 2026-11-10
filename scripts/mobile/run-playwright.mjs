import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { mobileArtifactsDir, playwrightBin, projectRoot } from './constants.mjs';

const productionPwaRun = process.argv.includes('--pwa');
mkdirSync(mobileArtifactsDir, { recursive: true });

const preflight = spawn(process.execPath, ['scripts/mobile/preflight.mjs', '--playwright'], {
  cwd: projectRoot,
  stdio: 'inherit',
  env: { ...process.env, PLAYWRIGHT_BROWSERS_PATH: '0' },
});
const preflightCode = await new Promise((resolve) => preflight.on('exit', resolve));
if (preflightCode !== 0) process.exit(preflightCode ?? 1);

const env = {
  ...process.env,
  PLAYWRIGHT_BROWSERS_PATH: '0',
  ...(productionPwaRun ? { MOBILE_E2E_PWA: '1' } : {}),
};
const playwright = spawn(playwrightBin, ['test', '--config=playwright.mobile.config.ts'], {
  cwd: projectRoot,
  stdio: 'inherit',
  env,
});
const code = await new Promise((resolve) => playwright.on('exit', resolve));

if (code === 0) {
  const reportPath = path.join(projectRoot, 'playwright-report', 'mobile', 'index.html');
  process.stdout.write(`\nMobile Playwright report: ${reportPath}\n`);
}
process.exit(code ?? 1);
