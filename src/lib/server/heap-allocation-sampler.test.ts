import { describe, expect, it, vi } from 'vitest';

import {
  collectHeapSample,
  sanitizeHeapMemorySnapshot,
  shouldTriggerHeapSample,
  startHeapAllocationSampler,
  summarizeHeapProfile,
} from './heap-allocation-sampler';

const MEMORY_SNAPSHOT = {
  rss: 1_000,
  heapTotal: 800,
  heapUsed: 500,
  external: 100,
  arrayBuffers: 50,
  heapLimit: 2_000,
};

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
    }, MEMORY_SNAPSHOT);

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
      memory: MEMORY_SNAPSHOT,
      memorySeries: [],
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
    }, MEMORY_SNAPSHOT);

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

  it('keeps a 60-point memory series and the largest allocation frames under the log limit', () => {
    const memorySeries = Array.from({ length: 60 }, (_, index) => [
      (index + 1) * 15_000,
      Number.MAX_SAFE_INTEGER,
      Number.MAX_SAFE_INTEGER,
      Number.MAX_SAFE_INTEGER,
      Number.MAX_SAFE_INTEGER,
      Number.MAX_SAFE_INTEGER,
      Number.MAX_SAFE_INTEGER,
    ] as const);
    const summary = summarizeHeapProfile({
      head: {
        callFrame: { functionName: '(root)', url: '', lineNumber: 0 },
        selfSize: 0,
        children: Array.from({ length: 20 }, (_, index) => ({
          callFrame: {
            functionName: `f${index}${'x'.repeat(78)}`,
            url: `file:///srv/lunidex/${'s'.repeat(108)}${index}.js`,
            lineNumber: index,
            columnNumber: index,
          },
          selfSize: 100_000 - index,
          children: [],
        })),
      },
    }, MEMORY_SNAPSHOT, memorySeries);
    const json = JSON.stringify(summary);

    expect(summary.memorySeries).toEqual(memorySeries);
    expect(summary.frames.length).toBeGreaterThan(0);
    expect(json.length).toBeLessThanOrEqual(15_000);
  });

  it('sanitizes the snapshot to six non-negative integer counters', () => {
    expect(sanitizeHeapMemorySnapshot({
      rss: 1_000,
      heapTotal: 800,
      heapUsed: -1,
      external: 10.5,
      arrayBuffers: Number.MAX_SAFE_INTEGER + 1,
      heapLimit: 2_000,
      environment: 'must-not-log',
    })).toEqual({
      rss: 1_000,
      heapTotal: 800,
      heapUsed: 0,
      external: 0,
      arrayBuffers: 0,
      heapLimit: 2_000,
    });
  });

  it('triggers one bounded sample when either RSS or V8 heap reaches 85 percent', () => {
    const belowThreshold = {
      rss: 849,
      heapTotal: 400,
      heapUsed: 849,
      external: 0,
      arrayBuffers: 0,
      heapLimit: 1_000,
    };
    expect(shouldTriggerHeapSample(belowThreshold)).toBe(false);
    expect(shouldTriggerHeapSample({ ...belowThreshold, rss: 850, heapUsed: 0 })).toBe(true);
    expect(shouldTriggerHeapSample({ ...belowThreshold, rss: 0, heapUsed: 850 })).toBe(true);
    expect(shouldTriggerHeapSample({ ...belowThreshold, rss: 850, heapUsed: 850 })).toBe(true);
    expect(shouldTriggerHeapSample({ ...belowThreshold, heapLimit: 0 })).toBe(false);
  });

  it('starts and stops a short in-process Node inspector sampling window', async () => {
    const sample = collectHeapSample(25);
    const allocations: Array<{ label: string; payload: string }> = [];
    for (let index = 0; index < 4_000; index += 1) {
      allocations.push({ label: `fixture-${index}`, payload: 'heap-sampler-test-payload'.repeat(4) });
    }
    await new Promise<void>((resolve) => setTimeout(resolve, 35));
    const summary = await sample;

    expect(Object.keys(summary.memory).sort()).toEqual([
      'arrayBuffers', 'external', 'heapLimit', 'heapTotal', 'heapUsed', 'rss',
    ]);
    expect(summary.memorySeries).toEqual([]);
    for (const value of Object.values(summary.memory)) {
      expect(Number.isSafeInteger(value)).toBe(true);
      expect(value).toBeGreaterThanOrEqual(0);
    }
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
    expect(JSON.stringify(summary).length).toBeLessThanOrEqual(15_000);
    expect(JSON.stringify(summary)).not.toContain('heap-sampler-test-payload');
    expect(allocations).toHaveLength(4_000);
  });

  it('logs one exact-run time series during the opt-in diagnostic window', async () => {
    vi.useFakeTimers({ now: new Date('2026-11-20T00:00:00.000Z') });
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('NEXT_RUNTIME', 'nodejs');
    vi.stubEnv('LUNIDEX_HEAP_SAMPLER_DIAGNOSTIC', 'enabled');
    vi.stubEnv('LUNIDEX_HEAP_SAMPLER_RUN_ID', '123456789-1');
    vi.stubEnv(
      'LUNIDEX_HEAP_SAMPLER_EXPIRES_AT',
      String(Math.floor(Date.now() / 1_000) + 901),
    );
    const log = vi.spyOn(console, 'info').mockImplementation(() => undefined);

    try {
      startHeapAllocationSampler();
      await vi.advanceTimersByTimeAsync(15 * 60_000);

      expect(log).toHaveBeenCalledOnce();
      const line = String(log.mock.calls[0]?.[0]);
      expect(line.startsWith('LUNIDEX_HEAP_SAMPLE_SUMMARY_123456789-1=')).toBe(true);
      expect(line.length).toBeLessThanOrEqual(16_384);
      const summary = JSON.parse(line.slice(line.indexOf('=') + 1)) as {
        memorySeries: Array<readonly number[]>;
      };
      expect(summary.memorySeries).toHaveLength(60);
      expect(summary.memorySeries[0]?.[0]).toBe(0);
      expect(summary.memorySeries.at(-1)?.[0]).toBe(59 * 15_000);
      expect(summary.memorySeries.every((point) => point.length === 7)).toBe(true);
    } finally {
      log.mockRestore();
      vi.useRealTimers();
      vi.unstubAllEnvs();
    }
  });
});
