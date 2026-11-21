import { spawn } from 'node:child_process';
import { performance } from 'node:perf_hooks';
import { normalizeContainerStats } from './normalize-isolated-container-stats.mjs';

const MAX_SAMPLES = 123;
const SAMPLE_INTERVAL_MS = 30_000;
const MAX_ELAPSED_SECONDS = 3_650;
const container = process.argv[2] ?? '';

if (!/^lunidex-isolated-rsc-(full|abort)-app$/.test(container)) {
  process.stderr.write('container_stats_invalid_container\n');
  process.exit(78);
}

let stopping = false;
let activeChild = null;
let sleepTimer = null;
let wakeSleep = null;
let sampleCount = 0;
let errorCount = 0;
const startedAt = performance.now();

process.on('SIGTERM', () => {
  stopping = true;
  if (sleepTimer) clearTimeout(sleepTimer);
  wakeSleep?.();
  activeChild?.kill('SIGTERM');
});

async function sample(elapsedSeconds) {
  const stdoutChunks = [];
  let stdoutBytes = 0;
  const child = spawn('docker', [
    'stats', '--no-stream', '--format', '{{json .}}', container,
  ], { stdio: ['ignore', 'pipe', 'ignore'], windowsHide: true });
  activeChild = child;
  let timedOut = false;
  const timeout = setTimeout(() => {
    timedOut = true;
    child.kill('SIGKILL');
  }, 8_000);
  child.stdout.on('data', (chunk) => {
    stdoutBytes += chunk.length;
    if (stdoutBytes <= 2 * 1024) stdoutChunks.push(chunk);
    else child.kill('SIGKILL');
  });

  const exitCode = await new Promise((resolve) => {
    child.once('error', () => resolve(null));
    child.once('close', (code) => resolve(code));
  });
  clearTimeout(timeout);
  activeChild = null;
  try {
    if (stopping || timedOut || exitCode !== 0 || stdoutBytes > 2 * 1024) throw new Error();
    const stdout = Buffer.concat(stdoutChunks).toString('utf8');
    const lines = stdout.trimEnd().split(/\r?\n/);
    if (lines.length !== 1) throw new Error();
    const stats = JSON.parse(lines[0]);
    const normalized = normalizeContainerStats(stats, elapsedSeconds);
    if (!normalized) throw new Error();
    process.stdout.write(`${JSON.stringify(normalized)}\n`);
    sampleCount += 1;
  } catch {
    if (!stopping) errorCount += 1;
  }
}

for (let index = 0; index < MAX_SAMPLES && !stopping; index += 1) {
  const dueAt = startedAt + index * SAMPLE_INTERVAL_MS;
  const waitMs = dueAt - performance.now();
  if (waitMs > 0) {
    await new Promise((resolve) => {
      wakeSleep = resolve;
      sleepTimer = setTimeout(resolve, waitMs);
    });
    sleepTimer = null;
    wakeSleep = null;
  }
  if (stopping) break;
  const elapsedSeconds = Math.min(MAX_ELAPSED_SECONDS, Math.floor((performance.now() - startedAt) / 1_000));
  await sample(elapsedSeconds);
}

process.stderr.write(`container_stats_samples=${sampleCount} container_stats_errors=${errorCount}\n`);
