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
    environment: 'must-not-leak',
  })}`;

  assert.equal(normalizeHeapSampleSummaryLine(line, runId), null);
  const validLine = `${prefix}${JSON.stringify({
    frames: [{ functionName: 'loadCatalog', sourceFile: 'catalog.js', line: 12, column: 20, sampledBytes: 4096 }],
  })}`;
  assert.equal(normalizeHeapSampleSummaryLine(validLine, runId), validLine);
  assert.equal(normalizeHeapSampleSummaryLine(validLine, '123456788-1'), null);
});

test('rejects malformed or data-bearing frame metadata without echoing it', () => {
  const runId = '123456789-1';
  const prefix = `${HEAP_SAMPLE_SUMMARY_PREFIX}${runId}=`;
  const unsafeLine = `${HEAP_SAMPLE_SUMMARY_PREFIX}${runId}=${JSON.stringify({
    frames: [{ functionName: 'person@example.com', sourceFile: '/private/data.js', line: 1, column: 3, sampledBytes: 3 }],
  })}`;

  assert.equal(normalizeHeapSampleSummaryLine(unsafeLine, runId), null);
  const invalidColumnLine = prefix + JSON.stringify({
    frames: [{ functionName: 'loadCatalog', sourceFile: 'catalog.js', line: 12, column: -1, sampledBytes: 3 }],
  });
  assert.equal(normalizeHeapSampleSummaryLine(invalidColumnLine, runId), null);
  assert.equal(normalizeHeapSampleSummaryLine('secret=not-a-summary', runId), null);
});
