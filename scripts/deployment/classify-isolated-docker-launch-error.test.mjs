import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { classifyDockerLaunchError, sanitizeStderrSignature } from './classify-isolated-docker-launch-error.mjs';

test('maps Docker exec stderr signatures to allowlisted categories only', () => {
  const cases = [
    ['Cannot connect to the Docker daemon at unix:///var/run/docker.sock', 'docker_daemon_unavailable'],
    ['Error response from daemon: No such container: isolated-anchor-123', 'docker_exec_container_unavailable'],
    ['invalid mount config for type "bind": bind source path does not exist: /runner/path', 'docker_bind_mount_unavailable'],
    ['OCI runtime create failed: failed to create task', 'docker_runtime_create_failed'],
    ['write /var/lib/docker: no space left on device', 'docker_storage_exhausted'],
    ['unrecognized private daemon detail', 'docker_exec_failed'],
  ];

  for (const [stderr, category] of cases) {
    const result = classifyDockerLaunchError(stderr, 125);
    assert.deepEqual(result, {
      helper_started: false,
      exit_code: 125,
      category,
      stderr_signature: sanitizeStderrSignature(stderr),
    });
    assert.equal(result.stderr_signature, sanitizeStderrSignature(stderr));
  }
});

test('distinguishes exit 125 after the helper startup marker from Docker launch rejection', () => {
  assert.deepEqual(classifyDockerLaunchError('diagnostic_helper_started=true\nnode diagnostic failure\n', 125), {
    helper_started: true,
    exit_code: 125,
    category: 'helper_exit_125',
    stderr_signature: 'diagnostic_helper_started=true',
  });
  assert.deepEqual(classifyDockerLaunchError('Error response from daemon: No such container: hidden-name\n', 125), {
    helper_started: false,
    exit_code: 125,
    category: 'docker_exec_container_unavailable',
    stderr_signature: 'Error response from daemon: No such container: hidden-name',
  });
});

test('stderr signatures redact credentials, bearer strings, URLs, long IDs, and paths', () => {
  const raw = 'Error Bearer bearer-secret token=api-secret https://private.example/path /runner/work/private abcdef0123456789abcdef0123456789';
  const signature = sanitizeStderrSignature(raw);
  assert.match(signature, /Bearer \[REDACTED\]/);
  assert.match(signature, /token=\[REDACTED\]/);
  assert.match(signature, /\[URL\]/);
  assert.match(signature, /\[PATH\]/);
  assert.match(signature, /\[ID\]/);
  for (const secret of ['bearer-secret', 'api-secret', 'private.example', '/runner/work/private', 'abcdef0123456789']) {
    assert.equal(signature.includes(secret), false);
  }
  assert.ok(Buffer.byteLength(sanitizeStderrSignature(`x${'a'.repeat(500)}`)) <= 160);
  assert.equal(sanitizeStderrSignature('first line token=secret\nsecond line should be discarded'), 'first line token=[REDACTED]');
});

test('CLI never echoes raw Docker stderr or secrets', () => {
  const secret = 'token=do-not-print';
  const stderr = `Error response from daemon: invalid mount config for type "bind"; ${secret}`;
  const result = spawnSync(process.execPath, [
    'scripts/deployment/classify-isolated-docker-launch-error.mjs', '125',
  ], { input: stderr, encoding: 'utf8' });

  assert.equal(result.status, 0);
  assert.equal(result.stderr, '');
  assert.equal(result.stdout.includes(secret), false);
  assert.deepEqual(JSON.parse(result.stdout), {
    helper_started: false,
    exit_code: 125,
    category: 'docker_bind_mount_unavailable',
    stderr_signature: 'Error response from daemon: invalid mount config for type bind ; token=[REDACTED]',
  });
});

test('runner uses bounded docker exec stdin without helper bind mounts or a helper docker run', () => {
  const runner = readFileSync(new URL('./run-isolated-tcg-rsc-phases.sh', import.meta.url), 'utf8');
  const helper = readFileSync(new URL('./isolated-tcg-rsc-load.mjs', import.meta.url), 'utf8');
  const dockerfile = readFileSync(new URL('../../Dockerfile', import.meta.url), 'utf8');
  assert.match(runner, /classify-isolated-docker-launch-error\.mjs/);
  assert.match(runner, /--shell <"\$helper_error_file"/);
  assert.match(runner, /docker_exec_failure_category=/);
  assert.match(runner, /helper_failure_category=/);
  const helperCommand = runner.slice(runner.indexOf('timeout 3_660s docker exec'), runner.indexOf('summary="$(cat "$helper_stdout_file")'));
  assert.match(helperCommand, /docker exec --interactive[\s\S]*"\$anchor" node --input-type=module -[\s\S]*<"\$GITHUB_WORKSPACE\/scripts\/deployment\/isolated-tcg-rsc-load\.mjs"/);
  assert.doesNotMatch(helperCommand, /docker run|--mount/);
  assert.match(runner, /--cpus 0\.25[\s\S]*?--memory 256m[\s\S]*?--memory-swap 256m[\s\S]*?--pids-limit 32/);
  assert.match(dockerfile, /COPY --from=builder --chown=nextjs:nodejs \/app\/\.next\/standalone \.\//);
  assert.match(dockerfile, /CMD \["node", "server\.js"\]/);
  assert.match(helper, /process\.argv\[1\] === '-'/);
  assert.match(helper, /diagnostic_helper_started=true/);
  assert.ok([...runner.matchAll(/--network "container:\$anchor"/g)].length >= 2);

  for (const [stderr, expected] of [
    ['Error response from daemon: invalid mount configuration', 'false\t125\tdocker_exec_failed\tError response from daemon: invalid mount configuration'],
    ['diagnostic_helper_started=true\n', 'true\t125\thelper_exit_125\tdiagnostic_helper_started=true'],
  ]) {
    const result = spawnSync(process.execPath, [
      'scripts/deployment/classify-isolated-docker-launch-error.mjs', '125', '--shell',
    ], { input: stderr, encoding: 'utf8' });
    assert.equal(result.status, 0);
    assert.equal(result.stdout.trimEnd(), expected);
  }
});
