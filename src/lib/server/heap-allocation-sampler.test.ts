import { describe, expect, it } from 'vitest';

import { collectHeapSample, summarizeHeapProfile } from './heap-allocation-sampler';

describe('heap allocation sampler summaries', () => {
  it('aggregates only bounded frame metadata and strips paths and unsafe names', () => {
    const summary = summarizeHeapProfile({
      head: {
        callFrame: { functionName: '(root)', url: '', lineNumber: 0 },
        selfSize: 0,
        children: [
          {
            callFrame: {
              functionName: 'loadCatalog',
              url: 'file:///srv/lunidex/.next/server/chunks/catalog.js?token=do-not-log',
              lineNumber: 40,
              columnNumber: 8,
            },
            selfSize: 100,
            children: [],
          },
          {
            callFrame: {
              functionName: 'loadCatalog',
              url: 'file:///srv/lunidex/.next/server/chunks/catalog.js',
              lineNumber: 40,
              columnNumber: 8,
            },
            selfSize: 250,
            children: [],
          },
          {
            callFrame: {
              functionName: 'loadCatalog',
              url: 'file:///srv/lunidex/.next/server/chunks/catalog.js',
              lineNumber: 40,
              columnNumber: 14,
            },
            selfSize: 75,
            children: [],
          },
          {
            callFrame: {
              functionName: 'user@example.com',
              url: '/private/customer-data.js?email=private@example.com',
              lineNumber: 6,
              columnNumber: Number.POSITIVE_INFINITY,
            },
            selfSize: 500,
            children: [],
          },
        ],
      },
    });

    expect(summary).toEqual({
      frames: [
        { functionName: '(anonymous)', sourceFile: 'customer-data.js', line: 7, column: 0, sampledBytes: 500 },
        { functionName: 'loadCatalog', sourceFile: 'catalog.js', line: 41, column: 9, sampledBytes: 350 },
        { functionName: 'loadCatalog', sourceFile: 'catalog.js', line: 41, column: 15, sampledBytes: 75 },
      ],
    });
    expect(JSON.stringify(summary)).not.toContain('/srv/lunidex');
    expect(JSON.stringify(summary)).not.toContain('private@example.com');
    expect(JSON.stringify(summary)).not.toContain('do-not-log');
  });

  it('starts and stops a short in-process Node inspector sampling window', async () => {
    const sample = collectHeapSample(25);
    const allocations: Array<{ label: string; payload: string }> = [];
    for (let index = 0; index < 4_000; index += 1) {
      allocations.push({ label: `fixture-${index}`, payload: 'heap-sampler-test-payload'.repeat(4) });
    }
    await new Promise<void>((resolve) => setTimeout(resolve, 35));
    const summary = await sample;

    expect(summary.frames.length).toBeLessThanOrEqual(20);
    for (const frame of summary.frames) {
      expect(Object.keys(frame).sort()).toEqual(['column', 'functionName', 'line', 'sampledBytes', 'sourceFile']);
      expect(frame.column).toBeGreaterThanOrEqual(0);
      expect(Number.isSafeInteger(frame.column)).toBe(true);
      expect(frame.sampledBytes).toBeGreaterThan(0);
      expect(frame.sourceFile).not.toContain('/');
    }
    expect(JSON.stringify(summary)).not.toContain('heap-sampler-test-payload');
    expect(allocations).toHaveLength(4_000);
  });
});
