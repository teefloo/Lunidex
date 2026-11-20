import { setTimeout as delay } from 'node:timers/promises';
import { performance } from 'node:perf_hooks';

export const DIAGNOSTIC_TARGETS = Object.freeze({
  'tcg-card': 'http://127.0.0.1:3000/en/tcg/cards/base1-4?tcgLang=en',
  'pokemon-detail': 'http://127.0.0.1:3000/en/pokemon/pikachu',
  healthz: 'http://127.0.0.1:3000/api/healthz',
  home: 'http://127.0.0.1:3000/en',
});
export const DIAGNOSTIC_ROUTE = DIAGNOSTIC_TARGETS['tcg-card'];
export function resolveDiagnosticTarget(target) {
  return Object.hasOwn(DIAGNOSTIC_TARGETS, target) ? DIAGNOSTIC_TARGETS[target] : null;
}
const INSPECTOR_TARGETS = 'http://127.0.0.1:9229/json/list';
export const DIAGNOSTIC_LIMITS = Object.freeze({
  durationSeconds: 3_600,
  concurrency: 32,
  maxAttempts: 28_800,
  workerIntervalMs: 4_000,
  abortAfterMs: 60,
});
const MAX_DURATION_SECONDS = DIAGNOSTIC_LIMITS.durationSeconds;
const SAMPLE_INTERVAL_MS = 30_000;
const TIME_BUCKET_INTERVAL_SECONDS = 30;
const MAX_RESPONSE_BYTES = 8 * 1024 * 1024;
const REQUEST_TIMEOUT_MS = 20_000;
const RECOVERY_WINDOW_SECONDS = 30;
const MAX_PHASE_ELAPSED_SECONDS = MAX_DURATION_SECONDS + (REQUEST_TIMEOUT_MS / 1_000) + RECOVERY_WINDOW_SECONDS;
const MAX_MEMORY_SAMPLES = 123;
const MAX_TIME_SERIES_BUCKETS = 120;
const STATUSES = ['2xx', '3xx', '4xx', '5xx', 'other'];
const TIME_SERIES_FIELDS = [
  'elapsed_bucket_seconds',
  'attempts',
  '2xx', '3xx', '4xx', '5xx', 'other',
  'completed_responses',
  'responses_aborted',
  'responses_limited',
  'request_errors',
  'network_errors',
  'timeout_errors',
  'read_errors',
  'server_errors',
];
const INSPECTOR_FAILURE_CATEGORIES = [
  'inspector_endpoint_unreachable',
  'inspector_http_error',
  'inspector_response_invalid',
  'inspector_target_not_loopback',
  'inspector_websocket_error',
  'inspector_connect_timeout',
  'inspector_socket_closed',
  'inspector_command_timeout',
  'inspector_command_failed',
  'inspector_evaluation_failed',
  'inspector_identity_invalid',
  'inspector_target_not_app',
  'inspector_gc_unavailable',
  'inspector_memory_sample_invalid',
];

export class DiagnosticError extends Error {
  constructor(category) {
    super(category);
    this.name = 'DiagnosticError';
    this.category = category;
  }
}

function fail(category) {
  throw new DiagnosticError(category);
}

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

function createTimeBucket(elapsedBucketSeconds) {
  return {
    elapsed_bucket_seconds: elapsedBucketSeconds,
    attempts: 0,
    statuses: Object.fromEntries(STATUSES.map((status) => [status, 0])),
    completed_responses: 0,
    responses_aborted: 0,
    responses_limited: 0,
    request_errors: 0,
    network_errors: 0,
    timeout_errors: 0,
    read_errors: 0,
    server_errors: 0,
  };
}

function emptySummary(phase, durationSeconds, concurrency, maxAttempts, target) {
  return {
    phase,
    route_target: target,
    duration_seconds: durationSeconds,
    elapsed_seconds: 0,
    worker_concurrency: concurrency,
    max_attempts: maxAttempts,
    worker_interval_ms: DIAGNOSTIC_LIMITS.workerIntervalMs,
    abort_after_ms: DIAGNOSTIC_LIMITS.abortAfterMs,
    attempts: 0,
    statuses: Object.fromEntries(STATUSES.map((status) => [status, 0])),
    request_errors: 0,
    network_errors: 0,
    timeout_errors: 0,
    read_errors: 0,
    server_errors: 0,
    completed_responses: 0,
    responses_aborted: 0,
    responses_limited: 0,
    response_bytes: 0,
    oversized_responses: 0,
    inspector: {
      target_pid: 0,
      target_executable: 'node',
      target_script: 'server.js',
      failure_category: null,
    },
    memory_samples: [],
    time_series_fields: TIME_SERIES_FIELDS,
    time_series: [],
  };
}

function safeNumber(value) {
  return Number.isSafeInteger(value) && value >= 0 ? value : null;
}

function incrementError(summary, bucket, kind) {
  summary.request_errors += 1;
  bucket.request_errors += 1;
  if (kind === 'network') {
    summary.network_errors += 1;
    bucket.network_errors += 1;
  } else if (kind === 'timeout') {
    summary.timeout_errors += 1;
    bucket.timeout_errors += 1;
  } else {
    summary.read_errors += 1;
    bucket.read_errors += 1;
  }
}

function addAttempt(summary, startedAt) {
  const elapsed = Math.max(0, Math.floor((performance.now() - startedAt) / 1_000));
  const elapsedBucketSeconds = Math.min(
    (MAX_TIME_SERIES_BUCKETS - 1) * TIME_BUCKET_INTERVAL_SECONDS,
    Math.floor(elapsed / TIME_BUCKET_INTERVAL_SECONDS) * TIME_BUCKET_INTERVAL_SECONDS,
  );
  let bucket = summary.time_series.at(-1);
  if (!bucket || bucket.elapsed_bucket_seconds !== elapsedBucketSeconds) {
    bucket = createTimeBucket(elapsedBucketSeconds);
    summary.time_series.push(bucket);
  }
  summary.attempts += 1;
  bucket.attempts += 1;
  return bucket;
}

function nextSampleElapsedSeconds(summary, startedAt) {
  const elapsed = Math.floor((performance.now() - startedAt) / 1_000);
  const previous = summary.memory_samples.at(-1)?.elapsed_seconds ?? -1;
  return Math.max(elapsed, previous + 1);
}

function addStatus(summary, bucket, status) {
  const kind = statusBucket(status);
  summary.statuses[kind] += 1;
  bucket.statuses[kind] += 1;
  if (kind === '5xx') {
    summary.server_errors += 1;
    bucket.server_errors += 1;
  }
}

const SUMMARY_KEYS = [
  'phase',
  'route_target',
  'duration_seconds',
  'elapsed_seconds',
  'worker_concurrency',
  'max_attempts',
  'worker_interval_ms',
  'abort_after_ms',
  'attempts',
  'statuses',
  'request_errors',
  'network_errors',
  'timeout_errors',
  'read_errors',
  'server_errors',
  'completed_responses',
  'responses_aborted',
  'responses_limited',
  'response_bytes',
  'oversized_responses',
  'inspector',
  'memory_samples',
  'time_series_fields',
  'time_series',
];
const MEMORY_KEYS = ['elapsed_seconds', 'phase', 'raw', 'post_gc'];
const MEMORY_VALUE_KEYS = ['rss', 'heapTotal', 'heapUsed', 'external', 'arrayBuffers', 'heap_size_limit'];
export function validateOutput(summary) {
  if (!summary || !['full', 'abort'].includes(summary.phase)) return false;
  if (Object.keys(summary).some((key) => !SUMMARY_KEYS.includes(key))) return false;
  if (!Object.hasOwn(DIAGNOSTIC_TARGETS, summary.route_target)) return false;
  if (boundedInteger(summary.worker_concurrency, 1, DIAGNOSTIC_LIMITS.concurrency) === null) return false;
  if (summary.worker_interval_ms !== DIAGNOSTIC_LIMITS.workerIntervalMs) return false;
  if (summary.abort_after_ms !== DIAGNOSTIC_LIMITS.abortAfterMs) return false;
  if (boundedInteger(summary.duration_seconds, 1, MAX_DURATION_SECONDS) === null) return false;
  if (boundedInteger(summary.elapsed_seconds, 0, MAX_PHASE_ELAPSED_SECONDS) === null) return false;
  const expectedMaxAttempts = summary.worker_concurrency * Math.ceil((summary.duration_seconds * 1_000) / summary.worker_interval_ms);
  if (summary.max_attempts !== expectedMaxAttempts || boundedInteger(summary.max_attempts, 1, DIAGNOSTIC_LIMITS.maxAttempts) === null) return false;
  if (boundedInteger(summary.attempts, 0, summary.max_attempts) === null) return false;
  if (!summary.statuses || Object.keys(summary.statuses).length !== STATUSES.length) return false;
  if (Object.keys(summary.statuses).some((key) => !STATUSES.includes(key))) return false;
  if (STATUSES.some((key) => boundedInteger(summary.statuses[key], 0, summary.attempts) === null)) return false;

  const countKeys = [
    'request_errors', 'network_errors', 'timeout_errors', 'read_errors', 'server_errors',
    'completed_responses', 'responses_aborted', 'responses_limited', 'oversized_responses',
  ];
  if (countKeys.some((key) => boundedInteger(summary[key], 0, summary.attempts) === null)) return false;
  if (summary.request_errors !== summary.network_errors + summary.timeout_errors + summary.read_errors) return false;
  if (summary.attempts !== summary.completed_responses + summary.responses_aborted + summary.responses_limited + summary.request_errors) return false;
  if (boundedInteger(summary.response_bytes, 0, Number.MAX_SAFE_INTEGER) === null) return false;

  const inspector = summary.inspector;
  if (!inspector || Object.keys(inspector).length !== 4) return false;
  if (boundedInteger(inspector.target_pid, 1, Number.MAX_SAFE_INTEGER) === null) return false;
  if (inspector.target_executable !== 'node' || inspector.target_script !== 'server.js') return false;
  if (inspector.failure_category !== null && !INSPECTOR_FAILURE_CATEGORIES.includes(inspector.failure_category)) return false;

  if (!Array.isArray(summary.memory_samples) || summary.memory_samples.length < 1 || summary.memory_samples.length > MAX_MEMORY_SAMPLES) return false;
  let previousElapsed = -1;
  let previousSamplePhase = -1;
  const samplePhases = { baseline: 0, load: 1, recovery_start: 2, recovery: 3 };
  for (const [index, sample] of summary.memory_samples.entries()) {
    if (!sample || Object.keys(sample).length !== MEMORY_KEYS.length || Object.keys(sample).some((key) => !MEMORY_KEYS.includes(key))) return false;
    if (boundedInteger(sample.elapsed_seconds, 0, MAX_PHASE_ELAPSED_SECONDS) === null || sample.elapsed_seconds <= previousElapsed) return false;
    previousElapsed = sample.elapsed_seconds;
    if (!['baseline', 'load', 'recovery_start', 'recovery'].includes(sample.phase)) return false;
    if (samplePhases[sample.phase] < previousSamplePhase) return false;
    if (sample.phase === 'baseline' && index !== 0) return false;
    if (sample.phase === 'recovery_start' && index < 1) return false;
    if (sample.phase === 'recovery' && index !== summary.memory_samples.length - 1) return false;
    if (sample.phase === 'recovery' && summary.memory_samples.filter((candidate) => candidate.phase === 'recovery').length > 1) return false;
    previousSamplePhase = samplePhases[sample.phase];
    if (!sample.raw || Object.keys(sample.raw).length !== MEMORY_VALUE_KEYS.length) return false;
    if (Object.keys(sample.raw).some((key) => !MEMORY_VALUE_KEYS.includes(key))) return false;
    if (MEMORY_VALUE_KEYS.some((key) => safeNumber(sample.raw[key]) === null)) return false;
    if (sample.phase === 'load' || sample.phase === 'recovery_start') {
      if (sample.post_gc !== null) return false;
    } else {
      if (!sample.post_gc || Object.keys(sample.post_gc).length !== MEMORY_VALUE_KEYS.length) return false;
      if (Object.keys(sample.post_gc).some((key) => !MEMORY_VALUE_KEYS.includes(key))) return false;
      if (MEMORY_VALUE_KEYS.some((key) => safeNumber(sample.post_gc[key]) === null)) return false;
    }
  }
  if (summary.memory_samples[0].elapsed_seconds !== 0) return false;
  if (summary.memory_samples[0].phase !== 'baseline') return false;
  if (summary.elapsed_seconds < summary.memory_samples.at(-1).elapsed_seconds) return false;
  if (summary.inspector.failure_category === null) {
    if (summary.memory_samples.at(-1)?.phase !== 'recovery') return false;
    if (summary.memory_samples.filter((sample) => sample.phase === 'recovery_start').length !== 1) return false;
  }

  if (!Array.isArray(summary.time_series_fields) || summary.time_series_fields.length !== TIME_SERIES_FIELDS.length) return false;
  if (summary.time_series_fields.some((field, index) => field !== TIME_SERIES_FIELDS[index])) return false;
  if (!Array.isArray(summary.time_series) || summary.time_series.length > MAX_TIME_SERIES_BUCKETS) return false;
  let previousElapsedBucket = -1;
  let bucketAttempts = 0;
  let bucketErrors = 0;
  let bucketCompleted = 0;
  let bucketAborted = 0;
  let bucketLimited = 0;
  let bucketServerErrors = 0;
  for (const bucket of summary.time_series) {
    if (!Array.isArray(bucket) || bucket.length !== TIME_SERIES_FIELDS.length) return false;
    if (bucket.some((value) => !Number.isSafeInteger(value) || value < 0)) return false;
    const [elapsedBucketSeconds, attempts, twoXX, threeXX, fourXX, fiveXX, other, completed, aborted, limited, errors, networkErrors, timeoutErrors, readErrors, serverErrors] = bucket;
    if (boundedInteger(elapsedBucketSeconds, 0, (MAX_TIME_SERIES_BUCKETS - 1) * TIME_BUCKET_INTERVAL_SECONDS) === null) return false;
    if (elapsedBucketSeconds % TIME_BUCKET_INTERVAL_SECONDS !== 0 || elapsedBucketSeconds <= previousElapsedBucket) return false;
    previousElapsedBucket = elapsedBucketSeconds;
    if (boundedInteger(attempts, 0, DIAGNOSTIC_LIMITS.maxAttempts) === null) return false;
    const statusCounts = [twoXX, threeXX, fourXX, fiveXX, other];
    if (statusCounts.some((value) => boundedInteger(value, 0, attempts) === null)) return false;
    const bucketCounts = [completed, aborted, limited, errors, networkErrors, timeoutErrors, readErrors, serverErrors];
    if (bucketCounts.some((value) => boundedInteger(value, 0, attempts) === null)) return false;
    if (errors !== networkErrors + timeoutErrors + readErrors) return false;
    if (attempts !== completed + aborted + limited + errors) return false;
    if (statusCounts.reduce((sum, value) => sum + value, 0) > attempts) return false;
    bucketAttempts += attempts;
    bucketErrors += errors;
    bucketCompleted += completed;
    bucketAborted += aborted;
    bucketLimited += limited;
    bucketServerErrors += serverErrors;
  }
  if (bucketAttempts !== summary.attempts || bucketErrors !== summary.request_errors) return false;
  if (bucketCompleted !== summary.completed_responses || bucketAborted !== summary.responses_aborted || bucketLimited !== summary.responses_limited) return false;
  if (bucketServerErrors !== summary.server_errors) return false;
  if (summary.phase === 'full' && summary.responses_aborted !== 0) return false;
  if (summary.phase === 'abort' && summary.responses_aborted === 0) return false;

  return true;
}

class InspectorSession {
  constructor(socket) {
    this.socket = socket;
    this.nextId = 1;
    this.pending = new Map();
    this.closedCategory = null;
    this.onMessage = (event) => {
      let message;
      try {
        message = JSON.parse(String(event.data));
      } catch {
        return;
      }
      if (typeof message.id !== 'number') return;
      const pending = this.pending.get(message.id);
      if (!pending) return;
      this.pending.delete(message.id);
      clearTimeout(pending.timer);
      if (message.error) pending.reject(new DiagnosticError('inspector_command_failed'));
      else pending.resolve(message.result);
    };
    this.onSocketError = () => this.closeWith('inspector_websocket_error');
    this.onSocketClose = () => this.closeWith('inspector_socket_closed');
    this.socket.addEventListener('message', this.onMessage);
    this.socket.addEventListener('error', this.onSocketError);
    this.socket.addEventListener('close', this.onSocketClose);
  }

  closeWith(category) {
    if (this.closedCategory) return;
    this.closedCategory = category;
    for (const pending of this.pending.values()) {
      clearTimeout(pending.timer);
      pending.reject(new DiagnosticError(category));
    }
    this.pending.clear();
  }

  async command(method, params = {}) {
    if (this.closedCategory) fail(this.closedCategory);
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new DiagnosticError('inspector_command_timeout'));
      }, 10_000);
      this.pending.set(id, { resolve, reject, timer });
      try {
        this.socket.send(JSON.stringify({ id, method, params }));
      } catch {
        clearTimeout(timer);
        this.pending.delete(id);
        reject(new DiagnosticError('inspector_websocket_error'));
      }
    });
  }

  close() {
    this.socket.removeEventListener('message', this.onMessage);
    this.socket.removeEventListener('error', this.onSocketError);
    this.socket.removeEventListener('close', this.onSocketClose);
    this.closeWith('inspector_socket_closed');
    this.socket.close();
  }
}

function isLoopbackHost(hostname) {
  return hostname === '127.0.0.1' || hostname === '[::1]' || hostname === '::1';
}

export async function connectInspector({ targetsUrl = INSPECTOR_TARGETS, fetchImpl = fetch, WebSocketImpl = WebSocket } = {}) {
  let response;
  try {
    response = await fetchImpl(targetsUrl, { signal: AbortSignal.timeout(5_000) });
  } catch {
    fail('inspector_endpoint_unreachable');
  }
  if (!response.ok) fail('inspector_http_error');

  let body;
  try {
    body = await response.json();
  } catch {
    fail('inspector_response_invalid');
  }
  if (!Array.isArray(body)) fail('inspector_response_invalid');
  const nodeTargets = body.filter((target) => target?.type === 'node' && typeof target.webSocketDebuggerUrl === 'string');
  if (nodeTargets.length !== 1) fail('inspector_response_invalid');
  let websocketUrl;
  try {
    websocketUrl = new URL(nodeTargets[0].webSocketDebuggerUrl);
  } catch {
    fail('inspector_response_invalid');
  }
  if (websocketUrl.protocol !== 'ws:' || !isLoopbackHost(websocketUrl.hostname)) fail('inspector_target_not_loopback');

  let socket;
  try {
    socket = new WebSocketImpl(websocketUrl.href);
  } catch {
    fail('inspector_websocket_error');
  }
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new DiagnosticError('inspector_connect_timeout')), 5_000);
    const onOpen = () => {
      clearTimeout(timer);
      socket.removeEventListener('error', onError);
      resolve();
    };
    const onError = () => {
      clearTimeout(timer);
      socket.removeEventListener('open', onOpen);
      reject(new DiagnosticError('inspector_websocket_error'));
    };
    socket.addEventListener('open', onOpen, { once: true });
    socket.addEventListener('error', onError, { once: true });
  }).catch((error) => {
    try { socket.close(); } catch { /* Ignore socket cleanup errors. */ }
    throw error instanceof DiagnosticError ? error : new DiagnosticError('inspector_websocket_error');
  });

  return new InspectorSession(socket);
}

export async function identifyInspectorTarget(session, { expectedScript = 'server.js', helperPid = process.pid } = {}) {
  let result;
  try {
    result = await session.command('Runtime.evaluate', {
      expression: `(() => { const p = process.getBuiltinModule('node:path'); return { pid: process.pid, executable: p.basename(process.execPath), script: p.basename(process.argv[1] || '') }; })()`,
      returnByValue: true,
    });
  } catch (error) {
    if (error instanceof DiagnosticError) throw error;
    fail('inspector_evaluation_failed');
  }
  if (result?.exceptionDetails) fail('inspector_evaluation_failed');
  const value = result?.result?.value;
  if (
    !value
    || boundedInteger(value.pid, 1, Number.MAX_SAFE_INTEGER) === null
    || typeof value.executable !== 'string'
    || typeof value.script !== 'string'
  ) fail('inspector_identity_invalid');
  if (value.executable !== 'node' || value.pid === helperPid || (expectedScript && value.script !== expectedScript)) {
    fail('inspector_target_not_app');
  }
  return {
    target_pid: value.pid,
    target_executable: value.executable,
    target_script: expectedScript || value.script,
  };
}

export async function sampleMemory(session, elapsedSeconds, { phase = 'load', collectGarbage = false } = {}) {
  if (!['baseline', 'load', 'recovery_start', 'recovery'].includes(phase)) fail('inspector_memory_sample_invalid');
  if ((phase === 'baseline' || phase === 'recovery') !== collectGarbage) fail('inspector_memory_sample_invalid');
  const expression = collectGarbage
    ? `(() => { const read = () => { const m = process.memoryUsage(); const h = process.getBuiltinModule('node:v8').getHeapStatistics(); return { rss: m.rss, heapTotal: m.heapTotal, heapUsed: m.heapUsed, external: m.external, arrayBuffers: m.arrayBuffers, heap_size_limit: h.heap_size_limit }; }; if (typeof global.gc !== 'function') return { gc_available: false }; const raw = read(); global.gc(); return { gc_available: true, raw, post_gc: read() }; })()`
    : `(() => { const m = process.memoryUsage(); const h = process.getBuiltinModule('node:v8').getHeapStatistics(); return { gc_available: true, raw: { rss: m.rss, heapTotal: m.heapTotal, heapUsed: m.heapUsed, external: m.external, arrayBuffers: m.arrayBuffers, heap_size_limit: h.heap_size_limit }, post_gc: null }; })()`;
  let result;
  try {
    result = await session.command('Runtime.evaluate', {
      expression,
      returnByValue: true,
    });
  } catch (error) {
    if (error instanceof DiagnosticError) throw error;
    fail('inspector_evaluation_failed');
  }
  if (result?.exceptionDetails) fail('inspector_evaluation_failed');
  const value = result?.result?.value;
  if (value?.gc_available === false) fail('inspector_gc_unavailable');
  if (!value || typeof value !== 'object' || value.gc_available !== true) fail('inspector_memory_sample_invalid');
  const normalize = (measurements) => Object.fromEntries(
    MEMORY_VALUE_KEYS.map((key) => [key, safeNumber(measurements?.[key])]),
  );
  const sample = {
    elapsed_seconds: elapsedSeconds,
    phase,
    raw: normalize(value.raw),
    post_gc: value.post_gc === null ? null : normalize(value.post_gc),
  };
  if (Object.values(sample.raw).some((item) => item === null)) {
    fail('inspector_memory_sample_invalid');
  }
  if ((collectGarbage && (!sample.post_gc || Object.values(sample.post_gc).some((item) => item === null))) || (!collectGarbage && sample.post_gc !== null)) {
    fail('inspector_memory_sample_invalid');
  }
  return sample;
}

async function requestAbort(summary, bucket, requestStartedAt, route, fetchImpl) {
  const controller = new AbortController();
  let reader;
  let didAbort = false;
  let completed = false;
  let headersReceived = false;
  let responseBytes = 0;
  const abortTimer = setTimeout(() => {
    if (!completed) {
      didAbort = true;
      controller.abort();
    }
  }, DIAGNOSTIC_LIMITS.abortAfterMs);

  try {
    const response = await fetchImpl(route, {
      method: 'GET',
      headers: { accept: 'application/json', 'accept-language': 'en' },
      signal: controller.signal,
    });
    headersReceived = true;
    addStatus(summary, bucket, response.status);
    reader = response.body?.getReader();
    if (!reader) {
      completed = true;
      summary.completed_responses += 1;
      bucket.completed_responses += 1;
      return;
    }

    const first = await reader.read();
    if (first.done) {
      if (didAbort || controller.signal.aborted) {
        summary.responses_aborted += 1;
        bucket.responses_aborted += 1;
        return;
      }
      completed = true;
      summary.completed_responses += 1;
      bucket.completed_responses += 1;
      return;
    }
    responseBytes = Math.min(first.value.byteLength, MAX_RESPONSE_BYTES);

    const remaining = DIAGNOSTIC_LIMITS.abortAfterMs - (performance.now() - requestStartedAt);
    if (remaining > 0) await delay(remaining);
    if (!didAbort && !completed) {
      didAbort = true;
      controller.abort();
    }
    if (didAbort) {
      summary.responses_aborted += 1;
      bucket.responses_aborted += 1;
    }
    await reader.cancel().catch(() => undefined);
  } catch {
    if (didAbort || controller.signal.aborted) {
      summary.responses_aborted += 1;
      bucket.responses_aborted += 1;
    } else {
      incrementError(summary, bucket, headersReceived ? 'read' : 'network');
    }
  } finally {
    summary.response_bytes += responseBytes;
    clearTimeout(abortTimer);
    try {
      reader?.releaseLock();
    } catch {
      // The abort may have already released the stream reader.
    }
  }
}

async function requestFull(summary, bucket, route, fetchImpl) {
  const controller = new AbortController();
  let reader;
  let headersReceived = false;
  let responseBytes = 0;
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetchImpl(route, {
      method: 'GET',
      headers: { accept: 'application/json', 'accept-language': 'en' },
      signal: controller.signal,
    });
    headersReceived = true;
    addStatus(summary, bucket, response.status);
    reader = response.body?.getReader();
    if (!reader) {
      summary.completed_responses += 1;
      bucket.completed_responses += 1;
      return;
    }

    for (;;) {
      const chunk = await reader.read();
      if (chunk.done) {
        summary.completed_responses += 1;
        bucket.completed_responses += 1;
        break;
      }
      responseBytes += chunk.value.byteLength;
      if (responseBytes > MAX_RESPONSE_BYTES) {
        summary.oversized_responses += 1;
        summary.responses_limited += 1;
        bucket.responses_limited += 1;
        await reader.cancel();
        break;
      }
    }
  } catch {
    if (controller.signal.aborted) incrementError(summary, bucket, 'timeout');
    else incrementError(summary, bucket, headersReceived ? 'read' : 'network');
  } finally {
    summary.response_bytes += Math.min(responseBytes, MAX_RESPONSE_BYTES);
    clearTimeout(timeout);
    try {
      reader?.releaseLock();
    } catch {
      // A failed fetch may already have released the stream reader.
    }
  }
}

async function requestOnce(mode, summary, bucket, requestStartedAt, route, fetchImpl) {
  if (mode === 'abort') return requestAbort(summary, bucket, requestStartedAt, route, fetchImpl);
  return requestFull(summary, bucket, route, fetchImpl);
}

export async function requestDiagnosticTarget({ mode, target, summary, bucket, requestStartedAt, fetchImpl = fetch }) {
  const route = resolveDiagnosticTarget(target);
  if (!route) throw new Error('invalid_target');
  return requestOnce(mode, summary, bucket, requestStartedAt, route, fetchImpl);
}

export async function runPhase({
  mode,
  durationSeconds,
  concurrency = DIAGNOSTIC_LIMITS.concurrency,
  target = 'tcg-card',
  inspectorTargetsUrl = INSPECTOR_TARGETS,
  connectInspectorImpl = connectInspector,
  fetchImpl = fetch,
  sampleIntervalMs = SAMPLE_INTERVAL_MS,
  recoveryDelayMs = RECOVERY_WINDOW_SECONDS * 1_000,
  pauseImpl = delay,
}) {
  if (!['full', 'abort'].includes(mode)) throw new Error('invalid_phase');
  if (boundedInteger(durationSeconds, 1, MAX_DURATION_SECONDS) === null) throw new Error('invalid_duration');
  if (boundedInteger(concurrency, 1, DIAGNOSTIC_LIMITS.concurrency) === null) throw new Error('invalid_concurrency');
  if (resolveDiagnosticTarget(target) === null) throw new Error('invalid_target');

  const maxAttempts = concurrency * Math.ceil((durationSeconds * 1_000) / DIAGNOSTIC_LIMITS.workerIntervalMs);
  const summary = emptySummary(mode, durationSeconds, concurrency, maxAttempts, target);
  const startedAt = performance.now();
  const endAt = startedAt + durationSeconds * 1_000;
  let inspector;
  let stopRequested = false;
  try {
    inspector = await connectInspectorImpl({ targetsUrl: inspectorTargetsUrl });
    Object.assign(summary.inspector, await identifyInspectorTarget(inspector));
    summary.memory_samples.push(await sampleMemory(inspector, 0, { phase: 'baseline', collectGarbage: true }));
  } catch (error) {
    inspector?.close();
    if (error instanceof DiagnosticError) throw error;
    fail('inspector_endpoint_unreachable');
  }

  let nextSampleAt = startedAt + sampleIntervalMs;
  let nextAttempt = 0;
  const worker = async () => {
    while (!stopRequested && performance.now() < endAt && nextAttempt < maxAttempts) {
      const iterationStartedAt = performance.now();
      nextAttempt += 1;
      const bucket = addAttempt(summary, startedAt);
      await requestDiagnosticTarget({ mode, target, summary, bucket, requestStartedAt: iterationStartedAt, fetchImpl });

      const remaining = DIAGNOSTIC_LIMITS.workerIntervalMs - (performance.now() - iterationStartedAt);
      if (remaining > 0 && !stopRequested) await pauseImpl(remaining);
    }
  };
  const workers = Array.from({ length: concurrency }, () => worker());

  try {
    while (performance.now() < endAt && !stopRequested) {
      if (performance.now() >= nextSampleAt && summary.memory_samples.length < MAX_MEMORY_SAMPLES) {
        try {
          const elapsed = nextSampleElapsedSeconds(summary, startedAt);
          summary.memory_samples.push(await sampleMemory(inspector, elapsed, { phase: 'load' }));
        } catch (error) {
          const category = error instanceof DiagnosticError ? error.category : 'inspector_evaluation_failed';
          summary.inspector.failure_category = INSPECTOR_FAILURE_CATEGORIES.includes(category)
            ? category
            : 'inspector_evaluation_failed';
          stopRequested = true;
        }
        nextSampleAt = performance.now() + sampleIntervalMs;
      }
      if (!stopRequested) await pauseImpl(Math.min(1_000, Math.max(1, endAt - performance.now())));
    }
    await Promise.all(workers);

    if (!stopRequested) {
      try {
        const recoveryStart = nextSampleElapsedSeconds(summary, startedAt);
        summary.memory_samples.push(await sampleMemory(inspector, recoveryStart, { phase: 'recovery_start' }));
        await pauseImpl(recoveryDelayMs);
        const recoveryElapsed = nextSampleElapsedSeconds(summary, startedAt);
        summary.memory_samples.push(await sampleMemory(inspector, recoveryElapsed, { phase: 'recovery', collectGarbage: true }));
      } catch (error) {
        const category = error instanceof DiagnosticError ? error.category : 'inspector_evaluation_failed';
        summary.inspector.failure_category = INSPECTOR_FAILURE_CATEGORIES.includes(category)
          ? category
          : 'inspector_evaluation_failed';
      }
    }
  } finally {
    summary.elapsed_seconds = Math.max(
      summary.memory_samples.at(-1)?.elapsed_seconds ?? 0,
      Math.min(MAX_PHASE_ELAPSED_SECONDS, Math.floor((performance.now() - startedAt) / 1_000)),
    );
    inspector?.close();
  }

  summary.time_series = summary.time_series.map((bucket) => [
    bucket.elapsed_bucket_seconds,
    bucket.attempts,
    ...STATUSES.map((status) => bucket.statuses[status]),
    bucket.completed_responses,
    bucket.responses_aborted,
    bucket.responses_limited,
    bucket.request_errors,
    bucket.network_errors,
    bucket.timeout_errors,
    bucket.read_errors,
    bucket.server_errors,
  ]);

  if (!validateOutput(summary)) fail('summary_validation_failed');
  return summary;
}

async function main() {
  const mode = process.env.ISOLATED_TCG_PHASE;
  const durationSeconds = Number(process.env.ISOLATED_TCG_DURATION_SECONDS ?? '900');
  const concurrency = Number(process.env.ISOLATED_TCG_CONCURRENCY ?? String(DIAGNOSTIC_LIMITS.concurrency));
  const target = process.env.ISOLATED_TCG_TARGET ?? 'tcg-card';
  const inspectorTargetsUrl = process.env.ISOLATED_TCG_INSPECTOR_TARGETS_URL ?? INSPECTOR_TARGETS;
  if (
    !['full', 'abort'].includes(mode)
    || boundedInteger(durationSeconds, 1, MAX_DURATION_SECONDS) === null
    || boundedInteger(concurrency, 1, DIAGNOSTIC_LIMITS.concurrency) === null
    || resolveDiagnosticTarget(target) === null
  ) {
    process.stderr.write('diagnostic_error_category=invalid_diagnostic_configuration\n');
    process.exitCode = 78;
    return;
  }

  try {
    const summary = await runPhase({ mode, durationSeconds, concurrency, target, inspectorTargetsUrl });
    process.stdout.write(`${JSON.stringify(summary)}\n`);
    if (summary.inspector.failure_category !== null) process.exitCode = 1;
  } catch (error) {
    const category = error instanceof DiagnosticError && INSPECTOR_FAILURE_CATEGORIES.includes(error.category)
      ? error.category
      : error instanceof DiagnosticError && error.category === 'summary_validation_failed'
        ? 'summary_validation_failed'
        : 'diagnostic_phase_failed';
    process.stderr.write(`diagnostic_error_category=${category}\n`);
    process.exitCode = category === 'invalid_diagnostic_configuration' ? 78 : 1;
  }
}

if (process.argv[1] === '-' || import.meta.url === `file://${process.argv[1]}`) {
  process.stderr.write('diagnostic_helper_started=true\n');
  await main();
}
