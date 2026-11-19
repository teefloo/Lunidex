import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const guardPath = path.join(repositoryRoot, 'scripts/deployment/production-memory-gate.sh');

function runDecision(mode, productionRunning) {
  return spawnSync(
    'bash',
    [
      '-c',
      'source "$1"; production_memory_gate_decision "$2" "$3"',
      '--',
      guardPath,
      mode,
      productionRunning,
    ],
    { cwd: repositoryRoot, encoding: 'utf8' },
  );
}

test('preflight always enforces the 1.5 GiB RAM gate', () => {
  for (const running of ['true', 'false']) {
    const result = runDecision('preflight', running);
    assert.equal(result.status, 0);
    assert.equal(result.stdout.trim(), 'enforce');
  }
});

test('deploy enforces the RAM gate when no production app is running', () => {
  const result = runDecision('deploy', 'false');
  assert.equal(result.status, 0);
  assert.equal(result.stdout.trim(), 'enforce');
});

test('deploy skips only the RAM gate when a production app will be replaced', () => {
  const result = runDecision('deploy', 'true');
  assert.equal(result.status, 0);
  assert.equal(result.stdout.trim(), 'skip');
});

test('unknown deployment state fails closed', () => {
  const result = runDecision('deploy', 'unknown');
  assert.equal(result.status, 64);
  assert.equal(result.stdout, '');
});
