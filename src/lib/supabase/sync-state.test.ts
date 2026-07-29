import { describe, expect, it } from 'vitest';
import {
  advanceSyncMetadata,
  buildSyncPayload,
  getInitialSyncState,
  normalizeSyncMetadata,
  reconcileSyncState,
  SYNC_METADATA_KEY,
} from './sync-state';

const DEVICE_A = 'device-a';
const DEVICE_B = 'device-b';

function changed(before: ReturnType<typeof getInitialSyncState>, after: ReturnType<typeof getInitialSyncState>, deviceId: string) {
  return advanceSyncMetadata(normalizeSyncMetadata(undefined, before), before, after, deviceId);
}

describe('synchronisation locale déterministe', () => {
  it('conserve un ajout effectué hors ligne lors de la reconnexion', () => {
    const initial = getInitialSyncState();
    const local = { ...initial, favorites: [25] };
    const result = reconcileSyncState(local, initial, changed(initial, local, DEVICE_A), undefined, { deviceId: DEVICE_A });

    expect(result.state.favorites).toEqual([25]);
  });

  it('conserve une suppression hors ligne grâce à un tombstone', () => {
    const before = { ...getInitialSyncState(), favorites: [25] };
    const local = { ...before, favorites: [] };
    const result = reconcileSyncState(local, before, changed(before, local, DEVICE_A), undefined, { deviceId: DEVICE_A });

    expect(result.state.favorites).toEqual([]);
    expect(result.metadata.collections.favorites?.['25']).toMatchObject({ present: false, deviceId: DEVICE_A });
  });

  it('applique une suppression venant d’un autre appareil sans résurrection', () => {
    const before = { ...getInitialSyncState(), favorites: [25] };
    const deletedRemotely = { ...before, favorites: [] };
    const result = reconcileSyncState(before, deletedRemotely, undefined, changed(before, deletedRemotely, DEVICE_B), { deviceId: DEVICE_A });

    expect(result.state.favorites).toEqual([]);
  });

  it('fusionne les ajouts concurrents de deux appareils de façon déterministe', () => {
    const initial = getInitialSyncState();
    const local = { ...initial, favorites: [25] };
    const remote = { ...initial, favorites: [6] };
    const result = reconcileSyncState(local, remote, changed(initial, local, DEVICE_A), changed(initial, remote, DEVICE_B), { deviceId: DEVICE_A });

    expect(result.state.favorites).toEqual([25, 6]);
  });

  it('importe sans perte la première collection anonyme dans un compte existant', () => {
    const initial = getInitialSyncState();
    const anonymous = { ...initial, favorites: [25], tcgOwnedCards: ['sv01-1'] };
    const account = { ...initial, favorites: [6], tcgOwnedCards: ['sv01-4'] };
    const result = reconcileSyncState(anonymous, account, undefined, undefined, { deviceId: DEVICE_A, preferLocalLegacyValues: true });

    expect(result.state.favorites).toEqual([25, 6]);
    expect(result.state.tcgOwnedCards).toEqual(['sv01-1', 'sv01-4']);
  });

  it('isole les comptes : une nouvelle session commence avec un état propre', () => {
    const oldAccount = { ...getInitialSyncState(), favorites: [25] };
    const otherAccount = { ...getInitialSyncState(), favorites: [6] };
    const result = reconcileSyncState(getInitialSyncState(), otherAccount, undefined, undefined, { deviceId: DEVICE_A });

    expect(oldAccount.favorites).toEqual([25]);
    expect(result.state.favorites).toEqual([6]);
  });

  it('migre les métadonnées absentes ou anciennes sans perdre les snapshots existants', () => {
    const initial = getInitialSyncState();
    const legacy = { ...initial, favorites: [25] };
    const metadata = normalizeSyncMetadata({ version: 0 }, legacy);
    const result = reconcileSyncState(legacy, initial, metadata, { invalid: true }, { deviceId: DEVICE_A });

    expect(result.state.favorites).toEqual([25]);
    expect(result.metadata.version).toBe(1);
  });

  it('préserve les champs inconnus des snapshots existants tout en ajoutant les métadonnées', () => {
    const snapshot = pickInitial();
    const payload = buildSyncPayload({ tcgDecks: [{ id: 'deck' }], favorites: [999] }, snapshot) as {
      tcgDecks: { id: string }[]; [SYNC_METADATA_KEY]: { version: number };
    };

    expect(payload.tcgDecks).toEqual([{ id: 'deck' }]);
    expect(payload[SYNC_METADATA_KEY].version).toBe(1);
    expect(buildSyncPayload(null, snapshot)).toMatchObject(snapshot);
  });
});

function pickInitial(): ReturnType<typeof getInitialSyncState> {
  return getInitialSyncState();
}
