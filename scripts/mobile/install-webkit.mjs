import { playwrightBin, run } from './constants.mjs';

const result = run(playwrightBin, ['install', 'webkit'], {
  env: { ...process.env, PLAYWRIGHT_BROWSERS_PATH: '0' },
  stdio: 'inherit',
});
if (result.status !== 0) process.exit(result.status ?? 1);
