import { pathToFileURL } from 'node:url';

const MAX_LINE_BYTES = 2 * 1024;
const MAX_SAMPLES = 123;
const MAX_ELAPSED_SECONDS = 3_650;
const SAMPLE_KEYS = [
  'elapsed_seconds', 'cpu_percent', 'memory_usage_bytes', 'memory_limit_bytes', 'memory_percent',
];

function validSample(sample, previousElapsed) {
  if (!sample || typeof sample !== 'object' || Array.isArray(sample)) return false;
  if (Object.keys(sample).length !== SAMPLE_KEYS.length || Object.keys(sample).some((key) => !SAMPLE_KEYS.includes(key))) return false;
  if (!Number.isSafeInteger(sample.elapsed_seconds) || sample.elapsed_seconds < 0 || sample.elapsed_seconds > MAX_ELAPSED_SECONDS || sample.elapsed_seconds <= previousElapsed) return false;
  if (previousElapsed < 0 ? sample.elapsed_seconds !== 0 : sample.elapsed_seconds - previousElapsed < 28 || sample.elapsed_seconds - previousElapsed > 32) return false;
  if (!Number.isFinite(sample.cpu_percent) || sample.cpu_percent < 0 || sample.cpu_percent > 100_000) return false;
  if (!Number.isSafeInteger(sample.memory_usage_bytes) || sample.memory_usage_bytes < 0) return false;
  if (!Number.isSafeInteger(sample.memory_limit_bytes) || sample.memory_limit_bytes < 1) return false;
  if (!Number.isFinite(sample.memory_percent) || sample.memory_percent < 0 || sample.memory_percent > 100_000) return false;
  return true;
}

export function validateResourceSeries(lines) {
  if (!Array.isArray(lines) || lines.length < 1 || lines.length > MAX_SAMPLES) return null;
  const samples = [];
  let previousElapsed = -1;
  for (const line of lines) {
    if (typeof line !== 'string' || Buffer.byteLength(line) > MAX_LINE_BYTES) return null;
    let sample;
    try {
      sample = JSON.parse(line);
    } catch {
      return null;
    }
    if (!validSample(sample, previousElapsed)) return null;
    previousElapsed = sample.elapsed_seconds;
    samples.push(sample);
  }
  const cpu = samples.map((sample) => sample.cpu_percent);
  const memoryUsage = samples.map((sample) => sample.memory_usage_bytes);
  const memoryPercent = samples.map((sample) => sample.memory_percent);
  return {
    sample_count: samples.length,
    cadence_seconds: 30,
    cpu_percent_max: Math.max(...cpu),
    memory_usage_bytes_max: Math.max(...memoryUsage),
    memory_limit_bytes_min: Math.min(...samples.map((sample) => sample.memory_limit_bytes)),
    memory_percent_max: Math.max(...memoryPercent),
    samples: samples.map((sample) => [
      sample.elapsed_seconds,
      sample.cpu_percent,
      sample.memory_usage_bytes,
      sample.memory_limit_bytes,
      sample.memory_percent,
    ]),
  };
}

async function main() {
  const maxInputBytes = MAX_SAMPLES * (MAX_LINE_BYTES + 1);
  let input = '';
  for await (const chunk of process.stdin) {
    input += chunk;
    if (Buffer.byteLength(input) > maxInputBytes) {
      process.stderr.write('container_resource_series_exceeds_size_limit\n');
      process.exitCode = 78;
      return;
    }
  }

  const lines = input.trimEnd().split(/\r?\n/).filter(Boolean);
  const result = validateResourceSeries(lines);
  if (!result) {
    process.stderr.write('container_resource_series_invalid\n');
    process.exitCode = 78;
  } else {
    process.stdout.write(`${JSON.stringify(result)}\n`);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
