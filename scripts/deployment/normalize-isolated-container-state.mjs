import { pathToFileURL } from 'node:url';

const EXIT_SIGNAL_BY_CODE = new Map([
  [129, 'SIGHUP'],
  [130, 'SIGINT'],
  [131, 'SIGQUIT'],
  [134, 'SIGABRT'],
  [136, 'SIGFPE'],
  [137, 'SIGKILL'],
  [139, 'SIGSEGV'],
  [141, 'SIGPIPE'],
  [143, 'SIGTERM'],
]);

export function normalizeContainerState(state) {
  if (
    !state
    || typeof state !== 'object'
    || typeof state.Running !== 'boolean'
    || typeof state.OOMKilled !== 'boolean'
    || !Number.isSafeInteger(state.RestartCount)
    || state.RestartCount < 0
    || !Number.isSafeInteger(state.ExitCode)
    || state.ExitCode < 0
    || typeof state.StartedAt !== 'string'
    || typeof state.FinishedAt !== 'string'
  ) return null;

  const exitSignal = EXIT_SIGNAL_BY_CODE.get(state.ExitCode)
    ?? (state.ExitCode >= 144 && state.ExitCode <= 255 ? `SIGNAL_${state.ExitCode - 128}` : 'none');

  return {
    running: state.Running,
    oom_killed: state.OOMKilled,
    restart_count: state.RestartCount,
    exit_code: state.ExitCode,
    exit_signal_inferred: exitSignal,
    started_at: state.StartedAt,
    finished_at: state.FinishedAt,
    healthy: state.Running && !state.OOMKilled && state.RestartCount === 0,
  };
}

async function main() {
  const maxInputBytes = 4 * 1024;
  let input = '';
  for await (const chunk of process.stdin) {
    input += chunk;
    if (Buffer.byteLength(input) > maxInputBytes) {
      process.stderr.write('container_state_exceeds_size_limit\n');
      process.exitCode = 78;
      return;
    }
  }

  let parsed;
  try {
    parsed = JSON.parse(input);
  } catch {
    process.stderr.write('container_state_invalid\n');
    process.exitCode = 78;
    return;
  }

  const restartCount = Number(process.argv[2]);
  if (!Number.isSafeInteger(restartCount) || restartCount < 0) {
    process.stderr.write('container_state_invalid\n');
    process.exitCode = 78;
    return;
  }
  parsed.RestartCount = restartCount;

  const normalized = normalizeContainerState(parsed);
  if (!normalized) {
    process.stderr.write('container_state_invalid\n');
    process.exitCode = 78;
    return;
  }

  process.stdout.write(`${JSON.stringify(normalized)}\n`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}

