import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const guardPath = path.join(repositoryRoot, 'scripts/deployment/production-memory-gate.sh');
const deploymentWorkflowPath = path.join(repositoryRoot, '.github/workflows/deploy-ovh-production.yml');

function workflowStepBlock(workflow, name) {
  const start = workflow.indexOf(`      - name: ${name}`);
  assert.notEqual(start, -1, `missing workflow step: ${name}`);
  const end = workflow.indexOf('\n      - ', start + 1);
  return workflow.slice(start, end === -1 ? undefined : end);
}

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

test('deploy mode prunes only dangling images older than seven days after pull and before the disk guard', () => {
  const workflow = readFileSync(deploymentWorkflowPath, 'utf8');
  const bootstrapName = 'Bootstrap the isolated production root through Docker';
  const pruneName = 'Prune old dangling images for production deploys';
  const deployName = 'Deploy or privately preflight the production image';
  const bootstrapStart = workflow.indexOf(`- name: ${bootstrapName}`);
  const pruneStart = workflow.indexOf(`- name: ${pruneName}`);
  const deployStart = workflow.indexOf(`- name: ${deployName}`);
  const candidatePull = workflow.indexOf('docker pull', bootstrapStart);
  const deployGuard = workflow.indexOf('deploy-production.sh', deployStart);
  const pruneStep = workflowStepBlock(workflow, pruneName);

  assert.ok(bootstrapStart >= 0 && candidatePull > bootstrapStart);
  assert.ok(candidatePull < pruneStart && pruneStart < deployStart && deployStart < deployGuard);
  assert.match(pruneStep, /^        if: inputs\.deployment_mode == 'deploy'$/m);
  assert.match(pruneStep, /docker image prune --force --filter dangling=true --filter until=168h/);
  assert.match(pruneStep, />\/dev\/null 2>&1/);
  assert.match(pruneStep, /old_dangling_images_pruned=true/);
  assert.match(pruneStep, /old_dangling_images_pruned=false/);
  assert.doesNotMatch(pruneStep, /docker system prune|docker container prune|docker volume prune|docker image prune[^\n]*(?:--all|\s-a\b)/);
  assert.doesNotMatch(pruneStep, /Deleted Images|sha256:|IMAGE ID/);
  assert.equal((pruneStep.match(/docker image prune/g) ?? []).length, 1);
});
