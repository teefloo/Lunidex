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
      stacks: [
        { frames: [{ functionName: '(anonymous)', sourceFile: 'customer-data.js', line: 7, column: 0 }], sampledBytes: 500 },
        { frames: [{ functionName: 'loadCatalog', sourceFile: 'catalog.js', line: 41, column: 9 }], sampledBytes: 350 },
        { frames: [{ functionName: 'loadCatalog', sourceFile: 'catalog.js', line: 41, column: 15 }], sampledBytes: 75 },
      ],
    });
    expect(JSON.stringify(summary)).not.toContain('/srv/lunidex');
    expect(JSON.stringify(summary)).not.toContain('private@example.com');
    expect(JSON.stringify(summary)).not.toContain('do-not-log');
  });

  it('keeps the top ten stacks at eight sanitized frames and within the log limit', () => {
    const branches = Array.from({ length: 12 }, (_, branchIndex) => {
      const longName = `f${branchIndex}${'x'.repeat(77)}`;
      let node: Record<string, unknown> = {
        callFrame: {
          functionName: `allocate${branchIndex}`,
          url: `file:///srv/lunidex/${'s'.repeat(108)}${branchIndex}.js?email=private@example.com`,
          lineNumber: 100 + branchIndex,
          columnNumber: 10,
        },
        selfSize: 1_000 + branchIndex,
        children: [],
      };

      for (let depth = 0; depth < 10; depth += 1) {
        node = {
          callFrame: {
            functionName: longName,
            url: `file:///srv/lunidex/${'s'.repeat(108)}${depth}.js?token=must-not-log`,
            lineNumber: depth,
            columnNumber: depth,
          },
          selfSize: 0,
          children: [node],
        };
      }

      return node;
    });
    const summary = summarizeHeapProfile({
      head: {
        callFrame: { functionName: '(root)', url: '', lineNumber: 0 },
        selfSize: 0,
        children: branches,
      },
    });

    expect(summary.stacks).toHaveLength(10);
    expect(summary.stacks.every((stack) => stack.frames.length <= 8)).toBe(true);
    expect(summary.stacks.map((stack) => stack.sampledBytes)).toEqual(
      Array.from({ length: 10 }, (_, index) => 1_011 - index),
    );
    expect(JSON.stringify(summary).length).toBeLessThanOrEqual(15_000);
    expect(JSON.stringify(summary)).not.toContain('/srv/lunidex');
    expect(JSON.stringify(summary)).not.toContain('private@example.com');
    expect(JSON.stringify(summary)).not.toContain('must-not-log');
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
    expect(summary.stacks.length).toBeLessThanOrEqual(10);
    for (const frame of summary.frames) {
      expect(Object.keys(frame).sort()).toEqual(['column', 'functionName', 'line', 'sampledBytes', 'sourceFile']);
      expect(frame.column).toBeGreaterThanOrEqual(0);
      expect(Number.isSafeInteger(frame.column)).toBe(true);
      expect(frame.sampledBytes).toBeGreaterThan(0);
      expect(frame.sourceFile).not.toContain('/');
    }
    for (const stack of summary.stacks) {
      expect(stack.frames.length).toBeLessThanOrEqual(8);
      expect(stack.sampledBytes).toBeGreaterThan(0);
      for (const frame of stack.frames) {
        expect(Object.keys(frame).sort()).toEqual(['column', 'functionName', 'line', 'sourceFile']);
        expect(frame.sourceFile).not.toContain('/');
      }
    }
    expect(JSON.stringify(summary)).not.toContain('heap-sampler-test-payload');
    expect(allocations).toHaveLength(4_000);
  });
});
