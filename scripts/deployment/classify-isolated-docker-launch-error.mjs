const MAX_INPUT_BYTES = 8 * 1024;
const CATEGORIES = [
  'docker_daemon_unavailable',
  'docker_exec_container_unavailable',
  'docker_bind_mount_unavailable',
  'docker_resource_setting_invalid',
  'docker_storage_exhausted',
  'docker_runtime_create_failed',
  'docker_permission_denied',
  'docker_image_unavailable',
  'docker_command_unavailable',
  'docker_exec_timeout',
  'docker_exec_failed',
  'helper_exit_125',
  'helper_started_without_summary',
];

function hasHelperStartedMarker(stderr) {
  return /^diagnostic_helper_started=true$/m.test(stderr);
}

export function sanitizeStderrSignature(stderr) {
  const firstLine = typeof stderr === 'string' ? stderr.split(/\r?\n/, 1)[0] : '';
  if (!firstLine) return 'empty';
  const sanitized = firstLine
    .replace(/\u001B\[[0-?]*[ -/]*[@-~]/g, ' ')
    .replace(/\bBearer\s+[^\s,;]+/gi, 'Bearer [REDACTED]')
    .replace(/\b(token|password|secret|api[_-]?key|authorization)\s*[:=]\s*[^\s,;]+/gi, '$1=[REDACTED]')
    .replace(/https?:\/\/[^\s"'<>]+/gi, '[URL]')
    .replace(/\b(?:[a-f0-9]{12,}|[a-z0-9_-]{32,})\b/gi, '[ID]')
    .replace(/(?:[A-Za-z]:)?(?:\/[A-Za-z0-9._-]+)+/g, '[PATH]')
    .replace(/[^A-Za-z0-9 .,:;()/_=\-[\]]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return (sanitized || 'empty').slice(0, 160);
}

export function classifyDockerLaunchError(stderr, exitCode) {
  if (typeof stderr !== 'string' || Buffer.byteLength(stderr) > MAX_INPUT_BYTES) return null;
  if (!Number.isSafeInteger(exitCode) || exitCode < 1 || exitCode > 255) return null;
  const helperStarted = hasHelperStartedMarker(stderr);
  const stderrSignature = sanitizeStderrSignature(stderr);
  if (helperStarted) {
    return {
      helper_started: true,
      exit_code: exitCode,
      category: exitCode === 125 ? 'helper_exit_125' : 'helper_started_without_summary',
      stderr_signature: stderrSignature,
    };
  }

  const lower = stderr.toLowerCase();
  let category = 'docker_exec_failed';
  if (/cannot connect to the docker daemon|error during connect.*daemon|is the docker daemon running/.test(lower)) {
    category = 'docker_daemon_unavailable';
  } else if (/no such container|container .* is not running|network .* not found|failed to join.*network|network namespace.*not found/.test(lower)) {
    category = 'docker_exec_container_unavailable';
  } else if (/invalid mount config for type ["']?bind|bind source path does not exist|bind mount .* does not exist|mounts denied|not a directory.*mount/.test(lower)) {
    category = 'docker_bind_mount_unavailable';
  } else if (/invalid (?:argument|memory|cpu|resource)|memory limit.*exceeds|cpu quota.*invalid|resource limit.*invalid/.test(lower)) {
    category = 'docker_resource_setting_invalid';
  } else if (/no space left on device|not enough space|disk quota exceeded/.test(lower)) {
    category = 'docker_storage_exhausted';
  } else if (/oci runtime create failed|failed to create (?:task|shim)|error creating container|failed to create container/.test(lower)) {
    category = 'docker_runtime_create_failed';
  } else if (/permission denied|operation not permitted/.test(lower)) {
    category = 'docker_permission_denied';
  } else if (/no such image|manifest unknown|pull access denied|image .* not found/.test(lower)) {
    category = 'docker_image_unavailable';
  } else if (/executable file not found|command not found|exec format error/.test(lower)) {
    category = 'docker_command_unavailable';
  } else if (/context deadline exceeded|timed out|timeout while/.test(lower)) {
    category = 'docker_exec_timeout';
  }

  return { helper_started: false, exit_code: exitCode, category, stderr_signature: stderrSignature };
}

async function main() {
  const exitCode = Number(process.argv[2]);
  let stderr = '';
  for await (const chunk of process.stdin) {
    stderr += chunk;
    if (Buffer.byteLength(stderr) > MAX_INPUT_BYTES) {
      process.stderr.write('docker_exec_stderr_exceeds_size_limit\n');
      process.exitCode = 78;
      return;
    }
  }
  const classified = classifyDockerLaunchError(stderr, exitCode);
  if (!classified || !CATEGORIES.includes(classified.category)) {
    process.stderr.write('docker_exec_error_invalid\n');
    process.exitCode = 78;
    return;
  }
  if (process.argv[3] === '--shell') {
    process.stdout.write(`${classified.helper_started}\t${classified.exit_code}\t${classified.category}\t${classified.stderr_signature}\n`);
  } else {
    process.stdout.write(`${JSON.stringify(classified)}\n`);
  }
}

if (process.argv[1] && import.meta.url === `file://${process.argv[1]}`) {
  await main();
}
