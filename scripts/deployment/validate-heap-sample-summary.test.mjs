import test from 'node:test';
import assert from 'node:assert/strict';

import {
  HEAP_SAMPLE_SUMMARY_PREFIX,
  normalizeHeapSampleSummaryLine,
} from './validate-heap-sample-summary.mjs';

const SAFE_MEMORY = {
  rss: 1024,
  heapTotal: 768,
  heapUsed: 512,
  external: 128,
  arrayBuffers: 64,
  heapLimit: 2048,
};

test('normalizes the current run allowlisted heap summary fields only', () => {
  const runId = '123456789-1';
  const prefix = `${HEAP_SAMPLE_SUMMARY_PREFIX}${runId}=`;
  const line = `${prefix}${JSON.stringify({
    frames: [{ functionName: 'loadCatalog', sourceFile: 'catalog.js', line: 12, column: 20, sampledBytes: 4096 }],
    stacks: [{
      frames: [{ functionName: 'loadCatalog', sourceFile: 'catalog.js', line: 12, column: 20 }],
      sampledBytes: 4096,
    }],
    memory: SAFE_MEMORY,
    environment: 'must-not-leak',
  })}`;

  assert.equal(normalizeHeapSampleSummaryLine(line, runId), null);
  const validLine = `${prefix}${JSON.stringify({
    frames: [{ functionName: 'loadCatalog', sourceFile: 'catalog.js', line: 12, column: 20, sampledBytes: 4096 }],
    stacks: [{
      frames: [{ functionName: 'loadCatalog', sourceFile: 'catalog.js', line: 12, column: 20 }],
      sampledBytes: 4096,
    }],
    memory: SAFE_MEMORY,
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
    memory: SAFE_MEMORY,
  })}`;

  assert.equal(normalizeHeapSampleSummaryLine(unsafeLine, runId), null);
  const invalidColumnLine = prefix + JSON.stringify({
    frames: [{ functionName: 'loadCatalog', sourceFile: 'catalog.js', line: 12, column: -1, sampledBytes: 3 }],
    stacks: [],
    memory: SAFE_MEMORY,
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
    memory: SAFE_MEMORY,
  });
  assert.equal(normalizeHeapSampleSummaryLine(unsafeSource, runId), null);

  const tooDeep = prefix + JSON.stringify({
    frames: [],
    stacks: [{ frames: Array.from({ length: 9 }, () => safeFrame), sampledBytes: 4096 }],
    memory: SAFE_MEMORY,
  });
  assert.equal(normalizeHeapSampleSummaryLine(tooDeep, runId), null);

  const tooManyStacks = prefix + JSON.stringify({
    frames: [],
    stacks: Array.from({ length: 11 }, () => ({ frames: [safeFrame], sampledBytes: 1 })),
    memory: SAFE_MEMORY,
  });
  assert.equal(normalizeHeapSampleSummaryLine(tooManyStacks, runId), null);

  const invalidBytes = prefix + JSON.stringify({
    frames: [],
    stacks: [{ frames: [safeFrame], sampledBytes: Number.MAX_SAFE_INTEGER + 1 }],
    memory: SAFE_MEMORY,
  });
  assert.equal(normalizeHeapSampleSummaryLine(invalidBytes, runId), null);
});

test('requires exactly six non-negative safe integer memory counters', () => {
  const runId = '123456789-1';
  const prefix = `${HEAP_SAMPLE_SUMMARY_PREFIX}${runId}=`;
  const lineWithMemory = (memory) => `${prefix}${JSON.stringify({ frames: [], stacks: [], memory })}`;
  const legacyLine = `${prefix}${JSON.stringify({ frames: [], stacks: [] })}`;

  assert.equal(normalizeHeapSampleSummaryLine(lineWithMemory(SAFE_MEMORY), runId), lineWithMemory(SAFE_MEMORY));
  assert.equal(normalizeHeapSampleSummaryLine(legacyLine, runId), legacyLine);
  assert.equal(normalizeHeapSampleSummaryLine(`${prefix}${JSON.stringify({ frames: [], stacks: [], legacyExtra: true })}`, runId), null);
  assert.equal(normalizeHeapSampleSummaryLine(lineWithMemory({ ...SAFE_MEMORY, private: 'must-not-leak' }), runId), null);
  assert.equal(normalizeHeapSampleSummaryLine(lineWithMemory({ ...SAFE_MEMORY, rss: '1024' }), runId), null);
  assert.equal(normalizeHeapSampleSummaryLine(lineWithMemory({ ...SAFE_MEMORY, external: -1 }), runId), null);
  assert.equal(normalizeHeapSampleSummaryLine(lineWithMemory({ ...SAFE_MEMORY, heapLimit: Number.MAX_SAFE_INTEGER + 1 }), runId), null);
  assert.equal(normalizeHeapSampleSummaryLine(lineWithMemory(null), runId), null);
});
