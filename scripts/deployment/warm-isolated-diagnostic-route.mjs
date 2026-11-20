export const WARMUP_TARGETS = Object.freeze({
  'tcg-card': Object.freeze({
    url: 'http://127.0.0.1:3000/en/tcg/cards/base1-4?tcgLang=en',
    egressPolicy: 'tcg',
    timeoutMs: 30_000,
    expectedContent: 'html',
  }),
  'pokemon-detail': Object.freeze({
    url: 'http://127.0.0.1:3000/en/pokemon/pikachu',
    egressPolicy: 'pokemon',
    timeoutMs: 125_000,
    expectedContent: 'html',
  }),
  healthz: Object.freeze({
    url: 'http://127.0.0.1:3000/api/healthz',
    egressPolicy: 'none',
    timeoutMs: 30_000,
    expectedContent: 'json',
  }),
  home: Object.freeze({
    url: 'http://127.0.0.1:3000/en',
    egressPolicy: 'none',
    timeoutMs: 30_000,
    expectedContent: 'html',
  }),
});

export const MAX_WARMUP_BODY_BYTES = 16 * 1024 * 1024;
const SUMMARY_KEYS = ['target', 'status', 'html', 'json', 'bytes'];

export class WarmupError extends Error {
  constructor(category) {
    super(category);
    this.name = 'WarmupError';
    this.category = category;
  }
}

export function getWarmupPlan(target) {
  return typeof target === 'string' && Object.hasOwn(WARMUP_TARGETS, target)
    ? WARMUP_TARGETS[target]
    : null;
}

export function validateWarmupSummary(summary, expectedTarget) {
  const plan = getWarmupPlan(expectedTarget);
  if (!plan || !summary || Object.keys(summary).length !== SUMMARY_KEYS.length) return false;
  if (Object.keys(summary).some((key) => !SUMMARY_KEYS.includes(key))) return false;
  return summary.target === expectedTarget
    && summary.status === 200
    && summary.html === (plan.expectedContent === 'html')
    && summary.json === (plan.expectedContent === 'json')
    && Number.isSafeInteger(summary.bytes)
    && summary.bytes > 0
    && summary.bytes <= MAX_WARMUP_BODY_BYTES;
}

async function readBoundedBody(response) {
  if (!response.body) return 0;
  const reader = response.body.getReader();
  let bytes = 0;
  try {
    for (;;) {
      const chunk = await reader.read();
      if (chunk.done) return bytes;
      bytes += chunk.value.byteLength;
      if (bytes > MAX_WARMUP_BODY_BYTES) {
        await reader.cancel().catch(() => undefined);
        throw new WarmupError('warmup_body_too_large');
      }
    }
  } finally {
    try {
      reader.releaseLock();
    } catch {
      // Cancellation can release the stream before this finally block.
    }
  }
}

export async function warmDiagnosticRoute({ target, egressPolicy, fetchImpl = fetch }) {
  const plan = getWarmupPlan(target);
  if (!plan || egressPolicy !== plan.egressPolicy) throw new WarmupError('warmup_configuration_invalid');

  let response;
  try {
    response = await fetchImpl(plan.url, {
      method: 'GET',
      headers: { accept: 'application/json', 'accept-language': 'en' },
      signal: AbortSignal.timeout(plan.timeoutMs),
    });
  } catch {
    throw new WarmupError('warmup_request_failed');
  }

  let bytes;
  try {
    bytes = await readBoundedBody(response);
  } catch (error) {
    if (error instanceof WarmupError) throw error;
    throw new WarmupError('warmup_response_invalid');
  }

  const contentType = (response.headers.get('content-type') ?? '').toLowerCase();
  const summary = {
    target,
    status: response.status,
    html: contentType.includes('text/html'),
    json: contentType.includes('application/json'),
    bytes,
  };
  if (!validateWarmupSummary(summary, target)) throw new WarmupError('warmup_response_invalid');
  return summary;
}

async function main() {
  const target = process.env.ISOLATED_TCG_TARGET ?? '';
  const egressPolicy = process.env.ISOLATED_EGRESS_POLICY ?? '';
  try {
    const summary = await warmDiagnosticRoute({ target, egressPolicy });
    process.stdout.write(`${JSON.stringify(summary)}\n`);
  } catch (error) {
    const category = error instanceof WarmupError
      ? error.category
      : 'warmup_request_failed';
    process.stderr.write(`diagnostic_warmup_error_category=${category}\n`);
    process.exitCode = category === 'warmup_configuration_invalid' ? 78 : 1;
  }
}

if (process.argv[1] === '-' || import.meta.url === `file://${process.argv[1]}`) {
  await main();
}
