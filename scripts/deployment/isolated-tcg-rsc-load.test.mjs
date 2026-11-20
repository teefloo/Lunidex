import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import {
  DIAGNOSTIC_LIMITS,
  DIAGNOSTIC_ROUTE,
  runPhase,
  validateOutput,
} from './isolated-tcg-rsc-load.mjs';

function summary(overrides = {}) {
  return {
    phase: 'full',
    duration_seconds: 900,
    worker_concurrency: 32,
    max_attempts: 7200,
    worker_interval_ms: 4000,
    abort_after_ms: 60,
    attempts: 1,
    statuses: { '2xx': 1, '3xx': 0, '4xx': 0, '5xx': 0, other: 0 },
    request_errors: 0,
    completed_responses: 1,
    responses_aborted: 0,
    response_bytes: 1234,
    oversized_responses: 0,
    memory_samples: [{
      elapsed_seconds: 0,
      rss: 1000,
      heapTotal: 500,
      heapUsed: 300,
      external: 100,
      arrayBuffers: 80,
      heapLimit: 2000,
    }],
    ...overrides,
  };
}

test('diagnostic route is fixed to loopback and one known card', () => {
  const route = new URL(DIAGNOSTIC_ROUTE);
  assert.equal(route.origin, 'http://127.0.0.1:3000');
  assert.equal(route.pathname, '/en/tcg/cards/base1-4');
  assert.deepEqual([...route.searchParams.entries()], [['tcgLang', 'en']]);
});

test('environment proxy support is enabled for warm-up only', () => {
  const workflow = readFileSync(new URL('../../.github/workflows/diagnose-isolated-tcg-aborts.yml', import.meta.url), 'utf8');
  const phaseRunner = readFileSync(new URL('./run-isolated-tcg-rsc-phases.sh', import.meta.url), 'utf8');

  assert.match(workflow, /--env NODE_OPTIONS='[^']*--use-env-proxy[^']*'/);
  assert.equal([...workflow.matchAll(/--use-env-proxy/g)].length, 1);
  assert.doesNotMatch(phaseRunner, /--use-env-proxy/);
  assert.doesNotMatch(phaseRunner, /(?:--env\s+)?(?:https?_proxy|no_proxy)\s*=/i);
  assert.doesNotMatch(phaseRunner, /(?:HTTP|HTTPS|NO)_PROXY\s*=/i);
});

test('workflow accurately describes free public standard runner usage and manual bounds', () => {
  const workflow = readFileSync(new URL('../../.github/workflows/diagnose-isolated-tcg-aborts.yml', import.meta.url), 'utf8');

  assert.match(workflow, /workflow_dispatch:/);
  assert.match(workflow, /required: true[\s\S]*?default: false[\s\S]*?type: boolean/);
  assert.match(workflow, /runs-on: ubuntu-latest/);
  assert.match(workflow, /timeout-minutes: 35/);
  assert.match(workflow, /repository is public, so standard GitHub-hosted runner minutes are free/i);
  assert.doesNotMatch(workflow, /\$0\.21|can consume up to 35 Linux runner minutes/i);
});

test('isolated network anchor uses the pinned image Node runtime without assuming sleep exists', () => {
  const phaseRunner = readFileSync(new URL('./run-isolated-tcg-rsc-phases.sh', import.meta.url), 'utf8');

  assert.match(phaseRunner, /--memory 64m[\s\S]*?--memory-swap 64m/);
  assert.match(phaseRunner, /--entrypoint node[\s\S]*?\$APP_IMAGE" -e 'setInterval\(\(\) => \{\}, 60000\)'/);
  assert.doesNotMatch(phaseRunner, /--entrypoint \/bin\/sleep/);
});

test('accepts bounded, aggregate diagnostic output', () => {
  assert.equal(validateOutput(summary()), true);
  assert.equal(validateOutput(summary({ phase: 'abort', responses_aborted: 1 })), true);
  assert.deepEqual(DIAGNOSTIC_LIMITS, {
    durationSeconds: 900,
    concurrency: 32,
    maxAttempts: 7200,
    workerIntervalMs: 4000,
    abortAfterMs: 60,
  });
});

test('rejects unbounded phases, counts, sample arrays, and raw response fields', () => {
  assert.equal(validateOutput(summary({ duration_seconds: 901 })), false);
  assert.equal(validateOutput(summary({ attempts: 10_001 })), false);
  assert.equal(validateOutput(summary({ attempts: 7201 })), false);
  assert.equal(validateOutput(summary({ memory_samples: Array(17).fill(summary().memory_samples[0]) })), false);
  assert.equal(validateOutput(summary({ url: DIAGNOSTIC_ROUTE })), false);
  assert.equal(validateOutput(summary({ headers: { cookie: 'private' } })), false);
  assert.equal(validateOutput(summary({ body: 'private' })), false);
  assert.equal(validateOutput(summary({ memory_samples: [{ ...summary().memory_samples[0], stack: 'raw' }] })), false);
});

test('rejects negative or non-integer memory measurements', () => {
  assert.equal(validateOutput(summary({
    memory_samples: [{ ...summary().memory_samples[0], rss: -1 }],
  })), false);
  assert.equal(validateOutput(summary({
    memory_samples: [{ ...summary().memory_samples[0], external: 1.5 }],
  })), false);
});

test('invalid phase parameters fail before any network request', async () => {
  await assert.rejects(runPhase({ mode: 'arbitrary', durationSeconds: 1 }), /invalid_phase/);
  await assert.rejects(runPhase({ mode: 'full', durationSeconds: 901 }), /invalid_duration/);
});

test('summary validator emits only bounded aggregate JSON for an expected phase', () => {
  const result = spawnSync(process.execPath, [
    'scripts/deployment/validate-isolated-tcg-rsc-summary.mjs',
    'full',
  ], {
    input: `${JSON.stringify(summary())}\n`,
    encoding: 'utf8',
  });

  assert.equal(result.status, 0);
  assert.deepEqual(JSON.parse(result.stdout), summary());
  assert.equal(result.stderr, '');
});

test('summary validator rejects oversized or private fields without echoing them', () => {
  const privateRoute = 'https://lunidex.app/private?token=do-not-print';
  const invalid = spawnSync(process.execPath, [
    'scripts/deployment/validate-isolated-tcg-rsc-summary.mjs',
    'full',
  ], {
    input: `${JSON.stringify(summary({ url: privateRoute }))}\n`,
    encoding: 'utf8',
  });
  assert.notEqual(invalid.status, 0);
  assert.equal(invalid.stderr.includes(privateRoute), false);
  assert.equal(invalid.stdout, '');

  const oversized = spawnSync(process.execPath, [
    'scripts/deployment/validate-isolated-tcg-rsc-summary.mjs',
    'full',
  ], {
    input: `${' '.repeat(17 * 1024)}\n`,
    encoding: 'utf8',
  });
  assert.notEqual(oversized.status, 0);
  assert.equal(oversized.stderr, 'summary_exceeds_size_limit\n');
});
