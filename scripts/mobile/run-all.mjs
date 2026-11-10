import { spawn } from 'node:child_process';
import { projectRoot } from './constants.mjs';

const stages = [
  { name: 'Playwright mobile WebKit', args: ['scripts/mobile/run-playwright.mjs'] },
  { name: 'Production PWA checks', args: ['scripts/mobile/run-playwright.mjs', '--pwa'] },
  { name: 'Physical iPhone Safari', args: ['scripts/mobile/run-ios-safari.mjs'] },
];
const results = [];

for (const stage of stages) {
  process.stdout.write(`\n=== ${stage.name} ===\n`);
  const child = spawn(process.execPath, stage.args, {
    cwd: projectRoot,
    env: process.env,
    stdio: 'inherit',
  });
  const result = await new Promise((resolve) => {
    child.once('error', (error) => resolve({ status: 127, error: error.message }));
    child.once('close', (code, signal) => resolve({
      status: code ?? 1,
      error: signal ? `terminated by ${signal}` : undefined,
    }));
  });
  results.push({ name: stage.name, ...result });
}

process.stdout.write('\nMobile test stage summary:\n');
for (const result of results) {
  process.stdout.write(`${result.status === 0 ? '✓' : '✗'} ${result.name}: ${result.status === 0 ? 'passed' : `failed (exit ${result.status})${result.error ? ` — ${result.error}` : ''}`}\n`);
}

const failureCount = results.filter((result) => result.status !== 0).length;
if (failureCount > 0) {
  process.stderr.write(`\n${failureCount} mobile test stage${failureCount === 1 ? '' : 's'} failed; all stages have been attempted.\n`);
  process.exitCode = 1;
} else {
  process.stdout.write('\nAll mobile test stages passed.\n');
}
