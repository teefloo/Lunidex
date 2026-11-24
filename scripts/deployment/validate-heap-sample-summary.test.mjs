import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  HEAP_SAMPLE_SUMMARY_PREFIX,
  aggregateHeapMemoryPointLines,
  normalizeHeapSampleSummaryLine,
  normalizeHeapMemoryPointLine,
} from './validate-heap-sample-summary.mjs';

const MEMORY_POINT_PREFIX = 'LUNIDEX_HEAP_MEMORY_POINT_';

const SAFE_MEMORY = {
  rss: 1024,
  heapTotal: 768,
  heapUsed: 512,
  external: 128,
  arrayBuffers: 64,
  heapLimit: 2048,
};

function readWorkflowStep(workflowPath, name) {
  const workflow = readFileSync(new URL(workflowPath, import.meta.url), 'utf8');
  const stepStart = workflow.indexOf(`      - name: ${name}`);
  assert.notEqual(stepStart, -1, `workflow step is missing: ${name}`);
  const nextStepStart = workflow.indexOf('\n      - ', stepStart + 1);
  return workflow.slice(stepStart, nextStepStart === -1 ? undefined : nextStepStart);
}

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

test('accepts only a bounded, ordered relative memory series with exact numeric tuples', () => {
  const runId = '123456789-1';
  const prefix = `${HEAP_SAMPLE_SUMMARY_PREFIX}${runId}=`;
  const series = Array.from({ length: 60 }, (_, index) => [
    (index + 1) * 15_000,
    1024 + index,
    768 + index,
    512 + index,
    128 + index,
    64 + index,
    2048,
  ]);
  const lineWithSeries = (memorySeries) => `${prefix}${JSON.stringify({
    frames: [],
    stacks: [],
    memory: SAFE_MEMORY,
    memorySeries,
  })}`;
  const validLine = lineWithSeries(series);

  assert.equal(normalizeHeapSampleSummaryLine(validLine, runId), validLine);
  assert.equal(normalizeHeapSampleSummaryLine(lineWithSeries([]), runId), null);
  assert.equal(normalizeHeapSampleSummaryLine(lineWithSeries([...series, series.at(-1)]), runId), null);
  assert.equal(normalizeHeapSampleSummaryLine(lineWithSeries([[15_000, 1, 2, 3, 4, 5]]), runId), null);
  assert.equal(normalizeHeapSampleSummaryLine(lineWithSeries([[15_000, 1, 2, 3, -4, 5, 6]]), runId), null);
  assert.equal(normalizeHeapSampleSummaryLine(lineWithSeries([[15_000, 1, 2, 3, 4, 5, Number.MAX_SAFE_INTEGER + 1]]), runId), null);
  assert.equal(normalizeHeapSampleSummaryLine(lineWithSeries([[15_000, 1, 2, 3, 4, 5, 6], [15_000, 1, 2, 3, 4, 5, 6]]), runId), null);
  assert.equal(normalizeHeapSampleSummaryLine(lineWithSeries([[900_001, 1, 2, 3, 4, 5, 6]]), runId), null);
  assert.equal(normalizeHeapSampleSummaryLine(lineWithSeries([{ elapsedMs: 15_000, rss: 1 }]), runId), null);
  assert.equal(normalizeHeapSampleSummaryLine(`${prefix}${'x'.repeat(16_384)}`, runId), null);
});

test('accepts only exact-run memory points with an aligned timestamp and six safe counters', () => {
  const runId = '123456789-1';
  const line = `${MEMORY_POINT_PREFIX}${runId}=[45000,1024,768,512,128,64,2048]`;

  assert.equal(normalizeHeapMemoryPointLine(line, runId), line);
  assert.equal(normalizeHeapMemoryPointLine(`${MEMORY_POINT_PREFIX}123456788-1=[45000,1,2,3,4,5,6]`, runId), null);
  assert.equal(normalizeHeapMemoryPointLine(`${MEMORY_POINT_PREFIX}${runId}=[45001,1,2,3,4,5,6]`, runId), null);
  assert.equal(normalizeHeapMemoryPointLine(`${MEMORY_POINT_PREFIX}${runId}=[900000,1,2,3,4,5,6]`, runId), null);
  assert.equal(normalizeHeapMemoryPointLine(`${MEMORY_POINT_PREFIX}${runId}=[15000,1,2,3,-4,5,6]`, runId), null);
  assert.equal(normalizeHeapMemoryPointLine(`${MEMORY_POINT_PREFIX}${runId}=[15000,1,2,3,4,5,9007199254740992]`, runId), null);
  assert.equal(normalizeHeapMemoryPointLine(`${MEMORY_POINT_PREFIX}${runId}=[15000,1,2,3,4,5]`, runId), null);
  assert.equal(normalizeHeapMemoryPointLine(`${MEMORY_POINT_PREFIX}${runId}=${'x'.repeat(500)}`, runId), null);
});

test('aggregates restart-duplicated points by absolute slot and returns them chronologically', () => {
  const runId = '123456789-1';
  const prefix = `${MEMORY_POINT_PREFIX}${runId}=`;
  const input = [
    `${prefix}[30000,300,200,100,30,20,1000]`,
    'unrelated application output must not survive aggregation',
    `${prefix}[0,100,80,50,10,5,1000]`,
    `${prefix}[30000,360,240,120,36,24,1000]`,
    `${MEMORY_POINT_PREFIX}123456788-1=[45000,999,999,999,999,999,999]`,
    `${prefix}[15000,150,120,75,15,10,1000]`,
  ].join('\n');

  assert.equal(
    aggregateHeapMemoryPointLines(input, runId),
    `LUNIDEX_HEAP_MEMORY_SERIES_${runId}=[[0,100,80,50,10,5,1000],[15000,150,120,75,15,10,1000],[30000,360,240,120,36,24,1000]]`,
  );
});

test('bounds aggregated points to 60 slots and rejects malformed exact-run lines without echoing input', () => {
  const runId = '123456789-1';
  const prefix = `${MEMORY_POINT_PREFIX}${runId}=`;
  const sixtyPoints = Array.from({ length: 60 }, (_, index) => (
    `${prefix}[${index * 15_000},${index},2,3,4,5,6]`
  )).join('\n');
  const tooManySlots = `${sixtyPoints}\n${prefix}[900000,1,2,3,4,5,6]`;

  const boundedSeries = aggregateHeapMemoryPointLines(sixtyPoints, runId);
  assert.equal(boundedSeries?.startsWith(`LUNIDEX_HEAP_MEMORY_SERIES_${runId}=`), true);
  assert.ok(boundedSeries);
  assert.equal(JSON.parse(boundedSeries.slice(boundedSeries.indexOf('=') + 1)).length, 60);
  assert.ok(boundedSeries.length < 16_384);
  assert.equal(aggregateHeapMemoryPointLines(tooManySlots, runId), null);
  assert.equal(aggregateHeapMemoryPointLines(`${prefix}[15000,1,2,3,4,5,6]\n${prefix}secret=must-not-leak`, runId), null);
  assert.equal(aggregateHeapMemoryPointLines('private@example.com and unrelated logs', runId), null);
  assert.equal(aggregateHeapMemoryPointLines(`${prefix}${'x'.repeat(512)}`, runId), null);
  assert.equal(aggregateHeapMemoryPointLines('secret=must-not-leak', runId), null);
});

test('keeps the exact-run memory-series retrieval required when an optional summary is absent', () => {
  const workflows = [
    {
      path: '../../.github/workflows/audit-ovh-resources.yml',
      summaryName: 'Retrieve one matching sanitized heap sample',
      seriesName: 'Retrieve restart-safe memory points for the exact diagnostic run',
      condition: "if: inputs.expected_heap_sample_run_id != ''",
    },
    {
      path: '../../.github/workflows/deploy-ovh-production.yml',
      summaryName: 'Retrieve optional sanitized heap allocation summary',
      seriesName: 'Retrieve the exact-run sanitized heap memory series',
      condition: "if: success() && env.DEPLOYMENT_MODE == 'deploy' && env.HEAP_SAMPLING_DIAGNOSTIC == 'true'",
      preserveWindowWait: true,
    },
  ];

  for (const workflow of workflows) {
    const workflowText = readFileSync(new URL(workflow.path, import.meta.url), 'utf8');
    const summaryStep = readWorkflowStep(workflow.path, workflow.summaryName);
    const seriesStep = readWorkflowStep(workflow.path, workflow.seriesName);
    assert.match(summaryStep, /^        continue-on-error: true$/m);
    assert.ok(workflowText.indexOf(`- name: ${workflow.seriesName}`) > workflowText.indexOf(`- name: ${workflow.summaryName}`));
    assert.match(seriesStep, new RegExp(workflow.condition.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    assert.match(seriesStep, /validate-heap-sample-summary\.mjs --memory-series/);
    assert.doesNotMatch(seriesStep, /^        continue-on-error: true$/m);
    assert.ok(seriesStep.includes('HEAP_SAMPLING_RUN_ID') || seriesStep.includes('EXPECTED_HEAP_SAMPLE_RUN_ID'));
    if (workflow.preserveWindowWait) assert.match(summaryStep, /timeout 980s/);
  }
});
