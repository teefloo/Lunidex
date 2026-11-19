import { basename } from 'node:path';
import { Session } from 'node:inspector/promises';
import { getHeapStatistics } from 'node:v8';

const ENABLED_VALUE = 'enabled';
const ENABLED_ENV = 'LUNIDEX_HEAP_SAMPLER_DIAGNOSTIC';
const EXPIRES_AT_ENV = 'LUNIDEX_HEAP_SAMPLER_EXPIRES_AT';
const RUN_ID_ENV = 'LUNIDEX_HEAP_SAMPLER_RUN_ID';
const SUMMARY_PREFIX = 'LUNIDEX_HEAP_SAMPLE_SUMMARY_';
const HEAP_LIMIT_TRIGGER_RATIO = 0.55;
const MONITOR_INTERVAL_MS = 1_000;
const SAMPLE_DURATION_MS = 25_000;
const SAMPLE_INTERVAL_BYTES = 64 * 1024;
const MAX_PROFILE_NODES = 50_000;
const MAX_PROFILE_DEPTH = 128;
const MAX_SUMMARY_FRAMES = 20;
const MAX_FUNCTION_NAME_LENGTH = 80;
const MAX_SOURCE_BASENAME_LENGTH = 120;

export interface HeapSampleFrame {
  functionName: string;
  sourceFile: string;
  line: number;
  sampledBytes: number;
}

export interface HeapSampleSummary {
  frames: HeapSampleFrame[];
}

interface RawProfileNode {
  callFrame?: unknown;
  selfSize?: unknown;
  children?: unknown;
}

interface MutableHeapSampleFrame extends HeapSampleFrame {
  key: string;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function safeFunctionName(value: unknown): string {
  if (typeof value !== 'string' || value.length === 0 || value.length > MAX_FUNCTION_NAME_LENGTH) {
    return '(anonymous)';
  }

  // Inspector call frames are code metadata. Restrict the emitted spelling so
  // malformed or dynamically generated names cannot inject log lines or paths.
  return /^[A-Za-z_$][A-Za-z0-9_$.:<>()[\]-]*$/.test(value) ? value : '(anonymous)';
}

function safeSourceBasename(value: unknown): string {
  if (typeof value !== 'string' || value.length === 0) return '(unknown)';
  const urlWithoutSuffix = value.split(/[?#]/, 1)[0] ?? '';
  const normalizedPath = urlWithoutSuffix.replaceAll('\\', '/');
  const sourceFile = basename(normalizedPath);
  return sourceFile.length <= MAX_SOURCE_BASENAME_LENGTH && /^[A-Za-z0-9._-]+$/.test(sourceFile)
    ? sourceFile
    : '(unknown)';
}

function safeLineNumber(value: unknown): number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0
    ? value + 1
    : 0;
}

function safeSampledBytes(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0
    ? Math.floor(value)
    : 0;
}

/** Reduce the inspector profile to bounded, non-sensitive source-frame totals. */
export function summarizeHeapProfile(profileValue: unknown): HeapSampleSummary {
  const profile = asRecord(profileValue);
  const root = asRecord(profile?.head) as RawProfileNode | null;
  if (!root) return { frames: [] };

  const totals = new Map<string, MutableHeapSampleFrame>();
  const pending: Array<{ node: RawProfileNode; depth: number }> = [{ node: root, depth: 0 }];
  let visited = 0;

  while (pending.length > 0 && visited < MAX_PROFILE_NODES) {
    const current = pending.pop();
    if (!current) break;
    visited += 1;

    const callFrame = asRecord(current.node.callFrame);
    const sampledBytes = safeSampledBytes(current.node.selfSize);
    if (callFrame && sampledBytes > 0) {
      const frame: HeapSampleFrame = {
        functionName: safeFunctionName(callFrame.functionName),
        sourceFile: safeSourceBasename(callFrame.url),
        line: safeLineNumber(callFrame.lineNumber),
        sampledBytes,
      };
      const key = `${frame.functionName}\0${frame.sourceFile}\0${frame.line}`;
      const existing = totals.get(key);
      totals.set(key, {
        ...frame,
        key,
        sampledBytes: Math.min(Number.MAX_SAFE_INTEGER, (existing?.sampledBytes ?? 0) + sampledBytes),
      });
    }

    if (current.depth >= MAX_PROFILE_DEPTH || !Array.isArray(current.node.children)) continue;
    for (const child of current.node.children) {
      const childNode = asRecord(child) as RawProfileNode | null;
      if (childNode) pending.push({ node: childNode, depth: current.depth + 1 });
    }
  }

  return {
    frames: [...totals.values()]
      .sort((left, right) => right.sampledBytes - left.sampledBytes || left.key.localeCompare(right.key))
      .slice(0, MAX_SUMMARY_FRAMES)
      .map(({ functionName, sourceFile, line, sampledBytes }) => ({
        functionName,
        sourceFile,
        line,
        sampledBytes,
      })),
  };
}

/** Start one in-process inspector sampling window. It opens no inspector port. */
export async function collectHeapSample(durationMs = SAMPLE_DURATION_MS): Promise<HeapSampleSummary> {
  const session = new Session();
  session.connect();

  try {
    await session.post('HeapProfiler.startSampling', {
      samplingInterval: SAMPLE_INTERVAL_BYTES,
    });
    await new Promise<void>((resolve) => setTimeout(resolve, Math.max(1, Math.min(durationMs, SAMPLE_DURATION_MS))));
    const { profile } = await session.post('HeapProfiler.stopSampling');
    return summarizeHeapProfile(profile);
  } finally {
    session.disconnect();
  }
}

function diagnosticWindowIsOpen(): boolean {
  if (process.env.NODE_ENV !== 'production'
    || process.env.NEXT_RUNTIME !== 'nodejs'
    || process.env[ENABLED_ENV] !== ENABLED_VALUE) {
    return false;
  }

  if (!/^\d+-\d+$/.test(process.env[RUN_ID_ENV] ?? '')) return false;
  const expiresAt = Number(process.env[EXPIRES_AT_ENV]);
  return Number.isSafeInteger(expiresAt) && expiresAt > Math.floor(Date.now() / 1_000);
}

function logSafeSummary(summary: HeapSampleSummary, runId: string): void {
  console.info(`${SUMMARY_PREFIX}${runId}=${JSON.stringify(summary)}`);
}

/** Enable only for the short, workflow-authorized production diagnostic window. */
export function startHeapAllocationSampler(): void {
  if (!diagnosticWindowIsOpen()) return;

  let triggered = false;
  const runId = process.env[RUN_ID_ENV];
  if (!runId || !/^\d+-\d+$/.test(runId)) return;
  const monitor = setInterval(() => {
    if (triggered) return;
    if (!diagnosticWindowIsOpen()) {
      clearInterval(monitor);
      return;
    }

    let heapLimit: number;
    let heapUsed: number;
    try {
      heapLimit = getHeapStatistics().heap_size_limit;
      heapUsed = process.memoryUsage().heapUsed;
    } catch {
      clearInterval(monitor);
      return;
    }
    if (!Number.isFinite(heapLimit) || heapLimit <= 0 || heapUsed / heapLimit < HEAP_LIMIT_TRIGGER_RATIO) return;

    triggered = true;
    clearInterval(monitor);
    void collectHeapSample().then(
      (summary) => logSafeSummary(summary, runId),
      () => logSafeSummary({ frames: [] }, runId),
    );
  }, MONITOR_INTERVAL_MS);
  monitor.unref();
}
