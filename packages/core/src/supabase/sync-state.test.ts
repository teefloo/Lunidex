import { describe, expect, it } from 'vitest';
import {
  advanceSyncMetadata,
  buildSyncPayload,
  getInitialSyncState,
  normalizeSyncMetadata,
  reconcileSyncState,
  SYNC_METADATA_KEY,
} from './sync-state';

const A = 'device-a';
const B = 'device-b';
type Snapshot = ReturnType<typeof getInitialSyncState>;

function changed(before: Snapshot, after: Snapshot, device: string) {
  return advanceSyncMetadata(normalizeSyncMetadata(undefined, before), before, after, device);
}

describe('shared sync reconciliation', () => {
  it('keeps offline additions after reconnecting', () => {
    const initial = getInitialSyncState();
    const local = { ...initial, favorites: [25] };
    expect(reconcileSyncState(local, initial, changed(initial, local, A), undefined, { deviceId: A }).state.favorites).toEqual([25]);
  });

  it('keeps offline removals as tombstones', () => {
    const before = { ...getInitialSyncState(), favorites: [25] };
    const local = { ...before, favorites: [] };
    const result = reconcileSyncState(local, before, changed(before, local, A), undefined, { deviceId: A });
    expect(result.state.favorites).toEqual([]);
    expect(result.metadata.collections.favorites?.['25']?.present).toBe(false);
  });

  it('does not resurrect a removal made by another device', () => {
    const before = { ...getInitialSyncState(), favorites: [25] };
    const remote = { ...before, favorites: [] };
    expect(reconcileSyncState(before, remote, undefined, changed(before, remote, B), { deviceId: A }).state.favorites).toEqual([]);
  });

  it('merges concurrent changes deterministically', () => {
    const initial = getInitialSyncState();
    const local = { ...initial, favorites: [25] };
    const remote = { ...initial, favorites: [6] };
    expect(reconcileSyncState(local, remote, changed(initial, local, A), changed(initial, remote, B), { deviceId: A }).state.favorites).toEqual([25, 6]);
  });

  it('imports an anonymous collection, while account switching starts clean', () => {
    const initial = getInitialSyncState();
    const anonymous = { ...initial, favorites: [25] };
    const account = { ...initial, favorites: [6] };
    expect(reconcileSyncState(anonymous, account, undefined, undefined, { deviceId: A, preferLocalLegacyValues: true }).state.favorites).toEqual([25, 6]);
    expect(reconcileSyncState(initial, account, undefined, undefined, { deviceId: A }).state.favorites).toEqual([6]);
  });

  it('migrates missing or old metadata and keeps unknown legacy snapshot fields', () => {
    const initial = getInitialSyncState();
    const legacy = { ...initial, favorites: [25] };
    const migrated = reconcileSyncState(legacy, initial, { version: 0 }, undefined, { deviceId: A });
    const payload = buildSyncPayload({ tcgDecks: [{ id: 'deck' }] }, migrated.state) as { tcgDecks: { id: string }[]; [SYNC_METADATA_KEY]: { version: number } };
    expect(migrated.state.favorites).toEqual([25]);
    expect(payload.tcgDecks).toEqual([{ id: 'deck' }]);
    expect(payload[SYNC_METADATA_KEY].version).toBe(1);
  });
});
