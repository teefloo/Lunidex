import { pathToFileURL } from 'node:url';

export const HEAP_SAMPLE_SUMMARY_PREFIX = 'LUNIDEX_HEAP_SAMPLE_SUMMARY_';
export const HEAP_MEMORY_POINT_PREFIX = 'LUNIDEX_HEAP_MEMORY_POINT_';
const MAX_INPUT_LENGTH = 16_384;
const MAX_MEMORY_POINT_LINE_LENGTH = 512;
const MAX_MEMORY_POINT_BATCH_LENGTH = 32 * 1024 * 1024;
const MAX_MEMORY_POINT_INPUT_LINES = 50_000;
const MAX_MEMORY_POINT_CANDIDATES = 50_000;
const MAX_FRAMES = 20;
const MAX_STACKS = 10;
const MAX_STACK_FRAMES = 8;
const MAX_MEMORY_SERIES_POINTS = 60;
const MAX_MEMORY_SERIES_ELAPSED_MS = 15 * 60 * 1_000;
const MEMORY_SERIES_TUPLE_LENGTH = 7;
const MEMORY_SERIES_INTERVAL_MS = 15_000;
const MAX_MEMORY_POINT_ELAPSED_MS = MAX_MEMORY_SERIES_ELAPSED_MS - MEMORY_SERIES_INTERVAL_MS;
const MAX_FUNCTION_NAME_LENGTH = 80;
const MAX_SOURCE_FILE_LENGTH = 120;
const FRAME_KEYS = ['functionName', 'line', 'column', 'sampledBytes', 'sourceFile'];
const STACK_KEYS = ['frames', 'sampledBytes'];
const STACK_FRAME_KEYS = ['functionName', 'line', 'column', 'sourceFile'];
const MEMORY_KEYS = ['rss', 'heapTotal', 'heapUsed', 'external', 'arrayBuffers', 'heapLimit'];

function hasOnlyKeys(value, keys) {
  return Object.keys(value).length === keys.length
    && keys.every((key) => Object.hasOwn(value, key));
}

function isSafeFunctionName(value) {
  return typeof value === 'string'
    && value.length <= MAX_FUNCTION_NAME_LENGTH
    && (value === '(anonymous)' || /^[A-Za-z_$][A-Za-z0-9_$.:<>()[\]-]*$/.test(value));
}

function isSafeSourceFile(value) {
  return typeof value === 'string'
    && value.length <= MAX_SOURCE_FILE_LENGTH
    && (value === '(unknown)' || /^[A-Za-z0-9._-]+$/.test(value));
}

/** Accept only the exact legacy or current allowlisted sample-summary schema. */
export function normalizeHeapSampleSummaryLine(line, expectedRunId) {
  if (typeof expectedRunId !== 'string' || !/^\d+-\d+$/.test(expectedRunId)) return null;
  const expectedPrefix = `${HEAP_SAMPLE_SUMMARY_PREFIX}${expectedRunId}=`;
  if (typeof line !== 'string'
    || line.length > MAX_INPUT_LENGTH
    || !line.startsWith(expectedPrefix)) {
    return null;
  }

  let parsed;
  try {
    parsed = JSON.parse(line.slice(expectedPrefix.length));
  } catch {
    return null;
  }

  const hasLegacySchema = parsed && typeof parsed === 'object' && !Array.isArray(parsed)
    && hasOnlyKeys(parsed, ['frames', 'stacks']);
  const hasMemorySchema = parsed && typeof parsed === 'object' && !Array.isArray(parsed)
    && hasOnlyKeys(parsed, ['frames', 'stacks', 'memory']);
  const hasMemorySeriesSchema = parsed && typeof parsed === 'object' && !Array.isArray(parsed)
    && hasOnlyKeys(parsed, ['frames', 'stacks', 'memory', 'memorySeries']);
  if (!hasLegacySchema && !hasMemorySchema && !hasMemorySeriesSchema) return null;

  if (!Array.isArray(parsed.frames)
    || parsed.frames.length > MAX_FRAMES
    || !Array.isArray(parsed.stacks)
    || parsed.stacks.length > MAX_STACKS) {
    return null;
  }

  let memory;
  if (hasMemorySchema || hasMemorySeriesSchema) {
    if (!parsed.memory || typeof parsed.memory !== 'object' || Array.isArray(parsed.memory)
      || !hasOnlyKeys(parsed.memory, MEMORY_KEYS)) {
      return null;
    }

    memory = {};
    for (const key of MEMORY_KEYS) {
      if (!Number.isSafeInteger(parsed.memory[key]) || parsed.memory[key] < 0) return null;
      memory[key] = parsed.memory[key];
    }
  }

  let memorySeries;
  if (hasMemorySeriesSchema) {
    if (!Array.isArray(parsed.memorySeries)
      || parsed.memorySeries.length === 0
      || parsed.memorySeries.length > MAX_MEMORY_SERIES_POINTS) {
      return null;
    }

    memorySeries = [];
    let previousElapsedMs = -1;
    for (const point of parsed.memorySeries) {
      if (!Array.isArray(point) || point.length !== MEMORY_SERIES_TUPLE_LENGTH) return null;
      if (point.some((value) => !Number.isSafeInteger(value) || value < 0)) return null;
      const elapsedMs = point[0];
      if (elapsedMs <= previousElapsedMs || elapsedMs > MAX_MEMORY_SERIES_ELAPSED_MS) return null;
      previousElapsedMs = elapsedMs;
      memorySeries.push([...point]);
    }
  }

  // Keep both older exact schemas readable for summaries already in Docker logs.
  // Current summaries add the numeric process snapshot and bounded time series.

  const frames = [];
  for (const frame of parsed.frames) {
    if (!frame || typeof frame !== 'object' || Array.isArray(frame)
      || !hasOnlyKeys(frame, FRAME_KEYS)
      || !isSafeFunctionName(frame.functionName)
      || !isSafeSourceFile(frame.sourceFile)
      || !Number.isSafeInteger(frame.line)
      || frame.line < 0
      || !Number.isSafeInteger(frame.column)
      || frame.column < 0
      || !Number.isSafeInteger(frame.sampledBytes)
      || frame.sampledBytes <= 0) {
      return null;
    }
    frames.push({
      functionName: frame.functionName,
      sourceFile: frame.sourceFile,
      line: frame.line,
      column: frame.column,
      sampledBytes: frame.sampledBytes,
    });
  }

  const stacks = [];
  for (const stack of parsed.stacks) {
    if (!stack || typeof stack !== 'object' || Array.isArray(stack)
      || !hasOnlyKeys(stack, STACK_KEYS)
      || !Array.isArray(stack.frames)
      || stack.frames.length === 0
      || stack.frames.length > MAX_STACK_FRAMES
      || !Number.isSafeInteger(stack.sampledBytes)
      || stack.sampledBytes <= 0) {
      return null;
    }

    const stackFrames = [];
    for (const frame of stack.frames) {
      if (!frame || typeof frame !== 'object' || Array.isArray(frame)
        || !hasOnlyKeys(frame, STACK_FRAME_KEYS)
        || !isSafeFunctionName(frame.functionName)
        || !isSafeSourceFile(frame.sourceFile)
        || !Number.isSafeInteger(frame.line)
        || frame.line < 0
        || !Number.isSafeInteger(frame.column)
        || frame.column < 0) {
        return null;
      }
      stackFrames.push({
        functionName: frame.functionName,
        sourceFile: frame.sourceFile,
        line: frame.line,
        column: frame.column,
      });
    }

    stacks.push({ frames: stackFrames, sampledBytes: stack.sampledBytes });
  }

  const normalized = { frames, stacks };
  if (memory) normalized.memory = memory;
  if (memorySeries) normalized.memorySeries = memorySeries;
  return `${expectedPrefix}${JSON.stringify(normalized)}`;
}

/** Validate one compact point containing only the exact run ID and six memory counters. */
export function normalizeHeapMemoryPointLine(line, expectedRunId) {
  if (typeof expectedRunId !== 'string' || !/^\d+-\d+$/.test(expectedRunId)) return null;
  const expectedPrefix = `${HEAP_MEMORY_POINT_PREFIX}${expectedRunId}=`;
  if (typeof line !== 'string'
    || line.length > MAX_MEMORY_POINT_LINE_LENGTH
    || !line.startsWith(expectedPrefix)) {
    return null;
  }

  let point;
  try {
    point = JSON.parse(line.slice(expectedPrefix.length));
  } catch {
    return null;
  }

  if (!Array.isArray(point)
    || point.length !== MEMORY_SERIES_TUPLE_LENGTH
    || point.some((value) => !Number.isSafeInteger(value) || value < 0)) {
    return null;
  }

  const [elapsedMs] = point;
  if (elapsedMs > MAX_MEMORY_POINT_ELAPSED_MS || elapsedMs % MEMORY_SERIES_INTERVAL_MS !== 0) {
    return null;
  }

  return `${expectedPrefix}${JSON.stringify(point)}`;
}

/** Aggregate restart-duplicated absolute-window slots into one bounded chronological series. */
export function aggregateHeapMemoryPointLines(text, expectedRunId) {
  if (typeof expectedRunId !== 'string' || !/^\d+-\d+$/.test(expectedRunId)
    || typeof text !== 'string'
    || text.length > MAX_MEMORY_POINT_BATCH_LENGTH) {
    return null;
  }

  const pointPrefix = `${HEAP_MEMORY_POINT_PREFIX}${expectedRunId}=`;
  const pointsByElapsedMs = new Map();
  let candidateCount = 0;
  let inputLineCount = 0;
  for (let start = 0; start < text.length;) {
    const nextNewline = text.indexOf('\n', start);
    const end = nextNewline === -1 ? text.length : nextNewline;
    const rawLine = text.slice(start, end);
    start = nextNewline === -1 ? text.length : nextNewline + 1;
    const line = rawLine.endsWith('\r') ? rawLine.slice(0, -1) : rawLine;
    inputLineCount += 1;
    if (inputLineCount > MAX_MEMORY_POINT_INPUT_LINES) return null;
    if (!line.startsWith(pointPrefix)) continue;
    candidateCount += 1;
    if (candidateCount > MAX_MEMORY_POINT_CANDIDATES) return null;

    const normalized = normalizeHeapMemoryPointLine(line, expectedRunId);
    if (!normalized) return null;
    const point = JSON.parse(normalized.slice(pointPrefix.length));
    // Docker logs preserve append order. Replacing the same absolute slot keeps
    // the latest measurement when Node restarted during the diagnostic window.
    pointsByElapsedMs.set(point[0], point);
  }

  if (pointsByElapsedMs.size === 0 || pointsByElapsedMs.size > MAX_MEMORY_SERIES_POINTS) return null;
  const orderedPoints = [...pointsByElapsedMs.entries()]
    .sort(([left], [right]) => left - right)
    .map(([, point]) => point);
  return `LUNIDEX_HEAP_MEMORY_SERIES_${expectedRunId}=${JSON.stringify(orderedPoints)}`;
}

async function runCli() {
  const memorySeriesMode = process.argv[2] === '--memory-series';
  const expectedRunId = process.argv[memorySeriesMode ? 3 : 2] ?? '';
  const maxInputLength = memorySeriesMode ? MAX_MEMORY_POINT_BATCH_LENGTH : MAX_INPUT_LENGTH;
  let input = '';
  let oversized = false;
  for await (const chunk of process.stdin) {
    input += chunk;
    if (input.length > maxInputLength) {
      oversized = true;
      break;
    }
  }

  const safeOutput = oversized
    ? null
    : memorySeriesMode
      ? aggregateHeapMemoryPointLines(input, expectedRunId)
      : normalizeHeapSampleSummaryLine(input.trimEnd(), expectedRunId);
  if (!safeOutput) {
    process.stderr.write(memorySeriesMode
      ? 'No valid bounded heap memory series was returned.\n'
      : 'No valid safe heap sampler summary was returned.\n');
    process.exitCode = 1;
    return;
  }
  process.stdout.write(`${safeOutput}\n`);
}

const invokedPath = process.argv[1] ? pathToFileURL(process.argv[1]).href : '';
if (invokedPath === import.meta.url) {
  await runCli();
}
