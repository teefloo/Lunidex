import { setTimeout as delay } from 'node:timers/promises';

export const DIAGNOSTIC_ROUTE = 'http://127.0.0.1:3000/en/tcg/cards/base1-4?tcgLang=en';
const ROUTE = DIAGNOSTIC_ROUTE;
const INSPECTOR_VERSION = 'http://127.0.0.1:9229/json/version';
export const DIAGNOSTIC_LIMITS = Object.freeze({
  durationSeconds: 900,
  concurrency: 32,
  maxAttempts: 7_200,
  workerIntervalMs: 4_000,
  abortAfterMs: 60,
});
const MAX_DURATION_SECONDS = DIAGNOSTIC_LIMITS.durationSeconds;
const SAMPLE_INTERVAL_MS = 60_000;
const MAX_RESPONSE_BYTES = 8 * 1024 * 1024;
const REQUEST_TIMEOUT_MS = 20_000;
const STATUSES = ['2xx', '3xx', '4xx', '5xx', 'other'];

function boundedInteger(value, minimum, maximum) {
  if (!Number.isInteger(value) || value < minimum || value > maximum) return null;
  return value;
}

function statusBucket(status) {
  if (status >= 200 && status < 300) return '2xx';
  if (status >= 300 && status < 400) return '3xx';
  if (status >= 400 && status < 500) return '4xx';
  if (status >= 500 && status < 600) return '5xx';
  return 'other';
}

function emptySummary(phase, durationSeconds) {
  return {
    phase,
    duration_seconds: durationSeconds,
    worker_concurrency: DIAGNOSTIC_LIMITS.concurrency,
    max_attempts: DIAGNOSTIC_LIMITS.maxAttempts,
    worker_interval_ms: DIAGNOSTIC_LIMITS.workerIntervalMs,
    abort_after_ms: DIAGNOSTIC_LIMITS.abortAfterMs,
    attempts: 0,
    statuses: Object.fromEntries(STATUSES.map((status) => [status, 0])),
    request_errors: 0,
    completed_responses: 0,
    responses_aborted: 0,
    response_bytes: 0,
    oversized_responses: 0,
    memory_samples: [],
  };
}

function safeNumber(value) {
  return Number.isSafeInteger(value) && value >= 0 ? value : null;
}

export function validateOutput(summary) {
  if (!summary || !['full', 'abort'].includes(summary.phase)) return false;
  const allowedSummaryKeys = [
    'phase',
    'duration_seconds',
    'worker_concurrency',
    'max_attempts',
    'worker_interval_ms',
    'abort_after_ms',
    'attempts',
    'statuses',
    'request_errors',
    'completed_responses',
    'responses_aborted',
    'response_bytes',
    'oversized_responses',
    'memory_samples',
  ];
  if (Object.keys(summary).some((key) => !allowedSummaryKeys.includes(key))) return false;
  if (summary.worker_concurrency !== DIAGNOSTIC_LIMITS.concurrency) return false;
  if (summary.max_attempts !== DIAGNOSTIC_LIMITS.maxAttempts) return false;
  if (summary.worker_interval_ms !== DIAGNOSTIC_LIMITS.workerIntervalMs) return false;
  if (summary.abort_after_ms !== DIAGNOSTIC_LIMITS.abortAfterMs) return false;
  if (boundedInteger(summary.duration_seconds, 1, MAX_DURATION_SECONDS) === null) return false;
  if (boundedInteger(summary.attempts, 0, DIAGNOSTIC_LIMITS.maxAttempts) === null) return false;
  if (!summary.statuses || Object.keys(summary.statuses).some((key) => !STATUSES.includes(key))) return false;
  if (STATUSES.some((key) => boundedInteger(summary.statuses[key], 0, summary.attempts) === null)) return false;
  if (boundedInteger(summary.request_errors, 0, summary.attempts) === null) return false;
  if (boundedInteger(summary.completed_responses, 0, summary.attempts) === null) return false;
  if (boundedInteger(summary.responses_aborted, 0, summary.attempts) === null) return false;
  if (boundedInteger(summary.response_bytes, 0, Number.MAX_SAFE_INTEGER) === null) return false;
  if (boundedInteger(summary.oversized_responses, 0, summary.attempts) === null) return false;
  if (!Array.isArray(summary.memory_samples) || summary.memory_samples.length > 16) return false;

  const allowedMemoryKeys = ['elapsed_seconds', 'rss', 'heapTotal', 'heapUsed', 'external', 'arrayBuffers', 'heapLimit'];
  for (const sample of summary.memory_samples) {
    if (!sample || Object.keys(sample).some((key) => !allowedMemoryKeys.includes(key))) return false;
    if (boundedInteger(sample.elapsed_seconds, 0, MAX_DURATION_SECONDS) === null) return false;
    for (const key of allowedMemoryKeys.slice(1)) {
      if (safeNumber(sample[key]) === null) return false;
    }
  }

  return true;
}

class InspectorSession {
  constructor(socket) {
    this.socket = socket;
    this.nextId = 1;
    this.pending = new Map();
    this.onMessage = (event) => {
      let message;
      try {
        message = JSON.parse(String(event.data));
      } catch {
        return;
      }
      if (typeof message.id !== 'number') return;
      const resolve = this.pending.get(message.id);
      if (!resolve) return;
      this.pending.delete(message.id);
      resolve(message);
    };
    this.socket.addEventListener('message', this.onMessage);
  }

  async command(method, params = {}) {
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error('inspector_timeout'));
      }, 10_000);
      this.pending.set(id, (message) => {
        clearTimeout(timer);
        if (message.error) reject(new Error('inspector_command_failed'));
        else resolve(message.result);
      });
      this.socket.send(JSON.stringify({ id, method, params }));
    });
  }

  close() {
    this.socket.removeEventListener('message', this.onMessage);
    this.socket.close();
  }
}

async function connectInspector() {
  const response = await fetch(INSPECTOR_VERSION, { signal: AbortSignal.timeout(5_000) });
  if (!response.ok) throw new Error('inspector_unavailable');
  const body = await response.json();
  if (typeof body.webSocketDebuggerUrl !== 'string') throw new Error('inspector_unavailable');
  const socket = new WebSocket(body.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('inspector_timeout')), 5_000);
    socket.addEventListener('open', () => {
      clearTimeout(timer);
      resolve();
    }, { once: true });
    socket.addEventListener('error', () => {
      clearTimeout(timer);
      reject(new Error('inspector_unavailable'));
    }, { once: true });
  });
  return new InspectorSession(socket);
}

async function sampleMemory(session, elapsedSeconds) {
  await session.command('HeapProfiler.collectGarbage');
  const result = await session.command('Runtime.evaluate', {
    expression: `(() => { global.gc(); const m = process.memoryUsage(); const h = process.getBuiltinModule('node:v8').getHeapStatistics(); return { rss: m.rss, heapTotal: m.heapTotal, heapUsed: m.heapUsed, external: m.external, arrayBuffers: m.arrayBuffers, heapLimit: h.heap_size_limit }; })()`,
    returnByValue: true,
    awaitPromise: true,
  });
  const value = result?.result?.value;
  if (!value || typeof value !== 'object') throw new Error('memory_sample_unavailable');
  const sample = {
    elapsed_seconds: elapsedSeconds,
    rss: safeNumber(value.rss),
    heapTotal: safeNumber(value.heapTotal),
    heapUsed: safeNumber(value.heapUsed),
    external: safeNumber(value.external),
    arrayBuffers: safeNumber(value.arrayBuffers),
    heapLimit: safeNumber(value.heapLimit),
  };
  if (Object.values(sample).some((item) => item === null)) throw new Error('memory_sample_unavailable');
  return sample;
}

async function requestAbort(summary) {
  const startedAt = Date.now();
  const controller = new AbortController();
  let reader;
  let didAbort = false;
  let abortRecorded = false;
  let completed = false;
  const recordAbort = () => {
    if (abortRecorded) return;
    abortRecorded = true;
    summary.responses_aborted += 1;
  };
  const abortTimer = setTimeout(() => {
    if (!completed) {
      didAbort = true;
      controller.abort();
    }
  }, DIAGNOSTIC_LIMITS.abortAfterMs);

  try {
    const response = await fetch(ROUTE, {
      method: 'GET',
      headers: { accept: 'application/json', 'accept-language': 'en' },
      signal: controller.signal,
    });
    summary.statuses[statusBucket(response.status)] += 1;
    reader = response.body?.getReader();
    if (!reader) {
      completed = true;
      summary.completed_responses += 1;
      return;
    }

    const first = await reader.read();
    if (first.done) {
      if (didAbort || controller.signal.aborted) {
        recordAbort();
        return;
      }
      completed = true;
      summary.completed_responses += 1;
      return;
    }
    summary.response_bytes += Math.min(first.value.byteLength, MAX_RESPONSE_BYTES);

    const remaining = DIAGNOSTIC_LIMITS.abortAfterMs - (Date.now() - startedAt);
    if (remaining > 0) await delay(remaining);
    if (!didAbort && !completed) {
      didAbort = true;
      controller.abort();
    }
    if (didAbort) recordAbort();
    await reader.cancel().catch(() => undefined);
  } catch {
    if (didAbort || controller.signal.aborted) recordAbort();
    else summary.request_errors += 1;
  } finally {
    clearTimeout(abortTimer);
    try {
      reader?.releaseLock();
    } catch {
      // The abort may have already released the stream reader.
    }
  }
}

async function requestFull(summary) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(ROUTE, {
      method: 'GET',
      headers: { accept: 'application/json', 'accept-language': 'en' },
      signal: controller.signal,
    });
    summary.statuses[statusBucket(response.status)] += 1;
    const reader = response.body?.getReader();
    if (!reader) {
      summary.completed_responses += 1;
      return;
    }

    let responseBytes = 0;
    try {
      for (;;) {
        const chunk = await reader.read();
        if (chunk.done) {
          summary.completed_responses += 1;
          break;
        }
        responseBytes += chunk.value.byteLength;
        if (responseBytes > MAX_RESPONSE_BYTES) {
          summary.oversized_responses += 1;
          await reader.cancel();
          break;
        }
      }
    } finally {
      summary.response_bytes += Math.min(responseBytes, MAX_RESPONSE_BYTES);
      reader.releaseLock();
    }
  } catch {
    summary.request_errors += 1;
  } finally {
    clearTimeout(timeout);
  }
}

async function requestOnce(mode, summary) {
  if (mode === 'abort') return requestAbort(summary);
  return requestFull(summary);
}

export async function runPhase({ mode, durationSeconds }) {
  if (!['full', 'abort'].includes(mode)) throw new Error('invalid_phase');
  if (boundedInteger(durationSeconds, 1, MAX_DURATION_SECONDS) === null) throw new Error('invalid_duration');

  const summary = emptySummary(mode, durationSeconds);
  const startedAt = Date.now();
  const endAt = startedAt + durationSeconds * 1_000;
  let inspector;
  try {
    inspector = await connectInspector();
  } catch {
    // Keep request/load evidence even if inspector access is unavailable.
  }

  let nextSampleAt = startedAt;
  let nextAttempt = 0;
  const worker = async () => {
    while (Date.now() < endAt && nextAttempt < DIAGNOSTIC_LIMITS.maxAttempts) {
      const iterationStartedAt = Date.now();
      nextAttempt += 1;
      summary.attempts += 1;
      await requestOnce(mode, summary);

      const remaining = DIAGNOSTIC_LIMITS.workerIntervalMs - (Date.now() - iterationStartedAt);
      if (remaining > 0) await delay(remaining);
    }
  };
  const workers = Array.from({ length: DIAGNOSTIC_LIMITS.concurrency }, () => worker());

  try {
    while (Date.now() < endAt) {
      if (inspector && Date.now() >= nextSampleAt && summary.memory_samples.length < 16) {
        try {
          const elapsed = Math.floor((Date.now() - startedAt) / 1_000);
          summary.memory_samples.push(await sampleMemory(inspector, elapsed));
        } catch {
          inspector.close();
          inspector = undefined;
        }
        nextSampleAt = Date.now() + SAMPLE_INTERVAL_MS;
      }
      await delay(Math.min(1_000, Math.max(1, endAt - Date.now())));
    }
    await Promise.all(workers);
  } finally {
    inspector?.close();
  }

  if (!validateOutput(summary)) throw new Error('summary_validation_failed');
  return summary;
}

async function main() {
  const mode = process.env.ISOLATED_TCG_PHASE;
  const durationSeconds = Number(process.env.ISOLATED_TCG_DURATION_SECONDS ?? '900');
  if (!['full', 'abort'].includes(mode) || boundedInteger(durationSeconds, 1, MAX_DURATION_SECONDS) === null) {
    process.stderr.write('invalid_diagnostic_configuration\n');
    process.exitCode = 78;
    return;
  }

  try {
    const summary = await runPhase({ mode, durationSeconds });
    process.stdout.write(`${JSON.stringify(summary)}\n`);
  } catch {
    process.stderr.write('diagnostic_phase_failed\n');
    process.exitCode = 1;
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await main();
}
