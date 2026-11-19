import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile, mkdir } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { applyNextControlFlowErrorPatch } from './patch-next-control-flow-errors.mjs';

const nextTarget =
  'node_modules/next/dist/compiled/react-server-dom-webpack/cjs/react-server-dom-webpack-server.node.production.js';
const dynamicRenderingTarget = 'node_modules/next/dist/server/app-render/dynamic-rendering.js';

const reactSource = `function flushCompletedChunks(request) {
      request.cacheController.abort(
        Error(
          "This render completed successfully. All cacheSignals are now aborted to allow clean up of any unused resources."
        )
      ),
}
`;

const dynamicRenderingSource = `const NEXT_PRERENDER_INTERRUPTED = 'NEXT_PRERENDER_INTERRUPTED';
function createPrerenderInterruptedError(message) {
    const error = new Error(message);
    error.digest = NEXT_PRERENDER_INTERRUPTED;
    return error;
}
function throwApplicationError() {
    throw new Error('ordinary application error');
}
`;

async function createFixture({ version = '16.4.5', react = reactSource, dynamic = dynamicRenderingSource } = {}) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'lunidex-next-patch-'));
  const nextDir = path.join(root, 'node_modules/next');
  await mkdir(path.join(nextDir, 'dist/compiled/react-server-dom-webpack/cjs'), { recursive: true });
  await mkdir(path.join(nextDir, 'dist/server/app-render'), { recursive: true });
  await writeFile(path.join(nextDir, 'package.json'), JSON.stringify({ name: 'next', version }));
  await writeFile(path.join(root, nextTarget), react);
  await writeFile(path.join(root, dynamicRenderingTarget), dynamic);
  return root;
}

test('patches only the guarded Next 16.4.5 internal abort errors', async (t) => {
  const root = await createFixture();
  t.after(() => rm(root, { recursive: true, force: true }));
  const stackTraceLimit = Error.stackTraceLimit;

  const result = await applyNextControlFlowErrorPatch(root);
  const reactPatched = await readFile(path.join(root, nextTarget), 'utf8');
  const dynamicPatched = await readFile(path.join(root, dynamicRenderingTarget), 'utf8');

  assert.equal(result.changed, 2);
  assert.match(reactPatched, /void cacheSignalAbortReason\.stack;/);
  assert.match(reactPatched, /return cacheSignalAbortReason;\s+}\)\(\)\s+\),/);
  assert.match(dynamicPatched, /void error\.stack;/);
  assert.match(dynamicPatched, /error\.digest = NEXT_PRERENDER_INTERRUPTED;/);
  assert.match(dynamicPatched, /throw new Error\('ordinary application error'\)/);
  assert.equal(Error.stackTraceLimit, stackTraceLimit);
});

test('is idempotent', async (t) => {
  const root = await createFixture();
  t.after(() => rm(root, { recursive: true, force: true }));

  await applyNextControlFlowErrorPatch(root);
  const secondRun = await applyNextControlFlowErrorPatch(root);

  assert.equal(secondRun.changed, 0);
});

test('fails closed on an unsupported Next version without writing files', async (t) => {
  const root = await createFixture({ version: '16.4.6' });
  t.after(() => rm(root, { recursive: true, force: true }));
  const originalReact = await readFile(path.join(root, nextTarget), 'utf8');
  const originalDynamic = await readFile(path.join(root, dynamicRenderingTarget), 'utf8');

  await assert.rejects(() => applyNextControlFlowErrorPatch(root), /guarded for Next\.js 16\.4\.5/);
  assert.equal(await readFile(path.join(root, nextTarget), 'utf8'), originalReact);
  assert.equal(await readFile(path.join(root, dynamicRenderingTarget), 'utf8'), originalDynamic);
});

test('fails closed on upstream content drift without partially patching other files', async (t) => {
  const root = await createFixture({ dynamic: dynamicRenderingSource.replace('error.digest', 'error.code') });
  t.after(() => rm(root, { recursive: true, force: true }));
  const originalReact = await readFile(path.join(root, nextTarget), 'utf8');
  const originalDynamic = await readFile(path.join(root, dynamicRenderingTarget), 'utf8');

  await assert.rejects(() => applyNextControlFlowErrorPatch(root), /unexpected source content/);
  assert.equal(await readFile(path.join(root, nextTarget), 'utf8'), originalReact);
  assert.equal(await readFile(path.join(root, dynamicRenderingTarget), 'utf8'), originalDynamic);
});

test('Docker dependency stage includes the postinstall patch helper before npm ci', async () => {
  const dockerfile = await readFile(new URL('../Dockerfile', import.meta.url), 'utf8');
  const dependencyStage = dockerfile.match(/^FROM base AS deps([\s\S]*?)(?=^FROM base AS builder)/m)?.[1];

  assert.ok(dependencyStage, 'Dockerfile must include a deps stage before the builder stage');
  const helperCopy = dependencyStage.indexOf('COPY scripts/patch-next-control-flow-errors.mjs ./scripts/');
  const npmInstall = dependencyStage.indexOf('RUN npm ci');

  assert.ok(helperCopy >= 0 && helperCopy < npmInstall, 'the root postinstall helper must be copied before npm ci');
});
