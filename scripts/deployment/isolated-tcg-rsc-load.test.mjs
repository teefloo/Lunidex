import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import {
  connectInspector,
  DIAGNOSTIC_LIMITS,
  DIAGNOSTIC_ROUTE,
  identifyInspectorTarget,
  runPhase,
  sampleMemory,
  validateOutput,
} from './isolated-tcg-rsc-load.mjs';

function summary(overrides = {}) {
  const durationSeconds = overrides.duration_seconds ?? 3600;
  const memory = { rss: 1000, heapTotal: 500, heapUsed: 300, external: 100, arrayBuffers: 80, heap_size_limit: 2000 };
  const postGcMemory = { rss: 950, heapTotal: 500, heapUsed: 250, external: 90, arrayBuffers: 70, heap_size_limit: 2000 };
  return {
    phase: 'full',
    duration_seconds: durationSeconds,
    elapsed_seconds: durationSeconds + 30,
    worker_concurrency: 32,
    max_attempts: 28800,
    worker_interval_ms: 4000,
    abort_after_ms: 60,
    attempts: 1,
    statuses: { '2xx': 1, '3xx': 0, '4xx': 0, '5xx': 0, other: 0 },
    request_errors: 0,
    network_errors: 0,
    timeout_errors: 0,
    read_errors: 0,
    server_errors: 0,
    completed_responses: 1,
    responses_aborted: 0,
    responses_limited: 0,
    response_bytes: 1234,
    oversized_responses: 0,
    inspector: {
      target_pid: 4242,
      target_executable: 'node',
      target_script: 'server.js',
      failure_category: null,
    },
    memory_samples: [
      { elapsed_seconds: 0, phase: 'baseline', raw: memory, post_gc: postGcMemory },
      { elapsed_seconds: durationSeconds, phase: 'recovery_start', raw: memory, post_gc: null },
      { elapsed_seconds: durationSeconds + 30, phase: 'recovery', raw: memory, post_gc: postGcMemory },
    ],
    time_series_fields: [
      'elapsed_bucket_seconds', 'attempts', '2xx', '3xx', '4xx', '5xx', 'other',
      'completed_responses', 'responses_aborted', 'responses_limited', 'request_errors',
      'network_errors', 'timeout_errors', 'read_errors', 'server_errors',
    ],
    time_series: [[0, 1, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0]],
    ...overrides,
  };
}

function waitForInspector(child) {
  return new Promise((resolve, reject) => {
    let stderr = '';
    const timeout = setTimeout(() => reject(new Error('inspector_child_start_timeout')), 5_000);
    child.stderr.setEncoding('utf8');
    child.stderr.on('data', (chunk) => {
      stderr = `${stderr}${chunk}`.slice(-4_096);
      const match = stderr.match(/Debugger listening on ws:\/\/127\.0\.0\.1:(\d+)\//);
      if (match) {
        clearTimeout(timeout);
        resolve(Number(match[1]));
      }
    });
    child.once('exit', () => {
      clearTimeout(timeout);
      reject(new Error('inspector_child_exited_before_ready'));
    });
  });
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
  const phaseRunner = readFileSync(new URL('./run-isolated-tcg-rsc-phases.sh', import.meta.url), 'utf8');

  assert.match(workflow, /workflow_dispatch:/);
  assert.match(workflow, /required: true[\s\S]*?default: false[\s\S]*?type: boolean/);
  assert.match(workflow, /runs-on: ubuntu-latest/);
  assert.match(workflow, /timeout-minutes: 70/);
  assert.match(workflow, /standard runners for this public repository are free/i);
  assert.match(workflow, /github\.ref == 'refs\/heads\/codex\/fix-node-v8-oom-p0'/);
  assert.match(phaseRunner, /timeout 3660s/);
  assert.doesNotMatch(workflow, /\$0\.21|can consume up to \d+ Linux runner minutes/i);
});

test('every selectable load profile has one bounded duration, concurrency, and phase mapping', () => {
  const workflow = readFileSync(new URL('../../.github/workflows/diagnose-isolated-tcg-aborts.yml', import.meta.url), 'utf8');
  const profileSection = workflow.split('case "$DIAGNOSTIC_PROFILE" in')[1]?.split('esac')[0];
  assert.ok(profileSection);
  const actual = [...profileSection.matchAll(/^\s*([a-z0-9-]+)\)\s+phase_seconds=(\d+)\s+concurrency=(\d+)\s+phases=([a-z,]+)\s+;;/gm)]
    .map(([, profile, duration, concurrency, phases]) => [profile, Number(duration), Number(concurrency), phases]);
  assert.deepEqual(actual, [
    ['smoke-30s-c1', 30, 1, 'full,abort'],
    ['progressive-60s-c4', 60, 4, 'full,abort'],
    ['progressive-120s-c8', 120, 8, 'full,abort'],
    ['progressive-300s-c16', 300, 16, 'full,abort'],
    ['comparison-900s-c32', 900, 32, 'full,abort'],
    ['soak-full-3600s-c32', 3600, 32, 'full'],
  ]);
  for (const [, duration, concurrency] of actual) {
    assert.ok(duration >= 30 && duration <= 3600);
    assert.ok(concurrency >= 1 && concurrency <= 32);
  }
});

test('isolated network anchor uses the pinned image Node runtime without assuming sleep exists', () => {
  const phaseRunner = readFileSync(new URL('./run-isolated-tcg-rsc-phases.sh', import.meta.url), 'utf8');

  assert.match(phaseRunner, /--memory 256m[\s\S]*?--memory-swap 256m[\s\S]*?--pids-limit 32/);
  assert.match(phaseRunner, /--entrypoint node[\s\S]*?\$APP_IMAGE" -e 'setInterval\(\(\) => \{\}, 60000\)'/);
  assert.doesNotMatch(phaseRunner, /--entrypoint \/bin\/sleep/);
  assert.match(phaseRunner, /--cpus 1[\s\S]*?--memory 2176m[\s\S]*?--memory-swap 2176m[\s\S]*?--max-old-space-size=1408/);
  assert.match(phaseRunner, /--env "ISOLATED_TCG_CONCURRENCY=\$DIAGNOSTIC_CONCURRENCY"/);
  assert.match(phaseRunner, /MIN_DURATION_SECONDS=30/);
});

test('accepts bounded full and client-abort summaries with the measured app identity', () => {
  const validAbort = summary({
    phase: 'abort',
    attempts: 1,
    statuses: { '2xx': 0, '3xx': 0, '4xx': 0, '5xx': 0, other: 0 },
    completed_responses: 0,
    responses_aborted: 1,
    response_bytes: 0,
    time_series_fields: [
      'elapsed_bucket_seconds', 'attempts', '2xx', '3xx', '4xx', '5xx', 'other',
      'completed_responses', 'responses_aborted', 'responses_limited', 'request_errors',
      'network_errors', 'timeout_errors', 'read_errors', 'server_errors',
    ],
    time_series: [[0, 1, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0]],
  });

  assert.equal(validateOutput(summary()), true);
  assert.equal(validateOutput(summary({
    duration_seconds: 30,
    worker_concurrency: 1,
    max_attempts: 8,
  })), true);
  assert.equal(validateOutput(validAbort), true);
  assert.deepEqual(DIAGNOSTIC_LIMITS, {
    durationSeconds: 3600,
    concurrency: 32,
    maxAttempts: 28800,
    workerIntervalMs: 4000,
    abortAfterMs: 60,
  });
});

test('keeps a complete 60-minute sample series below the 64 KiB summary bound', () => {
  const memory = {
    rss: 1_234_567_890,
    heapTotal: 987_654_321,
    heapUsed: 876_543_210,
    external: 765_432_109,
    arrayBuffers: 654_321_098,
    heap_size_limit: 1_234_567_890,
  };
  const profile = summary({
    elapsed_seconds: 3631,
    attempts: 28_800,
    statuses: { '2xx': 28_800, '3xx': 0, '4xx': 0, '5xx': 0, other: 0 },
    completed_responses: 28_800,
    response_bytes: 12_345_678_901,
    memory_samples: [
      { elapsed_seconds: 0, phase: 'baseline', raw: memory, post_gc: memory },
      ...Array.from({ length: 120 }, (_, index) => ({
        elapsed_seconds: (index + 1) * 30,
        phase: 'load',
        raw: memory,
        post_gc: null,
      })),
      { elapsed_seconds: 3601, phase: 'recovery_start', raw: memory, post_gc: null },
      { elapsed_seconds: 3631, phase: 'recovery', raw: memory, post_gc: memory },
    ],
    time_series: Array.from({ length: 120 }, (_, index) => [
      index * 30,
      240,
      240, 0, 0, 0, 0,
      240,
      0, 0, 0, 0, 0, 0, 0,
    ]),
  });
  const serialized = JSON.stringify(profile);
  assert.equal(validateOutput(profile), true);
  assert.ok(Buffer.byteLength(serialized) <= 64 * 1024);
});

test('rejects unbounded, inconsistent, and private summary fields', () => {
  assert.equal(validateOutput(summary({ duration_seconds: 3601 })), false);
  assert.equal(validateOutput(summary({ attempts: 30_001 })), false);
  assert.equal(validateOutput(summary({ attempts: 28_801 })), false);
  assert.equal(validateOutput(summary({ url: DIAGNOSTIC_ROUTE })), false);
  assert.equal(validateOutput(summary({ headers: { cookie: 'private' } })), false);
  assert.equal(validateOutput(summary({ body: 'private' })), false);
  assert.equal(validateOutput(summary({ inspector: { ...summary().inspector, target_pid: 'raw' } })), false);
  assert.equal(validateOutput(summary({ memory_samples: Array(124).fill(summary().memory_samples[0]) })), false);
  assert.equal(validateOutput(summary({ memory_samples: [{ ...summary().memory_samples[0], stack: 'raw' }] })), false);
  assert.equal(validateOutput(summary({ memory_samples: [{ ...summary().memory_samples[0], raw: { ...summary().memory_samples[0].raw, heap_size_limit: -1 } }] })), false);
  assert.equal(validateOutput(summary({ request_errors: 1 })), false);
  assert.equal(validateOutput(summary({ time_series: [] })), false);
  assert.equal(validateOutput(summary({ time_series_fields: ['raw'] })), false);
  assert.equal(validateOutput(summary({ inspector: { ...summary().inspector, failure_category: 'raw error' } })), false);
});

test('abort phase requires intentional cancellations and full phase rejects abort counters', () => {
  assert.equal(validateOutput(summary({ phase: 'abort' })), false);
  assert.equal(validateOutput(summary({ responses_aborted: 1 })), false);
});

test('invalid phase parameters and missing initial inspector sample fail before load', async () => {
  await assert.rejects(runPhase({ mode: 'arbitrary', durationSeconds: 1 }), /invalid_phase/);
  await assert.rejects(runPhase({ mode: 'full', durationSeconds: 3601 }), /invalid_duration/);
  await assert.rejects(runPhase({ mode: 'full', durationSeconds: 1, concurrency: 33 }), /invalid_concurrency/);

  await assert.rejects(
    runPhase({ mode: 'full', durationSeconds: 1, inspectorTargetsUrl: 'http://127.0.0.1:1/json/list' }),
    (error) => error.category === 'inspector_endpoint_unreachable',
  );

  const missingProfiler = spawnSync(process.execPath, [
    '--input-type=module', '-'
  ], {
    input: readFileSync(new URL('./isolated-tcg-rsc-load.mjs', import.meta.url), 'utf8'),
    encoding: 'utf8',
    env: {
      ...process.env,
      ISOLATED_TCG_PHASE: 'full',
      ISOLATED_TCG_DURATION_SECONDS: '30',
      ISOLATED_TCG_CONCURRENCY: '1',
      ISOLATED_TCG_INSPECTOR_TARGETS_URL: 'http://127.0.0.1:1/json/list',
    },
  });
  assert.equal(missingProfiler.status, 1);
  assert.equal(missingProfiler.stdout, '');
  assert.equal(missingProfiler.stderr, 'diagnostic_helper_started=true\ndiagnostic_error_category=inspector_endpoint_unreachable\n');
});

test('live Inspector smoke test measures the actual child Node process with baseline GC', async (t) => {
  const child = spawn(process.execPath, [
    '--inspect=127.0.0.1:0',
    '--expose-gc',
    '-e',
    'setInterval(() => {}, 60000)',
  ], { stdio: ['ignore', 'ignore', 'pipe'] });
  t.after(() => {
    if (child.exitCode === null && child.signalCode === null) child.kill('SIGTERM');
  });

  const port = await waitForInspector(child);
  const versionResponse = await fetch(`http://127.0.0.1:${port}/json/version`);
  const versionInfo = await versionResponse.json();
  assert.equal(versionResponse.ok, true);
  assert.equal(versionInfo.webSocketDebuggerUrl, undefined);

  const targetResponse = await fetch(`http://127.0.0.1:${port}/json/list`);
  const targets = await targetResponse.json();
  assert.equal(targetResponse.ok, true);
  assert.equal(Array.isArray(targets), true);
  assert.equal(targets.length, 1);
  assert.equal(targets[0].type, 'node');

  await assert.rejects(
    connectInspector({ targetsUrl: `http://127.0.0.1:${port}/json/version` }),
    (error) => error.category === 'inspector_response_invalid',
  );

  const inspector = await connectInspector({ targetsUrl: `http://127.0.0.1:${port}/json/list` });
  try {
    const identity = await identifyInspectorTarget(inspector, { expectedScript: null });
    assert.notEqual(identity.target_pid, process.pid);
    assert.equal(identity.target_executable, 'node');

    const sample = await sampleMemory(inspector, 0, { phase: 'baseline', collectGarbage: true });
    for (const key of ['rss', 'heapTotal', 'heapUsed', 'external', 'arrayBuffers', 'heap_size_limit']) {
      assert.ok(Number.isSafeInteger(sample.raw[key]) && sample.raw[key] >= 0, `raw ${key} must be an integer byte count`);
      assert.ok(Number.isSafeInteger(sample.post_gc[key]) && sample.post_gc[key] >= 0, `post_gc ${key} must be an integer byte count`);
    }
    assert.equal(sample.elapsed_seconds, 0);
    assert.equal(sample.phase, 'baseline');
  } finally {
    inspector.close();
  }
});

test('load samples read raw counters without invoking forced GC', async () => {
  let expression = '';
  const fakeSession = {
    async command(method, params) {
      assert.equal(method, 'Runtime.evaluate');
      expression = params.expression;
      return {
        result: {
          value: {
            gc_available: true,
            raw: { rss: 1000, heapTotal: 500, heapUsed: 300, external: 100, arrayBuffers: 80, heap_size_limit: 2000 },
            post_gc: null,
          },
        },
      };
    },
  };

  const sample = await sampleMemory(fakeSession, 30, { phase: 'load' });
  assert.equal(sample.phase, 'load');
  assert.equal(sample.post_gc, null);
  assert.doesNotMatch(expression, /global\.gc\s*\(/);
});

test('Inspector target validation rejects an unrelated Node process', async (t) => {
  const child = spawn(process.execPath, [
    '--inspect=127.0.0.1:0',
    '--expose-gc',
    '-e',
    'setInterval(() => {}, 60000)',
  ], { stdio: ['ignore', 'ignore', 'pipe'] });
  t.after(() => {
    if (child.exitCode === null && child.signalCode === null) child.kill('SIGTERM');
  });

  const port = await waitForInspector(child);
  const inspector = await connectInspector({ targetsUrl: `http://127.0.0.1:${port}/json/list` });
  try {
    await assert.rejects(
      identifyInspectorTarget(inspector, { expectedScript: 'server.js' }),
      (error) => error.category === 'inspector_target_not_app',
    );
  } finally {
    inspector.close();
  }
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

test('summary validator allows zero 2xx in abort phase only with cancellations', () => {
  const abort = summary({
    phase: 'abort',
    duration_seconds: 30,
    elapsed_seconds: 60,
    worker_concurrency: 1,
    max_attempts: 8,
    attempts: 1,
    statuses: { '2xx': 0, '3xx': 0, '4xx': 0, '5xx': 0, other: 0 },
    completed_responses: 0,
    responses_aborted: 1,
    response_bytes: 0,
    time_series: [[0, 1, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0]],
  });
  const result = spawnSync(process.execPath, [
    'scripts/deployment/validate-isolated-tcg-rsc-summary.mjs',
    'abort',
  ], { input: `${JSON.stringify(abort)}\n`, encoding: 'utf8' });
  assert.equal(result.status, 0);
  assert.deepEqual(JSON.parse(result.stdout), abort);
});

test('summary validator rejects private or oversized lines without echoing them', () => {
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
    input: `${' '.repeat(65 * 1024)}\n`,
    encoding: 'utf8',
  });
  assert.notEqual(oversized.status, 0);
  assert.equal(oversized.stderr, 'summary_exceeds_size_limit\n');
  assert.equal(oversized.stdout, '');
});
