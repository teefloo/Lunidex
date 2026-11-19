import { pathToFileURL } from 'node:url';

export const HEAP_SAMPLE_SUMMARY_PREFIX = 'LUNIDEX_HEAP_SAMPLE_SUMMARY_';
const MAX_INPUT_LENGTH = 16_384;
const MAX_FRAMES = 20;
const MAX_FUNCTION_NAME_LENGTH = 80;
const MAX_SOURCE_FILE_LENGTH = 120;
const FRAME_KEYS = ['functionName', 'line', 'column', 'sampledBytes', 'sourceFile'];

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

/** Accept only the exact allowlisted frame summary; never echo unvalidated input. */
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

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)
    || !hasOnlyKeys(parsed, ['frames'])
    || !Array.isArray(parsed.frames)
    || parsed.frames.length > MAX_FRAMES) {
    return null;
  }

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

  return `${expectedPrefix}${JSON.stringify({ frames })}`;
}

async function runCli() {
  const expectedRunId = process.argv[2] ?? '';
  let input = '';
  for await (const chunk of process.stdin) {
    input += chunk;
    if (input.length > MAX_INPUT_LENGTH) break;
  }

  const line = input.trimEnd();
  const safeSummary = normalizeHeapSampleSummaryLine(line, expectedRunId);
  if (!safeSummary) {
    process.stderr.write('No valid safe heap sampler summary was returned.\n');
    process.exitCode = 1;
    return;
  }
  process.stdout.write(`${safeSummary}\n`);
}

const invokedPath = process.argv[1] ? pathToFileURL(process.argv[1]).href : '';
if (invokedPath === import.meta.url) {
  await runCli();
}
