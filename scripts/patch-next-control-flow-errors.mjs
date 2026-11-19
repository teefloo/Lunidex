import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REQUIRED_NEXT_VERSION = '16.4.5';

const PATCHES = [
  {
    relativePath:
      'node_modules/next/dist/compiled/react-server-dom-webpack/cjs/react-server-dom-webpack-server.node.production.js',
    before: `request.cacheController.abort(
        Error(
          "This render completed successfully. All cacheSignals are now aborted to allow clean up of any unused resources."
        )
      ),`,
    after: `request.cacheController.abort(
        (() => {
          // LUNIDEX_NEXT_CONTROL_FLOW_STACK_PATCH: materialize only this internal abort reason.
          const cacheSignalAbortReason = Error(
            "This render completed successfully. All cacheSignals are now aborted to allow clean up of any unused resources."
          );
          void cacheSignalAbortReason.stack;
          return cacheSignalAbortReason;
        })()
      ),`,
  },
  {
    relativePath: 'node_modules/next/dist/compiled/next-server/app-page.runtime.prod.js',
    before: `cacheController.abort(Error("This render completed successfully. All cacheSignals are now aborted to allow clean up of any unused resources."))`,
    after: `cacheController.abort((()=>{const cacheSignalAbortReason=Error("This render completed successfully. All cacheSignals are now aborted to allow clean up of any unused resources.");/* LUNIDEX_NEXT_CONTROL_FLOW_STACK_PATCH */void cacheSignalAbortReason.stack;return cacheSignalAbortReason})())`,
  },
  {
    relativePath: 'node_modules/next/dist/server/app-render/dynamic-rendering.js',
    before: `function createPrerenderInterruptedError(message) {
    const error = new Error(message);
    error.digest = NEXT_PRERENDER_INTERRUPTED;
    return error;
}`,
    after: `function createPrerenderInterruptedError(message) {
    const error = new Error(message);
    // LUNIDEX_NEXT_CONTROL_FLOW_STACK_PATCH: this sentinel error is stored as an abort reason.
    void error.stack;
    error.digest = NEXT_PRERENDER_INTERRUPTED;
    return error;
}`,
  },
];

function countOccurrences(fileContents, needle) {
  return fileContents.split(needle).length - 1;
}

async function validateAndPlanPatch(root, patch) {
  const filePath = path.join(root, patch.relativePath);
  const original = await readFile(filePath, 'utf8');
  const beforeCount = countOccurrences(original, patch.before);
  const afterCount = countOccurrences(original, patch.after);

  if (beforeCount === 1 && afterCount === 0) {
    return { filePath, content: original.replace(patch.before, patch.after), changed: true };
  }

  if (beforeCount === 0 && afterCount === 1) {
    return { filePath, content: original, changed: false };
  }

  throw new Error(
    `Refusing to patch ${patch.relativePath}: unexpected source content ` +
      `(unpatched matches: ${beforeCount}, patched matches: ${afterCount}).`,
  );
}

/**
 * Materialize stacks only for Next.js internal control-flow abort reasons whose
 * lazy V8 CallSite objects are retained through abort-signal reasons. The
 * successful-render reason exists in both the standalone RSC package and the
 * bundled App Router runtime, so both copies must receive the same patch.
 *
 * @param {string} projectRoot Root containing node_modules/next.
 * @returns {Promise<{ changed: number }>} Number of vendored files changed.
 */
export async function applyNextControlFlowErrorPatch(projectRoot = process.cwd()) {
  const root = path.resolve(projectRoot);
  const nextPackagePath = path.join(root, 'node_modules/next/package.json');
  const nextPackage = JSON.parse(await readFile(nextPackagePath, 'utf8'));

  if (nextPackage.name !== 'next' || nextPackage.version !== REQUIRED_NEXT_VERSION) {
    throw new Error(
      `This workaround is guarded for Next.js ${REQUIRED_NEXT_VERSION}; found ${nextPackage.version ?? 'an unknown version'}.`,
    );
  }

  // Validate every expected upstream fragment before writing any file. A changed
  // Next.js package therefore fails closed instead of receiving a partial patch.
  const plans = await Promise.all(PATCHES.map((patch) => validateAndPlanPatch(root, patch)));
  const changedPlans = plans.filter((plan) => plan.changed);

  for (const plan of changedPlans) {
    const temporaryDirectory = `${plan.filePath}.lunidex-patch-tmp`;
    const temporaryFile = path.join(temporaryDirectory, path.basename(plan.filePath));

    await mkdir(temporaryDirectory, { recursive: true });
    try {
      await writeFile(temporaryFile, plan.content, 'utf8');
      await rename(temporaryFile, plan.filePath);
    } finally {
      await rm(temporaryDirectory, { recursive: true, force: true });
    }
  }

  return { changed: changedPlans.length };
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) {
  try {
    const { changed } = await applyNextControlFlowErrorPatch();
    console.log(
      changed === 0
        ? `Next.js ${REQUIRED_NEXT_VERSION} control-flow stack patch is already applied.`
        : `Applied the guarded Next.js ${REQUIRED_NEXT_VERSION} control-flow stack patch to ${changed} file(s).`,
    );
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
