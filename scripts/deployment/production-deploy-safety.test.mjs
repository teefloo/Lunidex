import assert from 'node:assert/strict';
import { chmodSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { EXPECTED_SUPABASE_CA_PATH, validateRenderedCompose } from './validate-compose-runtime-contract.mjs';
import { resolveCandidateImageRef } from './resolve-candidate-image-ref.mjs';

const require = createRequire(import.meta.url);
const yaml = require('js-yaml');
const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const workflowPath = path.join(repositoryRoot, '.github/workflows/deploy-ovh-production.yml');
const composePath = path.join(repositoryRoot, 'compose.production.yaml');
const deployPath = path.join(repositoryRoot, 'scripts/deployment/deploy-production.sh');
const rollbackPath = path.join(repositoryRoot, 'scripts/deployment/rollback-production.sh');
const appHealthPath = path.join(repositoryRoot, 'scripts/deployment/healthcheck-production.sh');
const authProbePath = path.join(repositoryRoot, 'scripts/deployment/check-supabase-auth.sh');
const isolatedValidatorPath = path.join(repositoryRoot, 'scripts/deployment/validate-image-isolated.sh');
const composeContractValidatorPath = path.join(repositoryRoot, 'scripts/deployment/validate-compose-runtime-contract.mjs');
const currentMasterCheckPath = path.join(repositoryRoot, 'scripts/deployment/check-current-master-sha.sh');
const rollbackCandidatesPath = path.join(repositoryRoot, 'scripts/deployment/rollback-candidates.sh');
const verifyNeonFallbackPath = path.join(repositoryRoot, 'scripts/deployment/verify-neon-public-only-image.sh');
const rollbackImageRef = `ghcr.io/teefloo/lunidex@sha256:${'b'.repeat(64)}`;

function validComposeConfig(image, overrides = {}) {
  return {
    services: {
      app: {
        image,
        mem_limit: '2176m',
        cpus: '1.0',
        environment: { NODE_EXTRA_CA_CERTS: EXPECTED_SUPABASE_CA_PATH },
        volumes: [{
          type: 'bind',
          source: '/tmp/supabase-ca.crt',
          target: EXPECTED_SUPABASE_CA_PATH,
          read_only: true,
          bind: { create_host_path: false },
        }],
        ...overrides,
      },
    },
  };
}

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
    const argsPath = path.join(tempDir, 'curl-args.txt');
    writeFileSync(fakeCurl, '#!/bin/sh\nprintf "%s\\n" "$@" > "$CURL_ARGS_FILE"\nprintf %s "$PROBE_HTTP_STATUS"\n', { mode: 0o700 });
    chmodSync(fakeCurl, 0o700);
    const result = spawnSync('bash', [authProbePath, 'https://lunidex-test.supabase.co', 'synthetic-publishable-key'], {
      cwd: tempDir,
      encoding: 'utf8',
      env: { ...process.env, PATH: `${tempDir}:${process.env.PATH ?? ''}`, PROBE_HTTP_STATUS: status, CURL_ARGS_FILE: argsPath },
    });
    return { ...result, curlArgs: readFileSync(argsPath, 'utf8') };
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
}

test('Compose, deploy, and manual rollback use immutable digest references', () => {
  const compose = read(composePath);
  const deploy = read(deployPath);
  const rollback = read(rollbackPath);
  const dockerfile = read(path.join(repositoryRoot, 'Dockerfile'));
  const dockerignore = read(path.join(repositoryRoot, '.dockerignore'));
  const workflow = read(workflowPath);

  assert.match(compose, /image:\s+\$\{APP_IMAGE_REF:\?Set APP_IMAGE_REF to a digest-pinned GHCR image reference\}/);
  assert.doesNotMatch(compose, /APP_IMAGE_TAG/);
  assert.match(deploy, /rollback_image_ref="\$\{4:-\}"/);
  assert.match(deploy, /com\.lunidex\.backend/);
  assert.match(rollback, /rollback_mode='manual'/);
  assert.match(rollback, /--last-stable\) rollback_mode='last-stable'/);
  assert.match(rollback, /SUPABASE_ROLLBACK_IMAGE_REF/);
  assert.match(workflow, /SUPABASE_ROLLBACK_IMAGE_REF/);
  assert.match(dockerfile, /LABEL com\.lunidex\.backend="supabase"/);
  assert.match(compose, /NODE_EXTRA_CA_CERTS:\s+\/etc\/ssl\/certs\/lunidex-supabase-ca\.crt/);
  assert.match(compose, /source:\s+\.\/supabase-ca\.crt[\s\S]*target:\s+\/etc\/ssl\/certs\/lunidex-supabase-ca\.crt[\s\S]*read_only:\s+true[\s\S]*create_host_path:\s+false/);
  assert.match(dockerignore, /^\.migration\/$/m);
  assert.match(dockerignore, /^\*\.key$/m);
  assert.match(dockerignore, /^\*\.crt$/m);
  assert.match(dockerignore, /^\*\.pem$/m);
  assert.match(deploy, /require-supabase-ca\.sh/);
  assert.match(rollback, /require-supabase-ca\.sh/);
  const caVerifier = read(path.join(repositoryRoot, 'scripts/deployment/verify-supabase-ca.sh'));
  const pinnedCaFingerprint = '807025AD50D4ED219D2C9C7D299C004F824EB00CF7F65AFEF607D07B72E6CAFA';
  assert.ok(read(path.join(repositoryRoot, 'scripts/deployment/require-supabase-ca.sh')).includes('verify-supabase-ca.sh'));
  assert.ok(read(path.join(repositoryRoot, 'scripts/deployment/install-supabase-ca.sh')).includes('verify-supabase-ca.sh'));
  assert.ok(workflow.includes('scripts/deployment/verify-supabase-ca.sh'));
  assert.ok(caVerifier.includes(pinnedCaFingerprint));
  assert.equal(workflow.split(pinnedCaFingerprint).length - 1, 1);
  assert.match(`${workflow}\n${deploy}\n${rollback}`, /neon-public-only:d0f5e1af2cf95dd43eb046069c0d37f0a2add93e/);
  assert.match(rollback, /Neon Auth and cloud data remain unavailable/);
  assert.doesNotMatch(rollback, /neon-public-only[^\n]*Supabase-compatible/);
  assert.match(workflow, /legacy d0f5 Neon image is public-only emergency recovery, never a Supabase candidate/i);
  assert.doesNotMatch(workflow, /d0f5e1af[^\n]*Supabase rollback candidate/i);
  assert.doesNotMatch(read(path.join(repositoryRoot, 'scripts/deployment/rehearse-rollback-production.sh')), /ace4b8/);
});

test('the official Supabase root CA is accepted and a different CA is rejected', () => {
  const verifier = path.join(repositoryRoot, 'scripts/deployment/verify-supabase-ca.sh');
  const officialCa = path.join(repositoryRoot, 'supabase/tests/fixtures/supabase-root-2021.crt');
  const accepted = spawnSync('bash', [verifier, officialCa], { cwd: repositoryRoot, encoding: 'utf8' });

  assert.equal(accepted.status, 0, accepted.stderr);
  assert.match(accepted.stdout, /pinned certificate/i);

  const tempDir = mkdtempSync(path.join(os.tmpdir(), 'lunidex-mismatched-ca-test-'));
  const mismatchCa = path.join(tempDir, 'mismatched-root.crt');
  const generated = spawnSync('openssl', [
    'req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-days', '1',
    '-subj', '/CN=Lunidex test mismatch CA',
    '-addext', 'basicConstraints=critical,CA:TRUE',
    '-keyout', path.join(tempDir, 'mismatch.key'),
    '-out', mismatchCa,
  ], { cwd: repositoryRoot, encoding: 'utf8' });

  try {
    assert.equal(generated.status, 0, generated.stderr);
    const rejected = spawnSync('bash', [verifier, mismatchCa], { cwd: repositoryRoot, encoding: 'utf8' });
    assert.equal(rejected.status, 78);
    assert.match(rejected.stderr, /fingerprint does not match/i);
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
});

test('candidate and rollback images are verified in isolated no-network containers', () => {
  const validator = read(isolatedValidatorPath);
  const workflow = read(workflowPath);

  assert.match(validator, /docker pull --platform linux\/amd64/);
  assert.match(validator, /org\.opencontainers\.image\.revision/);
  assert.match(validator, /docker compose[\s\S]*config --format json/);
  assert.match(validator, /validate-compose-runtime-contract\.mjs/);
  assert.match(validator, /docker run --detach[\s\S]*--network none[\s\S]*--read-only[\s\S]*--memory 2176m/);
  assert.match(workflow, /Verify the configured Supabase-compatible rollback image in isolation/);
  assert.match(workflow, /Validate the candidate Compose contract and app health in isolation/);
  assert.match(workflow, /containerimage\.digest/);
  assert.match(workflow, /image_ref=%s/);
  assert.match(validator, /docker exec[\s\S]*api\/healthz/);
});

test('reused candidate digests resolve only to immutable Lunidex GHCR image references', () => {
  const digest = 'sha256:' + 'a'.repeat(64);
  assert.equal(resolveCandidateImageRef(digest), `ghcr.io/teefloo/lunidex@${digest}`);
  assert.equal(
    resolveCandidateImageRef('sha256:aec1231996e4ebcfac433d187bade59440272988d50918b2035ac166596f0091'),
    'ghcr.io/teefloo/lunidex@sha256:aec1231996e4ebcfac433d187bade59440272988d50918b2035ac166596f0091',
  );

  for (const malformed of [
    '',
    'sha256:abc',
    'sha256:' + 'A'.repeat(64),
    `ghcr.io/other/image@${digest}`,
    `ghcr.io/teefloo/lunidex:latest`,
  ]) {
    assert.throws(() => resolveCandidateImageRef(malformed), /lowercase sha256 digest/);
  }
});

test('reused digest skips only image build and preserves SHA, platform, and health checks', () => {
  const workflow = yaml.load(read(workflowPath));
  const steps = workflow.jobs.deploy.steps;
  const digestInput = workflow.on.workflow_dispatch.inputs.candidate_image_digest;
  const guard = stepByName(steps, 'Guard the production branch and commit');
  const reuse = stepByName(steps, 'Reuse the supplied immutable candidate image digest');
  const build = stepByName(steps, 'Build and publish the candidate image');
  const sourceHistory = stepByName(steps, 'Verify the image source commit belongs to selected master');
  const validator = read(isolatedValidatorPath);
  const validate = stepByName(steps, 'Validate the candidate Compose contract and app health in isolation');
  const deploy = stepByName(steps, 'Deploy the production image by immutable digest');
  const report = stepByName(steps, 'Report isolated preflight boundary');
  const selectedImageRef = /steps\.reused_candidate_image\.outputs\.image_ref \|\| steps\.candidate_image\.outputs\.image_ref/;

  assert.equal(digestInput.required, false);
  assert.equal(digestInput.default, '');
  assert.equal(digestInput.type, 'string');
  assert.match(guard.run, /CANDIDATE_IMAGE_DIGEST.*\^sha256:\[0-9a-f\]\{64\}\$/);
  assert.match(reuse.if, /candidate_image_digest != ''/);
  assert.match(reuse.run, /resolve-candidate-image-ref\.mjs/);
  assert.match(build.if, /candidate_image_digest == ''/);
  assert.match(build.run, /docker buildx build[\s\S]*--push/);
  assert.match(validate.env.IMAGE_REF, selectedImageRef);
  assert.match(deploy.env.IMAGE_REF, selectedImageRef);
  assert.match(report.env.IMAGE_REF, selectedImageRef);
  assert.match(report.run, /candidate was reused; no image build or publication was performed/);
  assert.match(report.run, /candidate image was built and published to GHCR/);
  assert.match(sourceHistory.run, /git merge-base --is-ancestor "\$PRODUCTION_COMMIT" "\$GITHUB_SHA"/);
  assert.match(guard.run, /-z "\$CANDIDATE_IMAGE_DIGEST" && "\$PRODUCTION_COMMIT" != "\$GITHUB_SHA"/);
  assert.match(validator, /docker pull --platform linux\/amd64/);
  assert.match(validator, /\[\[ "\$revision" != "\$expected_revision"/);
  assert.match(validator, /api\/healthz/);
});

test('Compose runtime contract accepts equivalent normalized and source resource forms', () => {
  const expectedImage = 'ghcr.io/teefloo/lunidex@sha256:' + 'a'.repeat(64);
  const unnormalized = validateRenderedCompose(validComposeConfig(expectedImage), expectedImage);
  const normalized = validateRenderedCompose(validComposeConfig(expectedImage, { mem_limit: '2281701376', cpus: 1 }), expectedImage);

  assert.equal(unnormalized.ok, true);
  assert.equal(unnormalized.actual.mem_limit_bytes, '2281701376');
  assert.equal(unnormalized.actual.ca_mount_read_only, true);
  assert.equal(unnormalized.actual.node_extra_ca_certs, EXPECTED_SUPABASE_CA_PATH);
  assert.equal(normalized.ok, true);
  assert.equal(normalized.actual.mem_limit_bytes, '2281701376');
});

test('Compose runtime contract rejects effective resource changes and image mismatches', () => {
  const expectedImage = 'ghcr.io/teefloo/lunidex@sha256:' + 'a'.repeat(64);
  const changedMemory = validateRenderedCompose(validComposeConfig(expectedImage, { mem_limit: '2281701377', cpus: 1 }), expectedImage);
  const changedCpus = validateRenderedCompose(validComposeConfig(expectedImage, { mem_limit: 2281701376, cpus: 1.01 }), expectedImage);
  const changedImage = validateRenderedCompose(validComposeConfig('ghcr.io/teefloo/lunidex:latest'), expectedImage);

  assert.equal(changedMemory.ok, false);
  assert.equal(changedCpus.ok, false);
  assert.equal(changedImage.ok, false);
});

test('Compose runtime contract requires the read-only Supabase CA mount and Node trust configuration', () => {
  const expectedImage = 'ghcr.io/teefloo/lunidex@sha256:' + 'a'.repeat(64);
  const missingCaMount = validateRenderedCompose(validComposeConfig(expectedImage, { volumes: [] }), expectedImage);
  const writableCaMount = validateRenderedCompose(validComposeConfig(expectedImage, {
    volumes: [{
      type: 'bind',
      source: '/tmp/supabase-ca.crt',
      target: EXPECTED_SUPABASE_CA_PATH,
      read_only: false,
      bind: { create_host_path: false },
    }],
  }), expectedImage);
  const wrongCaPath = validateRenderedCompose(validComposeConfig(expectedImage, {
    environment: { NODE_EXTRA_CA_CERTS: '/tmp/other-ca.crt' },
  }), expectedImage);

  assert.equal(missingCaMount.ok, false);
  assert.equal(writableCaMount.ok, false);
  assert.equal(wrongCaPath.ok, false);
});

test('Compose contract failure reports the rendered image and resource values', () => {
  const expectedImage = 'ghcr.io/teefloo/lunidex@sha256:' + 'a'.repeat(64);
  const tempDir = mkdtempSync(path.join(os.tmpdir(), 'lunidex-compose-contract-test-'));
  const renderedPath = path.join(tempDir, 'rendered.json');
  try {
    writeFileSync(renderedPath, JSON.stringify({
      services: { app: { image: expectedImage, mem_limit: '2281701377', cpus: 1.5 } },
    }));
    const result = spawnSync('node', [composeContractValidatorPath, renderedPath, expectedImage], {
      cwd: repositoryRoot,
      encoding: 'utf8',
    });

    assert.equal(result.status, 78);
    assert.match(result.stderr, /image="ghcr\.io\/teefloo\/lunidex@sha256:/);
    assert.match(result.stderr, /mem_limit="2281701377" mem_limit_bytes=2281701377/);
    assert.match(result.stderr, /cpus=1\.5/);
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
});

test('private rollback image authentication happens before the first GHCR pull', () => {
  const parsed = yaml.load(read(workflowPath));
  const steps = parsed.jobs.deploy.steps;
  const authIndex = steps.findIndex((step) => step.name === 'Authenticate to GHCR before pulling the private rollback image');
  const rollbackIndex = steps.findIndex((step) => step.name === 'Verify the configured Supabase-compatible rollback image in isolation');
  const candidateIndex = steps.findIndex((step) => step.name === 'Build and publish the candidate image');
  const auth = stepByName(steps, 'Authenticate to GHCR before pulling the private rollback image');

  assert.ok(authIndex >= 0 && authIndex < rollbackIndex && rollbackIndex < candidateIndex);
  assert.match(auth.env.GHCR_TOKEN, /secrets\.GITHUB_TOKEN/);
  assert.match(auth.run, /docker login ghcr\.io --username .* --password-stdin/);
  assert.equal(parsed.jobs.deploy.permissions.packages, 'write');
});

test('production runtime prefers the Supabase secret key and retains service-role fallback', () => {
  const workflow = yaml.load(read(workflowPath));
  const steps = workflow.jobs.deploy.steps;
  const prepare = stepByName(steps, 'Prepare the server-only production environment');
  const deploy = read(deployPath);

  assert.match(prepare.env.SUPABASE_SECRET_KEY, /secrets\.SUPABASE_SECRET_KEY/);
  assert.match(prepare.env.SUPABASE_SERVICE_ROLE_KEY, /secrets\.SUPABASE_SERVICE_ROLE_KEY/);
  assert.match(prepare.run, /if \[\[ -n "\$SUPABASE_SECRET_KEY" \]\][\s\S]*append_env SUPABASE_SECRET_KEY[\s\S]*elif \[\[ -n "\$SUPABASE_SERVICE_ROLE_KEY" \]\][\s\S]*append_env SUPABASE_SERVICE_ROLE_KEY/);
  assert.match(deploy, /SUPABASE_SECRET_KEY=\.\+\$[\s\S]*SUPABASE_SERVICE_ROLE_KEY=\.\+\$/);
  assert.doesNotMatch(prepare.run, /echo ["']?\$SUPABASE_(?:SECRET_KEY|SERVICE_ROLE_KEY)/);
});

test('owner allowlist secret is available only to server-runtime environment preparation', () => {
  const parsed = yaml.load(read(workflowPath));
  const job = parsed.jobs.deploy;
  const prepare = stepByName(job.steps, 'Prepare the server-only production environment');
  const build = stepByName(job.steps, 'Build and publish the candidate image');

  assert.equal(job.env.SUPABASE_ALLOWED_USER_ID, undefined);
  assert.match(prepare.env.SUPABASE_ALLOWED_USER_ID, /secrets\.SUPABASE_ALLOWED_USER_ID/);
  assert.match(prepare.run, /append_env SUPABASE_ALLOWED_USER_ID \"\$SUPABASE_ALLOWED_USER_ID\" yes/);
  assert.doesNotMatch(build.run, /SUPABASE_ALLOWED_USER_ID/);
  assert.doesNotMatch(JSON.stringify(build.env ?? {}), /SUPABASE_ALLOWED_USER_ID/);
});

test('authenticated schema closure leaves only explicit anon projection usage and postgres server usage', () => {
  const migration = read(path.join(repositoryRoot, 'supabase/migrations/20261126162737_lunidex_restrict_authenticated_data_api.sql'));
  const pgTap = read(path.join(repositoryRoot, 'supabase/tests/account-rls.sql'));

  assert.match(migration, /revoke usage on schema public from public/i);
  assert.match(migration, /grant usage on schema public to anon/i);
  assert.match(pgTap, /not has_schema_privilege\('authenticated', 'public', 'USAGE'\)/);
  assert.match(pgTap, /has_schema_privilege\('anon', 'public', 'USAGE'\)/);
  assert.match(pgTap, /has_schema_privilege\('postgres', 'public', 'USAGE'\)/);
  assert.match(pgTap, /both existing accounts retain their user-state rows/);
});

test('preflight performs no SSH or production file/container mutation', () => {
  const workflow = yaml.load(read(workflowPath));
  const steps = workflow.jobs.deploy.steps;
  const sideEffectPatterns = /\bssh\s+(?:-|["'])|\bscp\s+(?:-|["'])|OVH_PRODUCTION_DEPLOY_SSH_KEY|\/opt\/lunidex-production|docker (?:stop|compose (?:pull|up)|image prune)/i;

  for (const step of steps) {
    const searchable = `${step.run ?? ''}\n${JSON.stringify(step.env ?? {})}`;
    if (sideEffectPatterns.test(searchable)) {
      assert.match(step.if ?? '', /env\.DEPLOYMENT_MODE == 'deploy'/, `${step.name} must be deploy-only`);
    }
  }

  assert.match(stepByName(steps, 'Prepare the server-only production environment').if, /env\.DEPLOYMENT_MODE == 'deploy'/);
  assert.match(stepByName(steps, 'Configure the separate production SSH connection').if, /env\.DEPLOYMENT_MODE == 'deploy'/);
  assert.match(stepByName(steps, 'Report isolated preflight boundary').if, /env\.DEPLOYMENT_MODE == 'preflight'/);
  assert.match(stepByName(steps, 'Report isolated preflight boundary').run, /No SSH key was configured/);
});

test('production dispatch requires master and explicit confirmation; image source must belong to master', () => {
  const workflow = yaml.load(read(workflowPath));
  const inputs = workflow.on.workflow_dispatch.inputs;
  const job = workflow.jobs.deploy;
  const guard = stepByName(job.steps, 'Guard the production branch and commit');
  const checkout = job.steps.find((step) => step.uses === 'actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683');

  assert.equal(inputs.production_commit.required, true);
  assert.equal(inputs.confirmation.required, true);
  assert.equal(inputs.confirmation.type, 'string');
  assert.match(inputs.deployment_mode.description, /validates a supplied digest or builds and publishes a candidate on GitHub\/GHCR/);
  assert.match(inputs.deployment_mode.description, /publishes.*GHCR/);
  assert.match(inputs.deployment_mode.description, /deploy alone connects to OVH/);
  assert.match(job.if, /github\.ref == 'refs\/heads\/master'/);
  assert.match(job.if, /inputs\.confirmation == 'DEPLOY_OVH_PRODUCTION'/);
  assert.match(job.if, /inputs\.production_commit != ''/);
  assert.match(stepByName(job.steps, 'Verify the image source commit belongs to selected master').run, /git cat-file -e/);
  assert.match(guard.run, /\$GITHUB_REF.*refs\/heads\/master/);
  assert.match(guard.run, /\$PRODUCTION_CONFIRMATION.*DEPLOY_OVH_PRODUCTION/);
  assert.match(guard.run, /\$PRODUCTION_COMMIT.*\[0-9a-f\]\{40\}/);
  assert.match(guard.run, /newly built image must use the exact selected master SHA/);
  assert.match(stepByName(job.steps, 'Verify the image source commit belongs to selected master').run, /git merge-base --is-ancestor/);
  assert.ok(checkout);
  assert.equal(checkout.with.ref, '${{ github.event_name == \'workflow_run\' && github.event.workflow_run.head_sha || github.sha }}');
  assert.equal(checkout.with['fetch-depth'], 0);
});

test('automatic deployment requires successful CI from a master push and stays disabled by default', () => {
  const workflow = yaml.load(read(workflowPath));
  const job = workflow.jobs.deploy;
  const dispatch = workflow.on.workflow_dispatch;
  const autoGuard = stepByName(job.steps, 'Guard the production branch and commit');

  assert.deepEqual(workflow.on.workflow_run, {
    workflows: ['CI'],
    branches: ['master'],
    types: ['completed'],
  });
  assert.match(job.if, /workflow_run\.conclusion == 'success'/);
  assert.match(job.if, /workflow_run\.event == 'push'/);
  assert.match(job.if, /workflow_run\.head_branch == 'master'/);
  assert.match(job.if, /vars\.AUTO_DEPLOY_ENABLED == 'true'/);
  assert.match(job.env.AUTO_DEPLOY_ENABLED, /vars\.AUTO_DEPLOY_ENABLED \|\| 'false'/);
  assert.match(job.env.PRODUCTION_COMMIT, /workflow_run\.head_sha/);
  assert.match(autoGuard.run, /AUTO_DEPLOY_ENABLED.*'true'/);
  assert.match(autoGuard.run, /WORKFLOW_RUN_CONCLUSION.*success/);
  assert.match(autoGuard.run, /WORKFLOW_RUN_EVENT.*push/);
  assert.match(autoGuard.run, /WORKFLOW_RUN_HEAD_BRANCH.*master/);
  assert.match(job.if, /workflow_dispatch/);
  assert.match(job.if, /inputs\.confirmation == 'DEPLOY_OVH_PRODUCTION'/);
  assert.equal(dispatch.inputs.confirmation.required, true);
  assert.equal(dispatch.inputs.confirmation.default, undefined);
  assert.equal(workflow.concurrency.group, 'lunidex-ovh-production');
  assert.equal(workflow.concurrency['cancel-in-progress'], false);
});

test('automatic deployment rejects a stale master SHA before build and before production SSH/mutations', () => {
  const workflow = yaml.load(read(workflowPath));
  const steps = workflow.jobs.deploy.steps;
  const names = steps.map((step) => step.name);
  const buildIndex = names.indexOf('Build and publish the candidate image');
  const checkBeforeBuild = names.indexOf('Reject stale automatic deployment before build');
  const candidateBuildIndex = names.indexOf('Build and publish the candidate image');
  const bootstrapIndex = names.indexOf('Bootstrap the isolated production root through Docker');
  const transferIndex = names.indexOf('Transfer isolated production files and environment');
  const stopIndex = names.indexOf('Stop preproduction before durable production deployment');
  const deployIndex = names.indexOf('Deploy the production image by immutable digest');

  assert.ok(checkBeforeBuild >= 0 && checkBeforeBuild < buildIndex);
  assert.match(steps[checkBeforeBuild].if, /workflow_run/);
  assert.match(steps[candidateBuildIndex].run, /check-current-master-sha\.sh/);
  for (const index of [bootstrapIndex, transferIndex, stopIndex, deployIndex]) {
    assert.match(steps[index].run, /check-current-master-sha\.sh/);
    assert.match(steps[index].run, /GITHUB_EVENT_NAME.*workflow_run/);
  }
  assert.match(steps[bootstrapIndex].run, /check-current-master-sha\.sh[\s\S]*ssh/);
  assert.match(steps[transferIndex].run, /check-current-master-sha\.sh[\s\S]*scp/);
  assert.match(steps[deployIndex].run, /check-current-master-sha\.sh[\s\S]*deploy-production\.sh/);
});

test('current-master SHA guard accepts only the exact current master and fails closed', () => {
  const tempDir = mkdtempSync(path.join(os.tmpdir(), 'lunidex-master-sha-test-'));
  const expected = 'a'.repeat(40);
  try {
    const fakeGh = path.join(tempDir, 'gh');
    writeFileSync(fakeGh, '#!/bin/sh\nprintf %s "$CURRENT_MASTER_SHA"\n', { mode: 0o700 });
    chmodSync(fakeGh, 0o700);
    const run = (sha) => spawnSync('bash', [currentMasterCheckPath, expected], {
      cwd: tempDir,
      encoding: 'utf8',
      env: {
        ...process.env,
        PATH: `${tempDir}:${process.env.PATH ?? ''}`,
        GITHUB_REPOSITORY: 'teefloo/Lunidex',
        GH_TOKEN: 'test-token-never-printed',
        CURRENT_MASTER_SHA: sha,
      },
    });

    const current = run(expected);
    assert.equal(current.status, 0);
    assert.match(current.stdout, new RegExp(`master_sha_current=${expected}`));
    assert.doesNotMatch(current.stdout + current.stderr, /test-token-never-printed/);

    const stale = run('b'.repeat(40));
    assert.equal(stale.status, 78);
    assert.match(stale.stderr, /Skipping stale deployment/);

    const malformed = run('latest');
    assert.equal(malformed.status, 78);
    assert.match(malformed.stderr, /invalid master SHA/);
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
});

test('rollback candidate order prefers only a healthy Supabase image, then the explicit Supabase fallback', () => {
  const tempDir = mkdtempSync(path.join(os.tmpdir(), 'lunidex-rollback-candidates-test-'));
  try {
    const supabaseFallback = rollbackImageRef;
    const prior = `ghcr.io/teefloo/lunidex@sha256:${'a'.repeat(64)}`;
    const script = `source ${JSON.stringify(rollbackCandidatesPath)}; production_rollback_candidates "$@"`;
    const run = (...args) => spawnSync('bash', ['-c', script, 'rollback-test', ...args], {
      cwd: tempDir,
      encoding: 'utf8',
    });

    const healthy = run(prior, prior, 'true', 'healthy', supabaseFallback, 'supabase');
    assert.equal(healthy.status, 0);
    assert.deepEqual(healthy.stdout.trim().split('\n'), [prior, supabaseFallback]);

    const unhealthy = run(prior, prior, 'true', 'unhealthy', supabaseFallback, 'supabase');
    assert.equal(unhealthy.status, 0);
    assert.deepEqual(unhealthy.stdout.trim().split('\n'), [supabaseFallback]);

    const mismatchedContainer = run(prior, supabaseFallback, 'true', 'healthy', supabaseFallback, 'supabase');
    assert.equal(mismatchedContainer.status, 0);
    assert.deepEqual(mismatchedContainer.stdout.trim().split('\n'), [supabaseFallback]);

    const neonRuntime = run(prior, prior, 'true', 'healthy', supabaseFallback, 'neon');
    assert.equal(neonRuntime.status, 0);
    assert.deepEqual(neonRuntime.stdout.trim().split('\n'), [supabaseFallback]);

    const verifiedNeonFallback = run(prior, prior, 'true', 'healthy', '', 'neon',
      'neon-public-only:d0f5e1af2cf95dd43eb046069c0d37f0a2add93e');
    assert.equal(verifiedNeonFallback.status, 0);
    assert.deepEqual(verifiedNeonFallback.stdout.trim().split('\n'), [prior]);

    const unverifiedNeonFallback = run(prior, prior, 'true', 'healthy', '', 'neon', 'neon-public-only:wrong');
    assert.equal(unverifiedNeonFallback.status, 0);
    assert.equal(unverifiedNeonFallback.stdout.trim(), '');

    const invalidFallback = run(prior, prior, 'true', 'healthy', 'latest', 'supabase');
    assert.equal(invalidFallback.status, 64);

    const lastStableScript = `source ${JSON.stringify(rollbackCandidatesPath)}; production_last_stable_candidates "$@"`;
    const lastStable = spawnSync('bash', ['-c', lastStableScript, 'rollback-test', prior, supabaseFallback], {
      cwd: tempDir,
      encoding: 'utf8',
    });
    assert.equal(lastStable.status, 0);
    assert.deepEqual(lastStable.stdout.trim().split('\n'), [prior, supabaseFallback]);

    const missingPrevious = spawnSync('bash', ['-c', lastStableScript, 'rollback-test', 'mutable:latest', supabaseFallback], {
      cwd: tempDir,
      encoding: 'utf8',
    });
    assert.equal(missingPrevious.status, 0);
    assert.deepEqual(missingPrevious.stdout.trim().split('\n'), [supabaseFallback]);
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
});

test('historical d0f5 fallback requires the exact digest, source revision, Neon env, and Neon driver', () => {
  const tempDir = mkdtempSync(path.join(os.tmpdir(), 'lunidex-neon-fallback-test-'));
  try {
    const docker = path.join(tempDir, 'docker');
    const envFile = path.join(tempDir, 'app.env');
    const imageRef = `ghcr.io/teefloo/lunidex@sha256:${'d'.repeat(64)}`;
    writeFileSync(envFile, 'NEON_DATABASE_URL=postgres://synthetic.invalid/db\n', { mode: 0o600 });
    writeFileSync(docker, `#!/bin/sh
if [ "$1" = image ] && [ "$2" = inspect ]; then
  case "$4" in
    *RepoDigests*) printf '%s\\n' "$MOCK_REPO_DIGEST" ;;
    *org.opencontainers.image.revision*) printf '%s\\n' "$MOCK_REVISION" ;;
    *com.lunidex.backend*) printf '%s\\n' "$MOCK_BACKEND" ;;
  esac
  exit 0
fi
if [ "$1" = run ]; then [ "$MOCK_NEON_DRIVER" = true ]; exit $?; fi
exit 99
`, { mode: 0o700 });
    chmodSync(docker, 0o700);
    const run = (overrides = {}, inputRef = imageRef) => spawnSync('bash', [verifyNeonFallbackPath, inputRef, envFile], {
      cwd: tempDir,
      encoding: 'utf8',
      env: {
        ...process.env,
        PATH: `${tempDir}:${process.env.PATH ?? ''}`,
        MOCK_REPO_DIGEST: imageRef,
        MOCK_REVISION: 'd0f5e1af2cf95dd43eb046069c0d37f0a2add93e',
        MOCK_BACKEND: 'neon',
        MOCK_NEON_DRIVER: 'true',
        ...overrides,
      },
    });

    const verified = run();
    assert.equal(verified.status, 0);
    assert.equal(verified.stdout.trim(), 'neon-public-only:d0f5e1af2cf95dd43eb046069c0d37f0a2add93e');
    assert.doesNotMatch(verified.stdout + verified.stderr, /postgres:\/\//);

    assert.equal(run({ MOCK_REVISION: 'a'.repeat(40) }).status, 78);
    assert.equal(run({ MOCK_BACKEND: 'supabase' }).status, 78);
    assert.equal(run({ MOCK_REPO_DIGEST: 'ghcr.io/teefloo/lunidex@sha256:' + 'e'.repeat(64) }).status, 78);
    assert.equal(run({ MOCK_NEON_DRIVER: 'false' }).status, 1);
    assert.equal(run({}, 'ghcr.io/teefloo/lunidex:latest').status, 78);

    writeFileSync(envFile, 'SUPABASE_DATABASE_URL=postgres://synthetic.invalid/db\n', { mode: 0o600 });
    assert.equal(run().status, 78);
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
});

test('both in-script and post-deploy health failures roll back without using Supabase as an app failure signal', () => {
  const deploy = read(deployPath);
  const rollback = read(rollbackPath);
  const workflow = yaml.load(read(workflowPath));
  const steps = workflow.jobs.deploy.steps;
  const postDeployRollback = stepByName(steps, 'Roll back after a post-deploy health failure');
  const health = stepByName(steps, 'Verify the production deployment health');
  const publicHealth = stepByName(steps, 'Verify public HTTPS smoke routes');
  const providerProbe = stepByName(steps, 'Probe Supabase Auth separately from application health');
  const providerReport = stepByName(steps, 'Report Supabase availability independently of Node health');

  assert.match(deploy, /rollback_candidates\[@\]/);
  assert.match(deploy, /production_rollback_candidates/);
  assert.match(deploy, /wait_for_app[\s\\]*&& bash \/opt\/lunidex-production\/scripts\/deployment\/healthcheck-production\.sh/);
  assert.match(rollback, /--last-stable/);
  assert.match(rollback, /previous_kind="\$\(cat \.previous-image-backend/);
  assert.match(rollback, /verify-neon-public-only-image\.sh/);
  assert.match(rollback, /append_candidate "\$previous_ref" neon-public-only \.previous-app\.env/);
  assert.match(rollback, /append_candidate "\$previous_ref" supabase \.previous-app\.env/);
  assert.match(rollback, /install_app_env "\$env_file"/);
  assert.match(rollback, /Neon Auth and cloud data remain unavailable/);
  assert.match(rollback, /docker compose -f compose\.production\.yaml pull app[\s\S]*healthcheck-production\.sh/);
  assert.match(rollback, /healthcheck-production\.sh/);
  assert.equal(health.id, 'production_health');
  assert.equal(publicHealth.id, 'public_health');
  assert.match(postDeployRollback.if, /failure\(\)/);
  assert.match(postDeployRollback.if, /steps\.deploy_production\.outcome == 'success'/);
  assert.match(postDeployRollback.if, /steps\.production_health\.outcome == 'failure'/);
  assert.match(postDeployRollback.if, /steps\.public_health\.outcome == 'failure'/);
  assert.match(postDeployRollback.run, /rollback-production\.sh --last-stable/);
  assert.doesNotMatch(postDeployRollback.if, /supabase_auth_probe/);
  assert.equal(providerProbe['continue-on-error'], true);
  assert.match(providerProbe.if, /success\(\)/);
  assert.match(providerReport.run, /INCOMPLETE/);
  assert.match(providerReport.run, /case "\$SUPABASE_AUTH_PROBE_OUTCOME"/);
  assert.match(providerReport.if, /always\(\)/);
});

test('preflight explicitly publishes its candidate image to GHCR', () => {
  const workflow = yaml.load(read(workflowPath));
  const steps = workflow.jobs.deploy.steps;
  const build = stepByName(steps, 'Build and publish the candidate image');
  const report = stepByName(steps, 'Report isolated preflight boundary');

  assert.match(build.run, /docker buildx build[\s\S]*--push/);
  assert.match(report.run, /candidate image was built and published to GHCR/);
  assert.match(report.run, /no VPS[\s\S]*was accessed/);
  assert.match(report.if, /env\.DEPLOYMENT_MODE == 'preflight'/);
});

test('the deploy-only disk cleanup prunes dangling images only and keeps the pinned rollback image', () => {
  const workflow = yaml.load(read(workflowPath));
  const steps = workflow.jobs.deploy.steps;
  const bootstrapIndex = steps.findIndex((step) => step.name === 'Bootstrap the isolated production root through Docker');
  const pruneIndex = steps.findIndex((step) => step.name === 'Prune dangling images for production deploys');
  const transferIndex = steps.findIndex((step) => step.name === 'Transfer isolated production files and environment');
  const prune = stepByName(steps, 'Prune dangling images for production deploys');

  assert.ok(bootstrapIndex >= 0 && bootstrapIndex < pruneIndex && pruneIndex < transferIndex);
  assert.match(prune.if, /env\.DEPLOYMENT_MODE == 'deploy'/);
  assert.match(prune.run, /docker image prune --force --filter dangling=true/);
  assert.doesNotMatch(prune.run, /--all|\s-a\b|until=/);
  assert.doesNotMatch(prune.run, /docker system prune|docker container prune|docker volume prune/);
  assert.doesNotMatch(prune.run, /sha256:|Deleted Images|IMAGE ID/);
});

test('deployment atomically installs the pinned Supabase CA before stopping preproduction', () => {
  const workflow = yaml.load(read(workflowPath));
  const steps = workflow.jobs.deploy.steps;
  const transfer = stepByName(steps, 'Transfer isolated production files and environment');
  const verifyCa = stepByName(steps, 'Verify the preinstalled Supabase CA before stopping preproduction');
  const stopPreproduction = stepByName(steps, 'Stop preproduction before durable production deployment');
  const caRequirement = read(path.join(repositoryRoot, 'scripts/deployment/require-supabase-ca.sh'));
  const caValidator = read(path.join(repositoryRoot, 'scripts/deployment/verify-supabase-ca.sh'));

  assert.ok(steps.indexOf(transfer) < steps.indexOf(verifyCa));
  assert.ok(steps.indexOf(verifyCa) < steps.indexOf(stopPreproduction));
  assert.match(transfer.run, /scp[^\n]*\$RUNNER_TEMP\/lunidex-supabase-ca\.crt[^\n]*\$target:\$ca_staging_path/);
  assert.match(transfer.run, /install-supabase-ca\.sh/);
  assert.match(transfer.run, /verify-supabase-ca\.sh/);
  assert.match(verifyCa.run, /require-supabase-ca\.sh/);
  assert.match(caRequirement, /mode 0644 or 0444/);
  assert.match(caValidator, /openssl x509/);
  assert.doesNotMatch(caValidator, /cat |echo .*\$ca_file/);
});

test('preflight scripts fail closed before touching production paths', () => {
  const deploy = read(deployPath);
  const preflight = read(path.join(repositoryRoot, 'scripts/deployment/preflight-production.sh'));
  assert.ok(deploy.indexOf("if [[ \"$mode\" != 'deploy' ]]") < deploy.indexOf('cd /opt/lunidex-production'));
  assert.match(preflight, /retired and performs no reads or writes/);
});

test('application health and Supabase/Auth availability have independent verdicts', () => {
  const appHealth = read(appHealthPath);
  const authProbe = read(authProbePath);
  const workflow = read(workflowPath);

  assert.match(appHealth, /api\/healthz/);
  assert.doesNotMatch(appHealth, /SUPABASE_AUTH|SUPABASE_DATABASE_URL|check-neon-production/);
  assert.match(authProbe, /auth\/v1\/health/);
  assert.match(authProbe, /200\|204/);
  assert.doesNotMatch(authProbe, /Neon|quota/);
  assert.match(workflow, /Probe Supabase Auth separately from application health/);
  assert.match(workflow, /does not cause an app rollback/);
});

test('Supabase Auth health probe uses the public project key and reports reachability only', () => {
  const quota = runAuthProbe('402');
  assert.equal(quota.status, 1);
  assert.match(quota.stderr, /HTTP 402/);

  const reachable = runAuthProbe('200');
  assert.equal(reachable.status, 0);
  assert.match(reachable.stdout, /project publishable key.*provider reachability only/);
  assert.match(reachable.curlArgs, /apikey: synthetic-publishable-key/);

  const unavailable = runAuthProbe('503');
  assert.equal(unavailable.status, 1);
  assert.match(unavailable.stderr, /HTTP 503/);
});
