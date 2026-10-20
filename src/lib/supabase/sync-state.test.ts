import { describe, expect, it } from 'vitest';
import { decodeTCGCollectionCardKey, encodeTCGCollectionCardKey, encodeTCGCollectionKey, getTCGCollectionCardIdentity } from '@/lib/tcg-collections';
import { advanceSyncMetadata, extractSyncMetadata, getInitialSyncState, normalizeSyncMetadata, preserveLocalPreferences, reconcileSyncState } from './sync-state';
import type { PersistedState } from '@/store/primedex';
import { advanceTcgApiSyncMetadata, attachTcgApiSyncMetadata } from '@/lib/tcg-api-sync';

function withTcg(state: PersistedState, patch: Partial<PersistedState>): PersistedState { return { ...state, ...patch }; }

describe('language-aware sync merge', () => {
  it('persists independent multilingual quantities through validation and sync reconciliation', () => {
    const initial = getInitialSyncState();
    const binder = { id: '126e8648-39da-4fc9-88b2-fd194d28cc5a', name: 'Mixed', createdAt: '2026-10-19T10:00:00.000Z', updatedAt: '2026-10-19T10:00:00.000Z' };
    const card = { collectionId: binder.id, cardId: 'base1-4', language: 'fr' as const, cardName: 'Dracaufeu', addedAt: binder.createdAt, quantity: 4 };
    const base = withTcg(initial, { tcgCustomCollections: [binder], tcgCustomCollectionCards: [card, { ...card, language: 'ja', quantity: 2 }] });
    const metadata = normalizeSyncMetadata(null, base);
    const changed = withTcg(base, { tcgCustomCollectionCards: [{ ...card, quantity: 7 }, { ...card, language: 'ja', quantity: 2 }] });
    const merged = reconcileSyncState(changed, base, advanceSyncMetadata(metadata, base, changed, 'device-a'), metadata, { deviceId: 'device-a' });
    expect(merged.state.tcgCustomCollectionCards.map((entry) => [entry.language, entry.quantity])).toEqual([['fr', 7], ['ja', 2]]);
    expect(merged.state.tcgOwnedCards).toEqual([]);
    expect(merged.state.tcgCollectionCards).toEqual([]);
  });

  it('merges independent binder additions and keeps one card reference per binder', () => {
    const initial = getInitialSyncState();
    const collectionA = { id: '126e8648-39da-4fc9-88b2-fd194d28cc5a', name: '1025', createdAt: '2026-10-19T10:00:00.000Z', updatedAt: '2026-10-19T10:00:00.000Z' };
    const collectionB = { id: '36e431a6-c3c1-46d4-804d-f5fa08f1af9d', name: 'Artwork', createdAt: '2026-10-19T10:01:00.000Z', updatedAt: '2026-10-19T10:01:00.000Z' };
    const cardA = { collectionId: collectionA.id, cardId: 'sv03.5-199', language: 'fr' as const, cardName: 'Dracaufeu', addedAt: collectionA.createdAt };
    const cardB = { ...cardA, collectionId: collectionB.id, addedAt: collectionB.createdAt };
    const local = withTcg(initial, { tcgCustomCollections: [collectionA], tcgCustomCollectionCards: [cardA] });
    const remote = withTcg(initial, { tcgCustomCollections: [collectionB], tcgCustomCollectionCards: [cardB] });
    const localMeta = advanceSyncMetadata(normalizeSyncMetadata(undefined, initial), initial, local, 'device-a');
    const remoteMeta = advanceSyncMetadata(normalizeSyncMetadata(undefined, initial), initial, remote, 'device-b');
    const merged = reconcileSyncState(local, remote, localMeta, remoteMeta, { deviceId: 'device-a' });

    expect(merged.state.tcgCustomCollections).toHaveLength(2);
    expect(merged.state.tcgCustomCollectionCards).toHaveLength(2);
    expect(new Set(merged.state.tcgCustomCollectionCards.map((entry) => entry.collectionId)).size).toBe(2);
  });

  it('keeps a deleted binder deleted when another device edits its stale copy', () => {
    const initial = getInitialSyncState();
    const collection = { id: '126e8648-39da-4fc9-88b2-fd194d28cc5a', name: '1025', createdAt: '2026-10-19T10:00:00.000Z', updatedAt: '2026-10-19T10:00:00.000Z' };
    const card = { collectionId: collection.id, cardId: 'sv03.5-199', language: 'fr' as const, cardName: 'Dracaufeu', addedAt: collection.createdAt };
    const base = withTcg(initial, { tcgCustomCollections: [collection], tcgCustomCollectionCards: [card] });
    const baseMetadata = advanceSyncMetadata(normalizeSyncMetadata(undefined, initial), initial, base, 'device-base');
    const deleted = withTcg(base, { tcgCustomCollections: [], tcgCustomCollectionCards: [] });
    const edited = withTcg(base, {
      tcgCustomCollections: [{ ...collection, name: 'Renamed', updatedAt: '2026-10-21T10:00:00.000Z' }],
    });
    const deletedMetadata = advanceSyncMetadata(baseMetadata, base, deleted, 'device-a');
    const editedMetadata = advanceSyncMetadata(baseMetadata, base, edited, 'device-b');
    const merged = reconcileSyncState(deleted, edited, deletedMetadata, editedMetadata, { deviceId: 'device-a' });

    expect(merged.state.tcgCustomCollections).toEqual([]);
    expect(merged.state.tcgCustomCollectionCards).toEqual([]);
  });

  it('preserves local browsing preferences when resetting a sync session', () => {
    const initial = getInitialSyncState();
    const local = withTcg(initial, {
      showCaughtOnly: 'uncaught',
      selectedGeneration: 1,
      selectedTypes: ['fire'],
      isLegendary: true,
      sortBy: 'name-asc',
      favorites: [25],
    });

    const reset = preserveLocalPreferences(initial, local);

    expect(reset.showCaughtOnly).toBe('uncaught');
    expect(reset.selectedGeneration).toBe(1);
    expect(reset.selectedTypes).toEqual(['fire']);
    expect(reset.isLegendary).toBe(true);
    expect(reset.sortBy).toBe('name-asc');
    expect(reset.favorites).toEqual([]);
  });

  it('merges additions from two devices and keeps a removal tombstone', () => {
    const initial = getInitialSyncState();
    const fr = encodeTCGCollectionKey('fr', 'base1')!; const ja = encodeTCGCollectionKey('ja', 'base1')!;
    const frCard = encodeTCGCollectionCardKey(fr, 'base1-001')!; const jaCard = encodeTCGCollectionCardKey(ja, 'base1-001')!;
    const local = withTcg(initial, { tcgCollections: [fr], tcgCollectionCards: [frCard], tcgActiveCollections: [fr], tcgLegacyOwnedCards: [], tcgOwnedCards: ['base1-001'], tcgCollectionModelVersion: 2 });
    const remote = withTcg(initial, { tcgCollections: [ja], tcgCollectionCards: [jaCard], tcgActiveCollections: [ja], tcgLegacyOwnedCards: [], tcgOwnedCards: ['base1-001'], tcgCollectionModelVersion: 2 });
    const localMeta = advanceSyncMetadata(normalizeSyncMetadata(undefined, initial), initial, local, 'device-a');
    const remoteMeta = advanceSyncMetadata(normalizeSyncMetadata(undefined, initial), initial, remote, 'device-b');
    const merged = reconcileSyncState(local, remote, localMeta, remoteMeta, { deviceId: 'device-a' });
    expect(merged.state.tcgCollections).toEqual([fr, ja].sort()); expect(merged.state.tcgCollectionCards).toEqual([frCard, jaCard].sort());
    const removed = withTcg(local, { tcgCollectionCards: [], tcgCollections: [], tcgActiveCollections: [], tcgOwnedCards: [] });
    const removedMeta = advanceSyncMetadata(localMeta, local, removed, 'device-a');
    const afterRemoval = reconcileSyncState(removed, local, removedMeta, localMeta, { deviceId: 'device-a' });
    const frIdentity = getTCGCollectionCardIdentity(fr, 'base1-001', 'unspecified');
    expect(afterRemoval.state.tcgCollectionCards).toEqual([]); expect(frIdentity).toBeTruthy(); expect(afterRemoval.metadata.collections.tcgCollectionCards?.[frIdentity!]?.present).toBe(false);
  });
  it('rebuilds the compatibility index instead of preserving stale values', () => {
    const initial = getInitialSyncState();
    const local = withTcg(initial, { tcgOwnedCards: ['stale-card'], tcgCollections: [], tcgCollectionCards: [], tcgActiveCollections: [], tcgLegacyOwnedCards: [], tcgCollectionModelVersion: 2 });
    const merged = reconcileSyncState(local, initial, undefined, undefined, { deviceId: 'device-a' });
    expect(merged.state.tcgOwnedCards).toEqual([]);
  });

  it('keeps a local currency preference when an older remote snapshot has none', () => {
    const initial = getInitialSyncState();
    const local = withTcg(initial, { tcgDisplayCurrency: 'USD' });
    const legacyRemote: Partial<PersistedState> = { ...initial };
    delete legacyRemote.tcgDisplayCurrency;
    const merged = reconcileSyncState(local, legacyRemote, undefined, undefined, { deviceId: 'device-a' });
    expect(merged.state.tcgDisplayCurrency).toBe('USD');
  });

  it('merges independent finish quantities while keeping metadata identities quantity-free', () => {
    const initial = getInitialSyncState();
    const collection = encodeTCGCollectionKey('en', 'base1')!;
    const normal = encodeTCGCollectionCardKey(collection, 'base1-001', 'normal', 2)!;
    const reverse = encodeTCGCollectionCardKey(collection, 'base1-001', 'reverse', 3)!;
    const local = withTcg(initial, {
      tcgCollections: [collection], tcgCollectionCards: [normal], tcgActiveCollections: [collection],
      tcgLegacyOwnedCards: [], tcgOwnedCards: ['base1-001'], tcgCollectionModelVersion: 3,
    });
    const remote = withTcg(initial, {
      tcgCollections: [collection], tcgCollectionCards: [reverse], tcgActiveCollections: [collection],
      tcgLegacyOwnedCards: [], tcgOwnedCards: ['base1-001'], tcgCollectionModelVersion: 3,
    });
    const localMeta = advanceSyncMetadata(normalizeSyncMetadata(undefined, initial), initial, local, 'device-a');
    const remoteMeta = advanceSyncMetadata(normalizeSyncMetadata(undefined, initial), initial, remote, 'device-b');
    const merged = reconcileSyncState(local, remote, localMeta, remoteMeta, { deviceId: 'device-a' });
    expect(merged.state.tcgCollectionCards.map((entry) => decodeTCGCollectionCardKey(entry)?.variant)).toEqual(['normal', 'reverse']);
    expect(merged.state.tcgCollectionCards).toContain(normal);
    expect(merged.state.tcgCollectionCards).toContain(reverse);
    expect(Object.keys(merged.metadata.collections.tcgCollectionCards ?? {})).toEqual([
      getTCGCollectionCardIdentity(collection, 'base1-001', 'normal'),
      getTCGCollectionCardIdentity(collection, 'base1-001', 'reverse'),
    ].sort());
  });

  it('uses the existing last-writer clock for two edits of one finish', () => {
    const initial = getInitialSyncState();
    const collection = encodeTCGCollectionKey('en', 'base1')!;
    const localCard = encodeTCGCollectionCardKey(collection, 'base1-001', 'holo', 2)!;
    const remoteCard = encodeTCGCollectionCardKey(collection, 'base1-001', 'holo', 5)!;
    const local = withTcg(initial, { tcgCollections: [collection], tcgCollectionCards: [localCard], tcgActiveCollections: [collection], tcgLegacyOwnedCards: [], tcgCollectionModelVersion: 3 });
    const remote = withTcg(initial, { tcgCollections: [collection], tcgCollectionCards: [remoteCard], tcgActiveCollections: [collection], tcgLegacyOwnedCards: [], tcgCollectionModelVersion: 3 });
    const localMeta = advanceSyncMetadata(normalizeSyncMetadata(undefined, initial), initial, local, 'device-a');
    const remoteMeta = advanceSyncMetadata(normalizeSyncMetadata(undefined, initial), initial, remote, 'device-b');
    const merged = reconcileSyncState(local, remote, localMeta, remoteMeta, { deviceId: 'device-a' });
    expect(merged.state.tcgCollectionCards).toEqual([remoteCard]);
  });

  it('keeps the local quantity when its last-writer stamp wins', () => {
    const initial = getInitialSyncState();
    const collection = encodeTCGCollectionKey('en', 'base1')!;
    const localCard = encodeTCGCollectionCardKey(collection, 'base1-001', 'normal', 7)!;
    const remoteCard = encodeTCGCollectionCardKey(collection, 'base1-001', 'normal', 2)!;
    const local = withTcg(initial, { tcgCollections: [collection], tcgCollectionCards: [localCard], tcgActiveCollections: [collection], tcgLegacyOwnedCards: [], tcgOwnedCards: ['base1-001'], tcgCollectionModelVersion: 3 });
    const remote = withTcg(initial, { tcgCollections: [collection], tcgCollectionCards: [remoteCard], tcgActiveCollections: [collection], tcgLegacyOwnedCards: [], tcgOwnedCards: ['base1-001'], tcgCollectionModelVersion: 3 });
    const localMeta = advanceSyncMetadata(normalizeSyncMetadata(undefined, initial), initial, local, 'device-z');
    const remoteMeta = advanceSyncMetadata(normalizeSyncMetadata(undefined, initial), initial, remote, 'device-a');
    const merged = reconcileSyncState(local, remote, localMeta, remoteMeta, { deviceId: 'device-z' });
    expect(merged.state.tcgCollectionCards).toEqual([localCard]);
  });

  it('lets a newer removal beat an older quantity modification', () => {
    const initial = getInitialSyncState();
    const collection = encodeTCGCollectionKey('en', 'base1')!;
    const baseCard = encodeTCGCollectionCardKey(collection, 'base1-001', 'normal', 1)!;
    const modifiedCard = encodeTCGCollectionCardKey(collection, 'base1-001', 'normal', 4)!;
    const newerModifiedCard = encodeTCGCollectionCardKey(collection, 'base1-001', 'normal', 6)!;
    const base = withTcg(initial, { tcgCollections: [collection], tcgCollectionCards: [baseCard], tcgActiveCollections: [collection], tcgLegacyOwnedCards: [], tcgOwnedCards: ['base1-001'], tcgCollectionModelVersion: 3 });
    const removed = withTcg(base, { tcgCollectionCards: [], tcgOwnedCards: [] });
    const modified = withTcg(base, { tcgCollectionCards: [modifiedCard] });
    const baseMeta = normalizeSyncMetadata(undefined, base);
    const removedMeta = advanceSyncMetadata(baseMeta, base, removed, 'device-a');
    const modifiedMeta = advanceSyncMetadata(baseMeta, base, modified, 'device-b');
    const newerModified = advanceSyncMetadata(modifiedMeta, modified, withTcg(modified, { tcgCollectionCards: [newerModifiedCard] }), 'device-b');
    const merged = reconcileSyncState(removed, withTcg(modified, { tcgCollectionCards: [newerModifiedCard] }), removedMeta, newerModified, { deviceId: 'device-a' });
    expect(merged.state.tcgCollectionCards).toEqual([newerModifiedCard]);
  });

  it('preserves API-written quantities when a stale browser snapshot syncs', () => {
    const initial = getInitialSyncState();
    const collection = encodeTCGCollectionKey('en', 'base1')!;
    const beforeCard = encodeTCGCollectionCardKey(collection, 'base1-001', 'normal', 1)!;
    const apiCard = encodeTCGCollectionCardKey(collection, 'base1-001', 'normal', 3)!;
    const base = withTcg(initial, {
      tcgCollections: [collection], tcgCollectionCards: [beforeCard], tcgActiveCollections: [collection],
      tcgLegacyOwnedCards: [], tcgOwnedCards: ['base1-001'], tcgCollectionModelVersion: 3,
    });
    const baseMetadata = advanceSyncMetadata(normalizeSyncMetadata(undefined, initial), initial, base, 'device-base');
    const staleBrowser = withTcg(base, { favorites: [25] });
    const browserMetadata = advanceSyncMetadata(baseMetadata, base, staleBrowser, 'device-browser');
    const apiState = withTcg(base, { tcgCollectionCards: [apiCard] });
    const apiMetadata = advanceTcgApiSyncMetadata(baseMetadata, base, apiState, 'api:key-id');
    const apiSnapshot = attachTcgApiSyncMetadata(apiState as unknown as Record<string, unknown>, apiMetadata);

    const merged = reconcileSyncState(
      staleBrowser,
      apiSnapshot as Partial<PersistedState>,
      browserMetadata,
      extractSyncMetadata(apiSnapshot),
      { deviceId: 'device-browser' },
    );

    expect(merged.state.tcgCollectionCards).toEqual([apiCard]);
    expect(merged.state.favorites).toEqual([25]);
  });
});
