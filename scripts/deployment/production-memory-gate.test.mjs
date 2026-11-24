import assert from 'node:assert/strict';
import { readdirSync, mkdtempSync, rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import './production-deploy-safety.test.mjs';

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const guardPath = path.join(repositoryRoot, 'scripts/deployment/production-memory-gate.sh');
const deployScriptPath = path.join(repositoryRoot, 'scripts/deployment/deploy-production.sh');
const preflightScriptPath = path.join(repositoryRoot, 'scripts/deployment/preflight-production.sh');
const candidateRef = 'ghcr.io/teefloo/lunidex@sha256:' + 'a'.repeat(64);
const commit = 'a'.repeat(40);

function runDecision(mode, productionRunning) {
  return spawnSync(
    'bash',
    ['-c', 'source "$1"; production_memory_gate_decision "$2" "$3"', '--', guardPath, mode, productionRunning],
    { cwd: repositoryRoot, encoding: 'utf8' },
  );
}

test('VPS preflight is rejected before touching production state', () => {
  for (const running of ['true', 'false']) {
    const result = runDecision('preflight', running);
    assert.equal(result.status, 64);
    assert.equal(result.stdout, '');
  }

  const tempDir = mkdtempSync(path.join(os.tmpdir(), 'lunidex-preflight-refusal-'));
  try {
    const before = readdirSync(tempDir);
    const deploy = spawnSync('bash', [deployScriptPath, candidateRef, commit, 'preflight'], {
      cwd: tempDir,
      encoding: 'utf8',
    });
    assert.equal(deploy.status, 64);
    assert.match(deploy.stderr, /GitHub-only/);
    assert.deepEqual(readdirSync(tempDir), before);

    const retired = spawnSync('bash', [preflightScriptPath], { cwd: tempDir, encoding: 'utf8' });
    assert.equal(retired.status, 64);
    assert.match(retired.stderr, /retired/);
    assert.deepEqual(readdirSync(tempDir), before);
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
});

test('deploy enforces the RAM gate when no production app is running', () => {
  const result = runDecision('deploy', 'false');
  assert.equal(result.status, 0);
  assert.equal(result.stdout.trim(), 'enforce');
});

test('deploy skips only the RAM gate when replacing the running production app in place', () => {
  const result = runDecision('deploy', 'true');
  assert.equal(result.status, 0);
  assert.equal(result.stdout.trim(), 'skip');
});

test('unknown deployment state fails closed', () => {
  const result = runDecision('deploy', 'unknown');
  assert.equal(result.status, 64);
  assert.equal(result.stdout, '');
});
