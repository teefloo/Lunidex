import test from 'node:test';
import assert from 'node:assert/strict';

import {
  HEAP_SAMPLE_SUMMARY_PREFIX,
  normalizeHeapSampleSummaryLine,
} from './validate-heap-sample-summary.mjs';

test('normalizes the current run allowlisted heap summary fields only', () => {
  const runId = '123456789-1';
  const prefix = `${HEAP_SAMPLE_SUMMARY_PREFIX}${runId}=`;
  const line = `${prefix}${JSON.stringify({
    frames: [{ functionName: 'loadCatalog', sourceFile: 'catalog.js', line: 12, column: 20, sampledBytes: 4096 }],
    stacks: [{
      frames: [{ functionName: 'loadCatalog', sourceFile: 'catalog.js', line: 12, column: 20 }],
      sampledBytes: 4096,
    }],
    environment: 'must-not-leak',
  })}`;

  assert.equal(normalizeHeapSampleSummaryLine(line, runId), null);
  const validLine = `${prefix}${JSON.stringify({
    frames: [{ functionName: 'loadCatalog', sourceFile: 'catalog.js', line: 12, column: 20, sampledBytes: 4096 }],
    stacks: [{
      frames: [{ functionName: 'loadCatalog', sourceFile: 'catalog.js', line: 12, column: 20 }],
      sampledBytes: 4096,
    }],
  })}`;
  assert.equal(normalizeHeapSampleSummaryLine(validLine, runId), validLine);
  assert.equal(normalizeHeapSampleSummaryLine(validLine, '123456788-1'), null);
});

test('rejects malformed or data-bearing frame metadata without echoing it', () => {
  const runId = '123456789-1';
  const prefix = `${HEAP_SAMPLE_SUMMARY_PREFIX}${runId}=`;
  const unsafeLine = `${HEAP_SAMPLE_SUMMARY_PREFIX}${runId}=${JSON.stringify({
    frames: [{ functionName: 'person@example.com', sourceFile: '/private/data.js', line: 1, column: 3, sampledBytes: 3 }],
    stacks: [],
  })}`;

  assert.equal(normalizeHeapSampleSummaryLine(unsafeLine, runId), null);
  const invalidColumnLine = prefix + JSON.stringify({
    frames: [{ functionName: 'loadCatalog', sourceFile: 'catalog.js', line: 12, column: -1, sampledBytes: 3 }],
    stacks: [],
  });
  assert.equal(normalizeHeapSampleSummaryLine(invalidColumnLine, runId), null);
  assert.equal(normalizeHeapSampleSummaryLine('secret=not-a-summary', runId), null);
});

test('rejects unsafe, oversized, or data-bearing allocation stacks', () => {
  const runId = '123456789-1';
  const prefix = `${HEAP_SAMPLE_SUMMARY_PREFIX}${runId}=`;
  const safeFrame = { functionName: 'loadCatalog', sourceFile: 'catalog.js', line: 12, column: 20 };

  const unsafeSource = prefix + JSON.stringify({
    frames: [],
    stacks: [{
      frames: [{ ...safeFrame, sourceFile: '/private/customer.js' }],
      sampledBytes: 4096,
    }],
  });
  assert.equal(normalizeHeapSampleSummaryLine(unsafeSource, runId), null);

  const tooDeep = prefix + JSON.stringify({
    frames: [],
    stacks: [{ frames: Array.from({ length: 9 }, () => safeFrame), sampledBytes: 4096 }],
  });
  assert.equal(normalizeHeapSampleSummaryLine(tooDeep, runId), null);

  const tooManyStacks = prefix + JSON.stringify({
    frames: [],
    stacks: Array.from({ length: 11 }, () => ({ frames: [safeFrame], sampledBytes: 1 })),
  });
  assert.equal(normalizeHeapSampleSummaryLine(tooManyStacks, runId), null);

  const invalidBytes = prefix + JSON.stringify({
    frames: [],
    stacks: [{ frames: [safeFrame], sampledBytes: Number.MAX_SAFE_INTEGER + 1 }],
  });
  assert.equal(normalizeHeapSampleSummaryLine(invalidBytes, runId), null);
});
