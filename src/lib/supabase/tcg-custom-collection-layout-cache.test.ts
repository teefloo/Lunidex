import { beforeEach, describe, expect, it, vi } from 'vitest';

const indexedDbValues = vi.hoisted(() => new Map<string, unknown>());
const indexedDbQueues = vi.hoisted(() => new Map<string, Promise<void>>());
vi.mock('idb-keyval', () => ({
  get: async (key: string) => indexedDbValues.get(key),
  set: async (key: string, value: unknown) => { indexedDbValues.set(key, value); },
  update: async (key: string, updater: (current: unknown) => unknown) => {
    const previous = indexedDbQueues.get(key) ?? Promise.resolve();
    let release: () => void = () => {};
    const currentWrite = new Promise<void>((resolve) => { release = resolve; });
    indexedDbQueues.set(key, previous.then(() => currentWrite));
    await previous;
    try {
      indexedDbValues.set(key, updater(indexedDbValues.get(key)));
    } finally {
      release();
    }
  },
}));

import {
  readTCGCustomCollectionLayoutCache,
  writeTCGCustomCollectionLayoutCache,
  type TCGCustomCollectionLayoutCache,
} from './tcg-custom-collection-layout-cache';

const layoutId = '126e8648-39da-4fc9-88b2-fd194d28cc5a';
const otherLayoutId = '36e431a6-c3c1-46d4-804d-f5fa08f1af9d';

function cache(collectionId = layoutId): TCGCustomCollectionLayoutCache {
  return {
    version: 1,
    layouts: [{ collectionId, gridPreset: '4x3', cardOrder: [{ cardId: 'base1-001', language: 'fr', copyIndex: 0 }] }],
    clock: 9,
    entries: { [collectionId]: { clock: 8, deviceId: 'device-a', present: true } },
  };
}

describe('account-scoped TCG custom collection layout cache', () => {
  beforeEach(() => {
    indexedDbValues.clear();
    indexedDbQueues.clear();
  });

  it('isolates each account under its own IndexedDB key', async () => {
    expect(await writeTCGCustomCollectionLayoutCache('account/a', cache())).toBe(true);
    expect(await readTCGCustomCollectionLayoutCache('account/a')).toEqual(cache());
    expect(await readTCGCustomCollectionLayoutCache('account-b')).toBeNull();

    expect(await writeTCGCustomCollectionLayoutCache('account-b', cache(otherLayoutId))).toBe(true);
    expect(await readTCGCustomCollectionLayoutCache('account-b')).toEqual(cache(otherLayoutId));
    expect(await readTCGCustomCollectionLayoutCache('account/a')).toEqual(cache());
  });

  it('retains tombstones and canonicalizes layout identities on reload', async () => {
    const stored = {
      version: 1 as const,
      layouts: [
        { collectionId: otherLayoutId, gridPreset: '3x3' as const, cardOrder: [] },
        { collectionId: layoutId, gridPreset: '2x2' as const, cardOrder: [] },
      ],
      clock: 15,
      entries: {
        [layoutId]: { clock: 12, deviceId: 'device-a', present: true },
        [otherLayoutId]: { clock: 15, deviceId: 'device-a', present: false },
      },
    };
    expect(await writeTCGCustomCollectionLayoutCache('account-a', stored)).toBe(true);
    const reloaded = await readTCGCustomCollectionLayoutCache('account-a');
    expect(reloaded?.layouts.map((layout) => layout.collectionId)).toEqual([layoutId, otherLayoutId].sort());
    expect(reloaded?.entries[otherLayoutId]).toEqual({ clock: 15, deviceId: 'device-a', present: false });
  });

  it('rejects corrupted cache envelopes instead of exposing unvalidated layouts', async () => {
    indexedDbValues.set('primedex-tcg-custom-collection-layout-cache:v1:account-a', {
      ...cache(),
      layouts: [{ collectionId: layoutId, gridPreset: '5x5', cardOrder: [] }],
    });
    expect(await readTCGCustomCollectionLayoutCache('account-a')).toBeNull();
  });

  it('atomically merges concurrent writes for different binders and keeps the newer same-binder stamp', async () => {
    const binderA = cache(layoutId);
    const binderB = cache(otherLayoutId);
    binderA.layouts[0] = { collectionId: layoutId, gridPreset: '2x2', cardOrder: [] };
    binderA.clock = 10;
    binderA.entries[layoutId] = { clock: 10, deviceId: 'device-a', present: true };
    binderB.layouts[0] = { collectionId: otherLayoutId, gridPreset: '3x3', cardOrder: [] };
    binderB.clock = 11;
    binderB.entries[otherLayoutId] = { clock: 11, deviceId: 'device-b', present: true };

    await Promise.all([
      writeTCGCustomCollectionLayoutCache('account-a', binderA),
      writeTCGCustomCollectionLayoutCache('account-a', binderB),
    ]);

    const afterDifferentBinderWrites = await readTCGCustomCollectionLayoutCache('account-a');
    expect(afterDifferentBinderWrites?.layouts.map((layout) => layout.collectionId).sort()).toEqual([layoutId, otherLayoutId].sort());

    const older = {
      ...binderA,
      layouts: [{ collectionId: layoutId, gridPreset: '4x4' as const, cardOrder: [] }],
      clock: 12,
      entries: { [layoutId]: { clock: 12, deviceId: 'device-a', present: true } },
    };
    const newer = {
      ...binderA,
      layouts: [{ collectionId: layoutId, gridPreset: '4x3' as const, cardOrder: [] }],
      clock: 13,
      entries: { [layoutId]: { clock: 13, deviceId: 'device-a', present: true } },
    };
    await Promise.all([
      writeTCGCustomCollectionLayoutCache('account-a', older),
      writeTCGCustomCollectionLayoutCache('account-a', newer),
    ]);

    const finalCache = await readTCGCustomCollectionLayoutCache('account-a');
    expect(finalCache?.layouts.find((layout) => layout.collectionId === layoutId)?.gridPreset).toBe('4x3');
    expect(finalCache?.layouts.some((layout) => layout.collectionId === otherLayoutId)).toBe(true);
    expect(finalCache?.entries[layoutId]).toEqual({ clock: 13, deviceId: 'device-a', present: true });

    await writeTCGCustomCollectionLayoutCache('account-a', older);
    const afterStaleWrite = await readTCGCustomCollectionLayoutCache('account-a');
    expect(afterStaleWrite?.layouts.find((layout) => layout.collectionId === layoutId)?.gridPreset).toBe('4x3');
    expect(afterStaleWrite?.entries[layoutId]).toEqual({ clock: 13, deviceId: 'device-a', present: true });
  });
});
