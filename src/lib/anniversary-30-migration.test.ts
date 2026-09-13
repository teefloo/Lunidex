import { describe, expect, it } from 'vitest';

import {
  createAnniversary30MigrationState,
  getAnniversary30MigrationPlan,
  parseAnniversary30MigrationState,
  parseLegacyAnniversary30Progress,
} from '@/lib/anniversary-30-migration';

const mapping = new Map([
  ['pikachu-rare-01', '30th-023'],
  ['pikachu-rare-02', '30th-024'],
  ['pikachu-rare-30', '30th-052'],
]);

describe('30th Celebration tracker migration', () => {
  it('parses valid slots and preserves unknown source entries', () => {
    const parsed = parseLegacyAnniversary30Progress(JSON.stringify({
      version: 1,
      checkedSlotIds: ['pikachu-rare-01', 'pikachu-rare-01', 'pikachu-rare-99', 42],
    }));

    expect(parsed.checkedSlotIds).toEqual(['pikachu-rare-01']);
    expect(parsed.preservedSlotIds).toEqual(['pikachu-rare-99']);
  });

  it('maps only validated slots and remains idempotent', () => {
    const legacy = JSON.stringify({
      version: 1,
      checkedSlotIds: ['pikachu-rare-01', 'pikachu-rare-01', 'pikachu-rare-30'],
    });
    const first = getAnniversary30MigrationPlan({ legacyValue: legacy }, {
      collectionKey: 'tcg2:en:30th',
      cardIdBySlot: mapping,
      alreadyOwnedCardIds: ['30th-023'],
    });

    expect(first.status).toBe('ready');
    expect(first.cardIdsToAdd).toEqual(['30th-052']);
    expect(first.pendingSlotIds).toEqual([]);

    const second = getAnniversary30MigrationPlan({
      legacyValue: legacy,
      stateValue: first.serializedState,
    }, {
      collectionKey: 'tcg2:en:30th',
      cardIdBySlot: mapping,
      alreadyOwnedCardIds: ['30th-023', '30th-052'],
    });

    expect(second.cardIdsToAdd).toEqual([]);
    expect(parseAnniversary30MigrationState(second.serializedState)?.migratedCardIds)
      .toEqual(['30th-052']);
  });

  it('reports auth and identity prerequisites without losing source slots', () => {
    const legacyValue = JSON.stringify({
      version: 1,
      checkedSlotIds: ['pikachu-rare-01', 'pikachu-rare-30'],
    });

    const pendingAuth = getAnniversary30MigrationPlan({ legacyValue }, {
      cardIdBySlot: mapping,
      alreadyOwnedCardIds: [],
    });
    expect(pendingAuth.status).toBe('pending-auth');
    expect(pendingAuth.cardIdsToAdd).toEqual([]);
    expect(parseAnniversary30MigrationState(pendingAuth.serializedState)?.sourceSlotIds)
      .toEqual(['pikachu-rare-01', 'pikachu-rare-30']);

    const pendingIdentity = getAnniversary30MigrationPlan({ legacyValue }, {
      collectionKey: 'tcg2:en:30th',
      cardIdBySlot: new Map([['pikachu-rare-01', '30th-023']]),
      alreadyOwnedCardIds: [],
    });
    expect(pendingIdentity.status).toBe('pending-identity');
    expect(pendingIdentity.cardIdsToAdd).toEqual(['30th-023']);
    expect(pendingIdentity.pendingSlotIds).toEqual(['pikachu-rare-30']);
  });

  it('degrades malformed state to an empty migration marker', () => {
    expect(parseLegacyAnniversary30Progress('{bad json}')).toEqual({
      checkedSlotIds: [],
      preservedSlotIds: [],
    });
    expect(parseAnniversary30MigrationState('[]')).toBeNull();
    expect(createAnniversary30MigrationState({
      sourceSlotIds: ['pikachu-rare-01'],
      migratedCardIds: ['30th-023'],
      pendingSlotIds: [],
      preservedSlotIds: [],
    })).toMatchObject({ version: 2, sourceVersion: 1 });
  });
});
