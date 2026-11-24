import { pathToFileURL } from 'node:url';
import path from 'node:path';

const IMAGE_REPOSITORY = 'ghcr.io/teefloo/lunidex';

export function resolveCandidateImageRef(digest) {
  if (typeof digest !== 'string' || !/^sha256:[0-9a-f]{64}$/.test(digest)) {
    throw new TypeError('Candidate image must be supplied as a lowercase sha256 digest.');
  }

  return `${IMAGE_REPOSITORY}@${digest}`;
}

function isDirectExecution() {
  const scriptPath = process.argv[1];
  return scriptPath && import.meta.url === pathToFileURL(path.resolve(scriptPath)).href;
}

if (isDirectExecution()) {
  const [digest] = process.argv.slice(2);
  try {
    process.stdout.write(`${resolveCandidateImageRef(digest)}\n`);
  } catch (error) {
    console.error(error instanceof Error ? error.message : 'Invalid candidate image digest.');
    process.exit(78);
  }
}
