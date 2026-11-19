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
const MAX_SUMMARY_STACKS = 10;
const MAX_STACK_FRAMES = 8;
const MAX_SUMMARY_JSON_LENGTH = 15_000;
const MAX_FUNCTION_NAME_LENGTH = 80;
const MAX_SOURCE_BASENAME_LENGTH = 120;

export interface HeapSampleStackFrame {
  functionName: string;
  sourceFile: string;
  line: number;
  column: number;
}

export interface HeapSampleFrame extends HeapSampleStackFrame {
  sampledBytes: number;
}

export interface HeapSampleStack {
  frames: HeapSampleStackFrame[];
  sampledBytes: number;
}

export interface HeapMemorySnapshot {
  rss: number;
  heapTotal: number;
  heapUsed: number;
  external: number;
  arrayBuffers: number;
  heapLimit: number;
}

export interface HeapSampleSummary {
  frames: HeapSampleFrame[];
  stacks: HeapSampleStack[];
  memory: HeapMemorySnapshot;
}

interface RawProfileNode {
  callFrame?: unknown;
  selfSize?: unknown;
  children?: unknown;
}

interface MutableHeapSampleFrame extends HeapSampleFrame {
  key: string;
}

interface MutableHeapSampleStack extends HeapSampleStack {
  key: string;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function safeMemoryByteCount(value: unknown): number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : 0;
}

/** Return only the six numeric runtime memory counters approved for diagnostics. */
export function sanitizeHeapMemorySnapshot(value: unknown): HeapMemorySnapshot {
  const record = asRecord(value);
  return {
    rss: safeMemoryByteCount(record?.rss),
    heapTotal: safeMemoryByteCount(record?.heapTotal),
    heapUsed: safeMemoryByteCount(record?.heapUsed),
    external: safeMemoryByteCount(record?.external),
    arrayBuffers: safeMemoryByteCount(record?.arrayBuffers),
    heapLimit: safeMemoryByteCount(record?.heapLimit),
  };
}

export function readHeapMemorySnapshot(): HeapMemorySnapshot {
  const usage = process.memoryUsage();
  const heapLimit = getHeapStatistics().heap_size_limit;
  return sanitizeHeapMemorySnapshot({ ...usage, heapLimit });
}

export function shouldTriggerHeapSample(memory: HeapMemorySnapshot): boolean {
  if (!Number.isSafeInteger(memory.heapLimit) || memory.heapLimit <= 0) return false;
  return memory.heapUsed / memory.heapLimit >= HEAP_LIMIT_TRIGGER_RATIO
    || memory.rss / memory.heapLimit >= HEAP_LIMIT_TRIGGER_RATIO;
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

function safeColumnNumber(value: unknown): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0) return 0;
  const oneBasedColumn = value + 1;
  return Number.isSafeInteger(oneBasedColumn) ? oneBasedColumn : 0;
}

function safeSampledBytes(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0
    ? Math.min(Number.MAX_SAFE_INTEGER, Math.floor(value))
    : 0;
}

function safeCallFrame(value: unknown): HeapSampleStackFrame | null {
  const callFrame = asRecord(value);
  if (!callFrame) return null;

  const frame = {
    functionName: safeFunctionName(callFrame.functionName),
    sourceFile: safeSourceBasename(callFrame.url),
    line: safeLineNumber(callFrame.lineNumber),
    column: safeColumnNumber(callFrame.columnNumber),
  };

  // The inspector's root frame is not useful to source-map, so omit it rather
  // than spending one of the bounded caller slots on placeholder metadata.
  const hasSourceLocation = (typeof callFrame.url === 'string' && callFrame.url.length > 0)
    || (typeof callFrame.lineNumber === 'number' && callFrame.lineNumber > 0)
    || (typeof callFrame.columnNumber === 'number' && callFrame.columnNumber > 0);
  return frame.functionName === '(anonymous)'
    && frame.sourceFile === '(unknown)'
    && !hasSourceLocation
    ? null
    : frame;
}

function addSampledStack(
  totals: Map<string, MutableHeapSampleStack>,
  callStack: HeapSampleStackFrame[],
  sampledBytes: number,
): void {
  if (sampledBytes <= 0 || callStack.length === 0) return;

  const frames = callStack.slice(-MAX_STACK_FRAMES);
  const key = JSON.stringify(frames);
  const existing = totals.get(key);
  if (existing) {
    existing.sampledBytes = Math.min(Number.MAX_SAFE_INTEGER, existing.sampledBytes + sampledBytes);
    return;
  }

  const entry: MutableHeapSampleStack = { frames, key, sampledBytes };
  if (totals.size < MAX_SUMMARY_STACKS) {
    totals.set(key, entry);
    return;
  }

  // The V8 profile is a call tree whose nodes already aggregate samples for
  // each raw stack. Keep only its ten strongest sanitized paths so the extra
  // diagnostic state stays strictly bounded while walking up to 50,000 nodes.
  let smallest: MutableHeapSampleStack | undefined;
  for (const candidate of totals.values()) {
    if (!smallest || candidate.sampledBytes < smallest.sampledBytes) smallest = candidate;
  }
  if (smallest && entry.sampledBytes > smallest.sampledBytes) {
    totals.delete(smallest.key);
    totals.set(key, entry);
  }
}

function fitSummaryToLogLimit(summary: HeapSampleSummary): HeapSampleSummary {
  const stacks = summary.stacks.map((stack) => ({ ...stack, frames: [...stack.frames] }));
  let json = JSON.stringify({ frames: summary.frames, stacks, memory: summary.memory });

  while (json.length > MAX_SUMMARY_JSON_LENGTH && stacks.length > 0) {
    let index = stacks.length - 1;
    while (index >= 0 && stacks[index]!.frames.length <= 1) index -= 1;

    if (index >= 0) {
      // Preserve the allocation frame and its nearest callers when a rare
      // long source name would otherwise exceed the workflow's 16 KiB cap.
      stacks[index] = { ...stacks[index]!, frames: stacks[index]!.frames.slice(1) };
    } else {
      stacks.pop();
    }
    json = JSON.stringify({ frames: summary.frames, stacks, memory: summary.memory });
  }

  return { frames: summary.frames, stacks, memory: summary.memory };
}

/** Reduce the inspector profile to bounded, non-sensitive frames and stacks. */
export function summarizeHeapProfile(
  profileValue: unknown,
  memorySnapshot: HeapMemorySnapshot = readHeapMemorySnapshot(),
): HeapSampleSummary {
  const memory = sanitizeHeapMemorySnapshot(memorySnapshot);
  const profile = asRecord(profileValue);
  const root = asRecord(profile?.head) as RawProfileNode | null;
  if (!root) return { frames: [], stacks: [], memory };

  const totals = new Map<string, MutableHeapSampleFrame>();
  const stackTotals = new Map<string, MutableHeapSampleStack>();
  const callStack: HeapSampleStackFrame[] = [];
  let visited = 0;

  const visit = (node: RawProfileNode, depth: number): void => {
    if (visited >= MAX_PROFILE_NODES) return;
    visited += 1;

    const frame = safeCallFrame(node.callFrame);
    if (frame) callStack.push(frame);

    const sampledBytes = safeSampledBytes(node.selfSize);
    if (frame && sampledBytes > 0) {
      const frameWithBytes: HeapSampleFrame = { ...frame, sampledBytes };
      const key = JSON.stringify([frame.functionName, frame.sourceFile, frame.line, frame.column]);
      const existing = totals.get(key);
      totals.set(key, {
        ...frameWithBytes,
        key,
        sampledBytes: Math.min(Number.MAX_SAFE_INTEGER, (existing?.sampledBytes ?? 0) + sampledBytes),
      });
    }

    addSampledStack(stackTotals, callStack, sampledBytes);

    if (depth < MAX_PROFILE_DEPTH && Array.isArray(node.children)) {
      for (const child of node.children) {
        if (visited >= MAX_PROFILE_NODES) break;
        const childNode = asRecord(child) as RawProfileNode | null;
        if (childNode) visit(childNode, depth + 1);
      }
    }

    if (frame) callStack.pop();
  };

  visit(root, 0);

  const summary: HeapSampleSummary = {
    frames: [...totals.values()]
      .sort((left, right) => right.sampledBytes - left.sampledBytes || left.key.localeCompare(right.key))
      .slice(0, MAX_SUMMARY_FRAMES)
      .map(({ functionName, sourceFile, line, column, sampledBytes }) => ({
        functionName,
        sourceFile,
        line,
        column,
        sampledBytes,
      })),
    stacks: [...stackTotals.values()]
      .sort((left, right) => right.sampledBytes - left.sampledBytes || left.key.localeCompare(right.key))
      .slice(0, MAX_SUMMARY_STACKS)
      .map(({ frames, sampledBytes }) => ({ frames, sampledBytes })),
    memory,
  };

  return fitSummaryToLogLimit(summary);
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
    return summarizeHeapProfile(profile, readHeapMemorySnapshot());
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

    let memory: HeapMemorySnapshot;
    try {
      memory = readHeapMemorySnapshot();
    } catch {
      clearInterval(monitor);
      return;
    }
    if (!shouldTriggerHeapSample(memory)) return;

    triggered = true;
    clearInterval(monitor);
    void collectHeapSample().then(
      (summary) => logSafeSummary(summary, runId),
      () => logSafeSummary({ frames: [], stacks: [], memory: readHeapMemorySnapshot() }, runId),
    );
  }, MONITOR_INTERVAL_MS);
  monitor.unref();
}
