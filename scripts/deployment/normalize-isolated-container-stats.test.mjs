import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, chmodSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { delimiter, join } from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { normalizeContainerStats } from './normalize-isolated-container-stats.mjs';
import { validateResourceSeries } from './validate-isolated-container-resource-series.mjs';

const validDockerStats = {
  Name: 'private-container-name',
  ID: 'private-container-id',
  CPUPerc: '12.50%',
  MemUsage: '512.25MiB / 2.12GiB',
  MemPerc: '23.51%',
};

test('normalizes Docker CPU and cgroup memory values without retaining identifiers', () => {
  const normalized = normalizeContainerStats(validDockerStats, 30);
  assert.deepEqual(normalized, {
    elapsed_seconds: 30,
    cpu_percent: 12.5,
    memory_usage_bytes: 537133056,
    memory_limit_bytes: 2_276_332_667,
    memory_percent: 23.51,
  });
  assert.equal(Object.hasOwn(normalized, 'Name'), false);
  assert.equal(Object.hasOwn(normalized, 'ID'), false);
});

test('rejects malformed percentages, units, elapsed time, and excess fields only at CLI boundary', () => {
  assert.equal(normalizeContainerStats({ ...validDockerStats, CPUPerc: 'NaN%' }, 30), null);
  assert.equal(normalizeContainerStats({ ...validDockerStats, MemUsage: '512MiB / unlimited' }, 30), null);
  assert.equal(normalizeContainerStats(validDockerStats, 3_651), null);

  const result = spawnSync(process.execPath, [
    'scripts/deployment/normalize-isolated-container-stats.mjs', '30',
  ], { input: `${JSON.stringify(validDockerStats)}\n`, encoding: 'utf8' });
  assert.equal(result.status, 0);
  assert.equal(result.stdout.includes('private-container'), false);
  assert.deepEqual(JSON.parse(result.stdout), normalizeContainerStats(validDockerStats, 30));
});

test('validates bounded 30-second container resource series with numeric-only output', () => {
  const series = validateResourceSeries([
    JSON.stringify(normalizeContainerStats(validDockerStats, 0)),
    JSON.stringify(normalizeContainerStats({ ...validDockerStats, CPUPerc: '25.00%' }, 30)),
  ]);
  assert.deepEqual(series, {
    sample_count: 2,
    cadence_seconds: 30,
    cpu_percent_max: 25,
    memory_usage_bytes_max: 537133056,
    memory_limit_bytes_min: 2_276_332_667,
    memory_percent_max: 23.51,
    samples: [
      [0, 12.5, 537133056, 2_276_332_667, 23.51],
      [30, 25, 537133056, 2_276_332_667, 23.51],
    ],
  });
  assert.equal(JSON.stringify(series).includes('private-container'), false);
  assert.equal(validateResourceSeries([JSON.stringify({ ...series.samples[0], Name: 'leak' })]), null);
  assert.equal(validateResourceSeries([JSON.stringify(normalizeContainerStats(validDockerStats, 30))]), null);
});

test('sampler polls Docker stats and emits only normalized fields, then exits on TERM', {
  skip: process.env.ISOLATED_DIAGNOSTIC_SKIP_SAMPLER_PROCESS_TEST === '1',
}, async (t) => {
  const directory = mkdtempSync(join(tmpdir(), 'lunidex-stats-docker-'));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const fakeDocker = join(directory, 'docker');
  writeFileSync(fakeDocker, `#!/bin/sh\nprintf '%s\\n' '${JSON.stringify(validDockerStats)}'\n`);
  chmodSync(fakeDocker, 0o700);

  const child = spawn(process.execPath, [
    'scripts/deployment/sample-isolated-container-resources.mjs',
    'lunidex-isolated-rsc-full-app',
  ], {
    env: { ...process.env, PATH: `${directory}${delimiter}${process.env.PATH}` },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  t.after(() => {
    if (child.exitCode === null && child.signalCode === null) child.kill('SIGKILL');
  });

  let stdout = '';
  let stderr = '';
  child.stdout.setEncoding('utf8');
  child.stderr.setEncoding('utf8');
  child.stdout.on('data', (part) => { stdout += part; });
  child.stderr.on('data', (part) => { stderr += part; });
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('sampler_did_not_emit')), 5_000);
    child.stdout.once('data', () => {
      clearTimeout(timeout);
      child.kill('SIGTERM');
      resolve();
    });
  });
  const exitCode = await new Promise((resolve) => child.once('close', resolve));

  assert.equal(exitCode, 0);
  assert.equal(stderr, 'container_stats_samples=1 container_stats_errors=0\n');
  assert.equal(stdout.includes('private-container'), false);
  const sample = JSON.parse(stdout.trim());
  assert.equal(sample.elapsed_seconds, 0);
  assert.equal(sample.cpu_percent, 12.5);
  assert.equal(sample.memory_limit_bytes, 2_276_332_667);
});
