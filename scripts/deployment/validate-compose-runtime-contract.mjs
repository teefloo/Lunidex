import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

export const EXPECTED_MEMORY_LIMIT_BYTES = 2176n * 1024n * 1024n;
export const EXPECTED_SUPABASE_CA_PATH = '/etc/ssl/certs/lunidex-supabase-ca.crt';
const EXPECTED_CPUS = 1;

function memoryLimitBytes(value) {
  if (typeof value === 'number') {
    return Number.isSafeInteger(value) && value >= 0 ? BigInt(value) : null;
  }

  if (typeof value !== 'string') return null;
  const input = value.trim();
  if (/^\d+$/.test(input)) return BigInt(input);

  const match = input.match(/^(\d+)(?:\.(\d+))?m$/i);
  if (!match) return null;

  const fraction = match[2] ?? '';
  const denominator = 10n ** BigInt(fraction.length);
  const amount = BigInt(match[1]) * denominator + BigInt(fraction || '0');
  const bytes = amount * 1024n * 1024n;
  return bytes % denominator === 0n ? bytes / denominator : null;
}

function cpuCount(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value !== 'string' || !/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(value.trim())) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function validateRenderedCompose(rendered, expectedImageRef) {
  const config = typeof rendered === 'string' ? JSON.parse(rendered) : rendered;
  const app = config?.services?.app ?? {};
  const caMount = Array.isArray(app.volumes)
    ? app.volumes.find((volume) => volume?.type === 'bind'
      && volume.target === EXPECTED_SUPABASE_CA_PATH
      && typeof volume.source === 'string'
      && path.isAbsolute(volume.source ?? '')
      && path.basename(volume.source) === 'supabase-ca.crt')
    : null;
  const caMountReadOnly = caMount?.read_only === true && caMount.bind?.create_host_path === false;
  const nodeExtraCaCerts = app.environment?.NODE_EXTRA_CA_CERTS ?? null;
  const actual = {
    image: app.image ?? null,
    mem_limit: app.mem_limit ?? null,
    cpus: app.cpus ?? null,
    ca_mount_read_only: caMountReadOnly,
    node_extra_ca_certs: nodeExtraCaCerts,
  };
  const actualMemoryBytes = memoryLimitBytes(actual.mem_limit);
  const actualCpus = cpuCount(actual.cpus);

  return {
    ok: actual.image === expectedImageRef
      && actualMemoryBytes === EXPECTED_MEMORY_LIMIT_BYTES
      && actualCpus === EXPECTED_CPUS
      && actual.ca_mount_read_only
      && actual.node_extra_ca_certs === EXPECTED_SUPABASE_CA_PATH,
    actual: {
      ...actual,
      mem_limit_bytes: actualMemoryBytes?.toString() ?? null,
      cpus_number: actualCpus,
    },
  };
}

function isDirectExecution() {
  const scriptPath = process.argv[1];
  return scriptPath && import.meta.url === pathToFileURL(path.resolve(scriptPath)).href;
}

if (isDirectExecution()) {
  const [renderedPath, expectedImageRef] = process.argv.slice(2);
  if (!renderedPath || !expectedImageRef) {
    console.error('Usage: validate-compose-runtime-contract.mjs <rendered-compose.json> <expected-image-ref>');
    process.exit(64);
  }

  const rendered = readFileSync(renderedPath, 'utf8');
  const result = validateRenderedCompose(rendered, expectedImageRef);
  if (!result.ok) {
    console.error('The production Compose rendering did not match the immutable image and bounded runtime contract.');
    console.error(`Actual services.app values: image=${JSON.stringify(result.actual.image)} mem_limit=${JSON.stringify(result.actual.mem_limit)} mem_limit_bytes=${result.actual.mem_limit_bytes ?? 'invalid'} cpus=${JSON.stringify(result.actual.cpus)} ca_mount_read_only=${result.actual.ca_mount_read_only} NODE_EXTRA_CA_CERTS=${JSON.stringify(result.actual.node_extra_ca_certs)}.`);
    console.error(`Expected: image=${JSON.stringify(expectedImageRef)} mem_limit_bytes=${EXPECTED_MEMORY_LIMIT_BYTES} cpus=${EXPECTED_CPUS}.`);
    process.exit(78);
  }
}
