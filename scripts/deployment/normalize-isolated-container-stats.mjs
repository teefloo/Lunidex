import { pathToFileURL } from 'node:url';

const MAX_ELAPSED_SECONDS = 3_650;
const UNIT_MULTIPLIERS = new Map([
  ['B', 1],
  ['kB', 1_000],
  ['MB', 1_000_000],
  ['GB', 1_000_000_000],
  ['TB', 1_000_000_000_000],
  ['KiB', 1_024],
  ['MiB', 1_048_576],
  ['GiB', 1_073_741_824],
  ['TiB', 1_099_511_627_776],
]);

function finitePercent(value) {
  if (typeof value !== 'string') return null;
  const match = value.trim().match(/^(\d+(?:\.\d+)?)%$/);
  if (!match) return null;
  const result = Number(match[1]);
  return Number.isFinite(result) && result >= 0 && result <= 100_000 ? result : null;
}

function bytesFromDockerUnit(value) {
  if (typeof value !== 'string') return null;
  const match = value.trim().match(/^(\d+(?:\.\d+)?)\s*(B|kB|MB|GB|TB|KiB|MiB|GiB|TiB)$/);
  if (!match) return null;
  const bytes = Number(match[1]) * UNIT_MULTIPLIERS.get(match[2]);
  return Number.isSafeInteger(Math.round(bytes)) && bytes >= 0 ? Math.round(bytes) : null;
}

export function normalizeContainerStats(stats, elapsedSeconds) {
  if (!stats || typeof stats !== 'object') return null;
  if (!Number.isSafeInteger(elapsedSeconds) || elapsedSeconds < 0 || elapsedSeconds > MAX_ELAPSED_SECONDS) return null;
  const cpuPercent = finitePercent(stats.CPUPerc);
  const memoryPercent = finitePercent(stats.MemPerc);
  if (typeof stats.MemUsage !== 'string') return null;
  const [usageText, limitText, ...extra] = stats.MemUsage.split('/');
  if (!usageText || !limitText || extra.length > 0) return null;
  const memoryUsageBytes = bytesFromDockerUnit(usageText);
  const memoryLimitBytes = bytesFromDockerUnit(limitText);
  if (cpuPercent === null || memoryPercent === null || memoryUsageBytes === null || memoryLimitBytes === null || memoryLimitBytes < 1) return null;
  return {
    elapsed_seconds: elapsedSeconds,
    cpu_percent: cpuPercent,
    memory_usage_bytes: memoryUsageBytes,
    memory_limit_bytes: memoryLimitBytes,
    memory_percent: memoryPercent,
  };
}

async function main() {
  const elapsedSeconds = Number(process.argv[2]);
  const maxInputBytes = 2 * 1024;
  let input = '';
  for await (const chunk of process.stdin) {
    input += chunk;
    if (Buffer.byteLength(input) > maxInputBytes) {
      process.stderr.write('container_stats_exceeds_size_limit\n');
      process.exitCode = 78;
      return;
    }
  }

  let parsed;
  try {
    const lines = input.trimEnd().split(/\r?\n/);
    if (lines.length !== 1 || !lines[0]) throw new Error();
    parsed = JSON.parse(lines[0]);
  } catch {
    process.stderr.write('container_stats_invalid\n');
    process.exitCode = 78;
    return;
  }

  const normalized = normalizeContainerStats(parsed, elapsedSeconds);
  if (!normalized) {
    process.stderr.write('container_stats_invalid\n');
    process.exitCode = 78;
    return;
  }
  process.stdout.write(`${JSON.stringify(normalized)}\n`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}

