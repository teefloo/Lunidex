import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { normalizeContainerState } from './normalize-isolated-container-state.mjs';

function state(overrides = {}) {
  return {
    Running: false,
    OOMKilled: false,
    RestartCount: 0,
    ExitCode: 0,
    StartedAt: '2026-11-20T10:00:00.000000000Z',
    FinishedAt: '2026-11-20T10:05:00.000000000Z',
    Error: 'raw error that must be discarded',
    ...overrides,
  };
}

test('reports SIGABRT exit 134 as unhealthy even when Docker OOMKilled is false', () => {
  assert.deepEqual(normalizeContainerState(state({ ExitCode: 134 })), {
    running: false,
    oom_killed: false,
    restart_count: 0,
    exit_code: 134,
    exit_signal_inferred: 'SIGABRT',
    started_at: '2026-11-20T10:00:00.000000000Z',
    finished_at: '2026-11-20T10:05:00.000000000Z',
    healthy: false,
  });
});

test('reports SIGKILL exit 137 and the kernel OOM flag as unhealthy', () => {
  const killed = normalizeContainerState(state({ ExitCode: 137 }));
  assert.equal(killed.exit_signal_inferred, 'SIGKILL');
  assert.equal(killed.healthy, false);

  const oomKilled = normalizeContainerState(state({ Running: true, OOMKilled: true, ExitCode: 0 }));
  assert.equal(oomKilled.oom_killed, true);
  assert.equal(oomKilled.healthy, false);
  const restarted = normalizeContainerState(state({ Running: true, RestartCount: 1 }));
  assert.equal(restarted.restart_count, 1);
  assert.equal(restarted.healthy, false);
});

test('accepts a still-running non-OOM container and discards unapproved fields', () => {
  const result = normalizeContainerState(state({ Running: true }));
  assert.equal(result.healthy, true);
  assert.equal(Object.hasOwn(result, 'Error'), false);
});

test('CLI emits a sanitized state and rejects malformed or oversized input', () => {
  const validState = state({ ExitCode: 134 });
  const valid = spawnSync(process.execPath, [
    'scripts/deployment/normalize-isolated-container-state.mjs',
    '0',
  ], { input: JSON.stringify(validState), encoding: 'utf8' });
  assert.equal(valid.status, 0);
  assert.equal(valid.stderr, '');
  assert.equal(valid.stdout.includes('raw error'), false);
  assert.equal(JSON.parse(valid.stdout).healthy, false);

  const invalid = spawnSync(process.execPath, [
    'scripts/deployment/normalize-isolated-container-state.mjs',
    '0',
  ], { input: `${'{'.repeat(5000)}${' '.repeat(1)}`, encoding: 'utf8' });
  assert.equal(invalid.status, 78);
  assert.equal(invalid.stdout, '');
  assert.equal(invalid.stderr, 'container_state_exceeds_size_limit\n');
});

test('the runner shell gate fails for SIGABRT 134, SIGKILL 137, and OOMKilled', () => {
  const gatePath = 'scripts/deployment/isolated-container-state-healthy.sh';
  for (const stateValue of [
    state({ ExitCode: 134 }),
    state({ ExitCode: 137 }),
    state({ Running: true, OOMKilled: true, ExitCode: 0 }),
    state({ Running: true, RestartCount: 1 }),
  ]) {
    const normalized = normalizeContainerState(stateValue);
    const result = spawnSync('bash', [gatePath], { input: `${JSON.stringify(normalized)}\n`, encoding: 'utf8' });
    assert.equal(result.status, 1);
    assert.equal(result.stdout, '');
    assert.equal(result.stderr, '');
  }

  const healthy = spawnSync('bash', [gatePath], {
    input: `${JSON.stringify(normalizeContainerState(state({ Running: true })))}\n`,
    encoding: 'utf8',
  });
  assert.equal(healthy.status, 0);
});

test('the phase runner preserves the state gate result through final phase status', () => {
  const runner = readFileSync(new URL('./run-isolated-tcg-rsc-phases.sh', import.meta.url), 'utf8');
  assert.match(runner, /printf '%s\\n' "\$normalized" \| bash "\$GITHUB_WORKSPACE\/scripts\/deployment\/isolated-container-state-healthy\.sh"/);
  assert.match(runner, /if report_container_state "\$phase" "\$app"; then[\s\S]*?app_state_exit=\$\?/);
  assert.match(runner, /helper_exit != 0 \|\| validation_exit != 0 \|\| app_state_exit != 0/);
  assert.doesNotMatch(runner, /report_container_state "\$phase" "\$app" \|\| true/);

  const helperInvocation = runner.indexOf('timeout 3660s docker run --rm');
  const summaryCapture = runner.indexOf('summary="$(cat "$helper_stdout_file")');
  const resourceValidation = runner.indexOf('validate-isolated-container-resource-series.mjs <"$resources_stdout_file"');
  const containerState = runner.indexOf('if report_container_state "$phase" "$app"; then', helperInvocation);
  const summaryValidation = runner.indexOf('validate-isolated-tcg-rsc-summary.mjs "$phase"');
  assert.ok(helperInvocation >= 0 && summaryCapture > helperInvocation);
  assert.match(runner, /2>"\$helper_stderr_file" \|\| helper_exit=\$\?/);
  assert.ok(resourceValidation > helperInvocation && resourceValidation < summaryValidation);
  assert.ok(containerState > helperInvocation && containerState < summaryValidation);
  assert.ok(summaryValidation > summaryCapture);
  assert.match(runner, /if \(\( helper_exit != 0 \|\| validation_exit != 0 \|\| app_state_exit != 0 \|\| resource_validation_exit != 0 \)\)/);
});
