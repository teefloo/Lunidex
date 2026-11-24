import assert from 'node:assert/strict';
import { chmodSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

const require = createRequire(import.meta.url);
const yaml = require('js-yaml');
const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const workflowPath = path.join(repositoryRoot, '.github/workflows/deploy-ovh-production.yml');
const composePath = path.join(repositoryRoot, 'compose.production.yaml');
const deployPath = path.join(repositoryRoot, 'scripts/deployment/deploy-production.sh');
const rollbackPath = path.join(repositoryRoot, 'scripts/deployment/rollback-production.sh');
const appHealthPath = path.join(repositoryRoot, 'scripts/deployment/healthcheck-production.sh');
const authProbePath = path.join(repositoryRoot, 'scripts/deployment/check-neon-production.sh');
const isolatedValidatorPath = path.join(repositoryRoot, 'scripts/deployment/validate-image-isolated.sh');
const rollbackCommit = 'd0f5e1af2cf95dd43eb046069c0d37f0a2add93e';
const rollbackImageRef = 'ghcr.io/teefloo/lunidex@sha256:9ca8f66d0b5f79a984358d12fe1c382319df7364388ec2d5df78fe3c5afc318a';

function read(filePath) {
  return readFileSync(filePath, 'utf8');
}

function stepByName(steps, name) {
  const step = steps.find((item) => item.name === name);
  assert.ok(step, `missing workflow step: ${name}`);
  return step;
}

function runAuthProbe(status) {
  const tempDir = mkdtempSync(path.join(os.tmpdir(), 'lunidex-auth-probe-test-'));
  try {
    const fakeCurl = path.join(tempDir, 'curl');
    writeFileSync(fakeCurl, '#!/bin/sh\nprintf %s "$PROBE_HTTP_STATUS"\n', { mode: 0o700 });
    chmodSync(fakeCurl, 0o700);
    return spawnSync('bash', [authProbePath, 'https://lunidex.app/api/auth/get-session'], {
      cwd: tempDir,
      encoding: 'utf8',
      env: { ...process.env, PATH: `${tempDir}:${process.env.PATH ?? ''}`, PROBE_HTTP_STATUS: status },
    });
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
}

test('Compose, deploy, and manual rollback use immutable digest references', () => {
  const compose = read(composePath);
  const deploy = read(deployPath);
  const rollback = read(rollbackPath);
  const workflow = read(workflowPath);

  assert.match(compose, /image:\s+\$\{APP_IMAGE_REF:\?Set APP_IMAGE_REF to a digest-pinned GHCR image reference\}/);
  assert.doesNotMatch(compose, /APP_IMAGE_TAG/);
  assert.match(deploy, /readonly rollback_image_ref='ghcr\.io\/teefloo\/lunidex@sha256:[0-9a-f]{64}'/);
  assert.match(rollback, /requested_image_ref="\$\{1:-\$rollback_image_ref\}"/);
  assert.match(rollback, /Manual production rollback is pinned to the verified d0f5 image digest/);
  assert.match(workflow, new RegExp(rollbackCommit));
  assert.match(workflow, new RegExp(rollbackImageRef.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  assert.doesNotMatch(workflow, /ace4b8|Dockerfile\.rollback-baseline/);
  assert.doesNotMatch(read(path.join(repositoryRoot, 'scripts/deployment/rehearse-rollback-production.sh')), /ace4b8/);
});

test('candidate and rollback images are verified in isolated no-network containers', () => {
  const validator = read(isolatedValidatorPath);
  const workflow = read(workflowPath);

  assert.match(validator, /docker pull --platform linux\/amd64/);
  assert.match(validator, /org\.opencontainers\.image\.revision/);
  assert.match(validator, /docker compose[\s\S]*config --format json/);
  assert.match(validator, /rendered_limit[\s\S]{0,40}'2176m'/);
  assert.match(validator, /docker run --detach[\s\S]*--network none[\s\S]*--read-only[\s\S]*--memory 2176m/);
  assert.match(workflow, /Verify the pinned d0f5 rollback image in isolation/);
  assert.match(workflow, /Validate the candidate Compose contract and app health in isolation/);
  assert.match(workflow, /containerimage\.digest/);
  assert.match(workflow, /image_ref=%s/);
});

test('preflight performs no SSH or production file/container mutation', () => {
  const workflow = yaml.load(read(workflowPath));
  const steps = workflow.jobs.deploy.steps;
  const sideEffectPatterns = /\bssh\s+(?:-|["'])|\bscp\s+(?:-|["'])|OVH_PRODUCTION_DEPLOY_SSH_KEY|\/opt\/lunidex-production|docker (?:stop|compose (?:pull|up)|image prune)/i;

  for (const step of steps) {
    const searchable = `${step.run ?? ''}\n${JSON.stringify(step.env ?? {})}`;
    if (sideEffectPatterns.test(searchable)) {
      assert.match(step.if ?? '', /inputs\.deployment_mode == 'deploy'/, `${step.name} must be deploy-only`);
    }
  }

  assert.match(stepByName(steps, 'Prepare the server-only production environment').if, /deployment_mode == 'deploy'/);
  assert.match(stepByName(steps, 'Configure the separate production SSH connection').if, /deployment_mode == 'deploy'/);
  assert.match(stepByName(steps, 'Report isolated preflight boundary').if, /deployment_mode == 'preflight'/);
  assert.match(stepByName(steps, 'Report isolated preflight boundary').run, /No SSH key was configured/);
});

test('production dispatch requires master, the exact current SHA, and explicit confirmation', () => {
  const workflow = yaml.load(read(workflowPath));
  const inputs = workflow.on.workflow_dispatch.inputs;
  const job = workflow.jobs.deploy;
  const guard = stepByName(job.steps, 'Guard the production branch and commit');

  assert.equal(inputs.production_commit.required, true);
  assert.equal(inputs.confirmation.required, true);
  assert.equal(inputs.confirmation.type, 'string');
  assert.match(job.if, /github\.ref == 'refs\/heads\/master'/);
  assert.match(job.if, /inputs\.confirmation == 'DEPLOY_OVH_PRODUCTION'/);
  assert.match(job.if, /inputs\.production_commit == github\.sha/);
  assert.match(guard.run, /\$GITHUB_REF.*refs\/heads\/master/);
  assert.match(guard.run, /\$PRODUCTION_CONFIRMATION.*DEPLOY_OVH_PRODUCTION/);
  assert.match(guard.run, /\$PRODUCTION_COMMIT.*\$GITHUB_SHA/);
});

test('the deploy-only disk cleanup prunes dangling images only and keeps the pinned rollback image', () => {
  const workflow = yaml.load(read(workflowPath));
  const steps = workflow.jobs.deploy.steps;
  const bootstrapIndex = steps.findIndex((step) => step.name === 'Bootstrap the isolated production root through Docker');
  const pruneIndex = steps.findIndex((step) => step.name === 'Prune dangling images for production deploys');
  const transferIndex = steps.findIndex((step) => step.name === 'Transfer isolated production files and environment');
  const prune = stepByName(steps, 'Prune dangling images for production deploys');

  assert.ok(bootstrapIndex >= 0 && bootstrapIndex < pruneIndex && pruneIndex < transferIndex);
  assert.match(prune.if, /inputs\.deployment_mode == 'deploy'/);
  assert.match(prune.run, /docker image prune --force --filter dangling=true/);
  assert.doesNotMatch(prune.run, /--all|\s-a\b|until=/);
  assert.doesNotMatch(prune.run, /docker system prune|docker container prune|docker volume prune/);
  assert.doesNotMatch(prune.run, /sha256:|Deleted Images|IMAGE ID/);
});

test('preflight scripts fail closed before touching production paths', () => {
  const deploy = read(deployPath);
  const preflight = read(path.join(repositoryRoot, 'scripts/deployment/preflight-production.sh'));
  assert.ok(deploy.indexOf("if [[ \"$mode\" != 'deploy' ]]") < deploy.indexOf('cd /opt/lunidex-production'));
  assert.match(preflight, /retired and performs no reads or writes/);
});

test('application health and Neon/Auth availability have independent verdicts', () => {
  const appHealth = read(appHealthPath);
  const authProbe = read(authProbePath);
  const workflow = read(workflowPath);

  assert.match(appHealth, /api\/healthz/);
  assert.doesNotMatch(appHealth, /NEON_AUTH|NEON_DATABASE_URL|check-neon-production/);
  assert.match(authProbe, /HTTP 402 quota response/);
  assert.doesNotMatch(authProbe, /--write-out ['"]200|--fail-with-body/);
  assert.match(workflow, /Probe Neon Auth separately from application health/);
  assert.match(workflow, /does not cause an app rollback/);
});

test('Neon Auth 402 remains an explicit provider failure; anonymous 200 is only reachability', () => {
  const quota = runAuthProbe('402');
  assert.equal(quota.status, 1);
  assert.match(quota.stderr, /HTTP 402 quota response/);
  assert.doesNotMatch(quota.stdout, /HTTP 200/);

  const reachable = runAuthProbe('200');
  assert.equal(reachable.status, 0);
  assert.match(reachable.stdout, /anonymous response only/);

  const unavailable = runAuthProbe('503');
  assert.equal(unavailable.status, 1);
  assert.match(unavailable.stderr, /HTTP 503/);
});
