import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { classifyDockerLaunchError } from './classify-isolated-docker-launch-error.mjs';

test('maps common Docker launch stderr signatures to allowlisted categories only', () => {
  const cases = [
    ['Cannot connect to the Docker daemon at unix:///var/run/docker.sock', 'docker_daemon_unavailable'],
    ['Error response from daemon: No such container: isolated-anchor-123', 'docker_network_target_unavailable'],
    ['invalid mount config for type "bind": bind source path does not exist: /runner/path', 'docker_bind_mount_unavailable'],
    ['OCI runtime create failed: failed to create task', 'docker_runtime_create_failed'],
    ['write /var/lib/docker: no space left on device', 'docker_storage_exhausted'],
    ['unrecognized private daemon detail', 'docker_launch_failed'],
  ];

  for (const [stderr, category] of cases) {
    const result = classifyDockerLaunchError(stderr, 125);
    assert.deepEqual(result, { helper_started: false, exit_code: 125, category });
    assert.equal(JSON.stringify(result).includes(stderr), false);
  }
});

test('distinguishes exit 125 after the helper startup marker from Docker launch rejection', () => {
  assert.deepEqual(classifyDockerLaunchError('diagnostic_helper_started=true\nnode diagnostic failure\n', 125), {
    helper_started: true,
    exit_code: 125,
    category: 'helper_exit_125',
  });
  assert.deepEqual(classifyDockerLaunchError('Error response from daemon: No such container: hidden-name\n', 125), {
    helper_started: false,
    exit_code: 125,
    category: 'docker_network_target_unavailable',
  });
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
  });
});

test('runner emits safe launch classification and mounts the helper outside tmpfs', () => {
  const runner = readFileSync(new URL('./run-isolated-tcg-rsc-phases.sh', import.meta.url), 'utf8');
  const helper = readFileSync(new URL('./isolated-tcg-rsc-load.mjs', import.meta.url), 'utf8');
  const dockerfile = readFileSync(new URL('../../Dockerfile', import.meta.url), 'utf8');
  assert.match(runner, /classify-isolated-docker-launch-error\.mjs/);
  assert.match(runner, /docker_launch_failure_category=/);
  assert.match(runner, /helper_failure_category=/);
  assert.match(runner, /dst=\/app\/server\.js,readonly/);
  assert.match(runner, /"\$APP_IMAGE" node \/app\/server\.js/);
  assert.doesNotMatch(runner, /dst=\/tmp\/diagnostic\.mjs|dst=\/app\/\.diagnostic\.mjs/);
  assert.match(dockerfile, /COPY --from=builder --chown=nextjs:nodejs \/app\/\.next\/standalone \.\//);
  assert.match(dockerfile, /CMD \["node", "server\.js"\]/);
  assert.match(helper, /diagnostic_helper_started=true/);
  assert.ok([...runner.matchAll(/--network "container:\$anchor"/g)].length >= 2);

  const pattern = runner.match(/local launch_json_pattern='([^']+)'/)?.[1];
  assert.ok(pattern);
  for (const [payload, expected] of [
    ['{"helper_started":false,"exit_code":125,"category":"docker_bind_mount_unavailable"}', 'false docker_bind_mount_unavailable'],
    ['{"helper_started":true,"exit_code":125,"category":"helper_exit_125"}', 'true helper_exit_125'],
  ]) {
    const result = spawnSync('bash', [
      '-c', 'pattern=$1; value=$2; [[ "$value" =~ $pattern ]] && printf "%s %s\\n" "${BASH_REMATCH[1]}" "${BASH_REMATCH[2]}"',
      'bash', pattern, payload,
    ], { encoding: 'utf8' });
    assert.equal(result.status, 0);
    assert.equal(result.stdout.trim(), expected);
  }
});
