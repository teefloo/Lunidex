import { describe, expect, it } from 'vitest';
import { validateImportPayload } from './user-backup';
import { SYNCED_KEYS, usePrimeDexStore } from '@/store/primedex';
import {
  advanceSyncMetadata,
  applySyncState,
  mergeAndNormalizeSyncState,
  normalizeSyncMetadata,
  pickSyncState,
  reconcileSyncState,
} from './supabase/sync-state';
import { confirmPendingSyncChanges, waitForSyncChange } from './tcg-investment-save';

describe('user backup validation', () => {
  it.each([{ team: null }, { team: [null] }, { team: [25.5] }, { selectedTypes: null }, { selectedTypes: [42] }, { heightRange: [25, 0] }, { compareList: [1, 2, 3, 4] }, { tcgCompareList: ['a', 'b', 'c', 'd', 'e'] }])('rejects malformed persisted fields: %j', (data) => {
    expect(validateImportPayload({ version: '3.0', data }).valid).toBe(false);
  });
  it.each([
    { nuzlockeRuns: [null] }, { nuzlockeRuns: [{ id: 'a', name: 'a', game: 'a', createdAt: '2026-10-03', encounters: [null] }] },
    { tcgDecks: [null] }, { tcgDecks: [{ id: 'a', name: 'a', createdAt: '2026-10-03', cards: [null] }] },
    { tcgCardNotes: [null] }, { tcgSavedSearches: [null] }, { quizHistory: [null] }, { recentActions: [null] },
    { history: [null] }, { quizHighScores: [] }, { viewCount: { 25: 'many' } }, { lastVisitDate: false },
  ])('rejects malformed nested records before they reach consumers: %j', (data) => {
    expect(validateImportPayload({ version: '3.0', data }).valid).toBe(false);
  });
  it('accepts the complete default export and valid Nuzlocke/deck records', () => {
    const defaults = usePrimeDexStore.getInitialState();
    const data = Object.fromEntries(SYNCED_KEYS.map((key) => [key, defaults[key]]));
    data.nuzlockeRuns = [{ id: 'run', name: 'Audit', game: 'Red', createdAt: '2026-10-03', encounters: [{ id: 'encounter', routeName: 'Route 1', pokemonId: 25, pokemonName: 'pikachu', nickname: null, status: 'alive', caughtAt: '2026-10-03' }] }];
    data.tcgDecks = [{ id: 'deck', name: 'Audit', createdAt: '2026-10-03', cards: [{ cardId: 'sv03.5-199', quantity: 1 }] }];
    expect(validateImportPayload({ version: '3.0', data })).toMatchObject({ valid: true });
  });
  it('accepts a compact partial backup without injecting unrelated defaults', () => {
    const result = validateImportPayload({ version: '3.0', data: { team: [25, 6], favorites: [133], soundEnabled: false } });
    expect(result).toMatchObject({ valid: true, data: { team: [25, 6], favorites: [133], soundEnabled: false } });
    if (result.valid) expect(result.data).not.toHaveProperty('caughtPokemon');
  });

  it('preserves omitted custom binder fields in an older partial TCG backup', () => {
    const result = validateImportPayload({ version: '3.0', data: { tcgOwnedCards: ['base1-001'] } });
    expect(result.valid).toBe(true);
    if (!result.valid) return;
    expect(result.data).not.toHaveProperty('tcgCustomCollections');
    expect(result.data).not.toHaveProperty('tcgCustomCollectionCards');
    expect(result.data).not.toHaveProperty('tcgCustomCollectionLayouts');
    expect(result.data.tcgOwnedCards).toEqual(['base1-001']);
  });

  it('round-trips custom binders and rejects orphaned memberships in backups', () => {
    const collectionId = '126e8648-39da-4fc9-88b2-fd194d28cc5a';
    const createdAt = '2026-10-19T10:00:00.000Z';
    const collection = { id: collectionId, name: 'Artwork', description: 'Favorites', createdAt, updatedAt: createdAt };
    const card = { collectionId, cardId: 'sv03.5-199', language: 'fr', cardName: 'Dracaufeu', addedAt: createdAt };
    const layout = { collectionId, gridPreset: '4x3', cardOrder: [{ cardId: card.cardId, language: card.language, copyIndex: 0 }] };
    const result = validateImportPayload({ version: '3.0', data: {
      tcgCustomCollections: [collection],
      tcgCustomCollectionCards: [card],
      tcgCustomCollectionLayouts: [layout],
    } });
    expect(result).toMatchObject({ valid: true, data: {
      tcgCustomCollections: [collection],
      tcgCustomCollectionCards: [card],
      tcgCustomCollectionLayouts: [layout],
    } });
    expect(validateImportPayload({ version: '3.0', data: { tcgCustomCollections: [collection], tcgCustomCollectionCards: [{ ...card, collectionId: '36e431a6-c3c1-46d4-804d-f5fa08f1af9d' }] } }).valid).toBe(false);
  });

  it('clears stale layouts when a legacy backup replaces binder state, then reconciles the deletion', async () => {
    const original = pickSyncState();
    const timestamp = '2026-10-19T10:00:00.000Z';
    const binderA = { id: '126e8648-39da-4fc9-88b2-fd194d28cc5a', name: 'Old A', createdAt: timestamp, updatedAt: timestamp };
    const binderB = { id: '36e431a6-c3c1-46d4-804d-f5fa08f1af9d', name: 'Keep B', createdAt: '2026-10-20T10:00:00.000Z', updatedAt: '2026-10-20T10:00:00.000Z' };
    const cardA = { collectionId: binderA.id, cardId: 'base1-001', language: 'en' as const, cardName: 'Alakazam', addedAt: timestamp };
    const cardB = { collectionId: binderB.id, cardId: 'base1-002', language: 'fr' as const, cardName: 'Dracaufeu', addedAt: binderB.createdAt };
    const layoutA = { collectionId: binderA.id, gridPreset: '2x2' as const, cardOrder: [{ cardId: cardA.cardId, language: cardA.language, copyIndex: 0 }] };
    const layoutB = { collectionId: binderB.id, gridPreset: '4x4' as const, cardOrder: [{ cardId: cardB.cardId, language: cardB.language, copyIndex: 0 }] };

    try {
      applySyncState({
        tcgCustomCollections: [binderA, binderB],
        tcgCustomCollectionCards: [cardA, cardB],
        tcgCustomCollectionLayouts: [layoutA, layoutB],
      });
      const previous = pickSyncState();
      const previousMetadata = normalizeSyncMetadata(undefined, previous);
      const imported = validateImportPayload({ version: '3.0', data: {
        tcgCustomCollections: [binderB],
        tcgCustomCollectionCards: [cardB],
      } });
      expect(imported.valid).toBe(true);
      if (!imported.valid) return;
      expect(imported.data.tcgCustomCollectionLayouts).toEqual([]);

      applySyncState(imported.data);
      const expected = pickSyncState();
      expect(expected.tcgCustomCollections).toEqual([binderB]);
      expect(expected.tcgCustomCollectionCards).toEqual([{ ...cardB, quantity: 1 }]);
      expect(expected.tcgCustomCollectionLayouts).toEqual([]);
      const localMetadata = advanceSyncMetadata(previousMetadata, previous, expected, 'backup-import');
      const reconciled = reconcileSyncState(expected, previous, localMetadata, previousMetadata, { deviceId: 'backup-import' }).state;
      const confirmation = waitForSyncChange(expected, pickSyncState, 1_000);
      confirmPendingSyncChanges(reconciled);

      await expect(confirmation).resolves.toEqual({ ok: true });
      expect(reconciled.tcgCustomCollectionLayouts).toEqual([]);
    } finally {
      applySyncState(original);
    }
  });

  it('preserves binders and layouts through a TCG-currency-only partial import and reconciliation', () => {
    const original = pickSyncState();
    const timestamp = '2026-10-19T10:00:00.000Z';
    const binder = { id: '126e8648-39da-4fc9-88b2-fd194d28cc5a', name: 'Favorites', createdAt: timestamp, updatedAt: timestamp };
    const card = { collectionId: binder.id, cardId: 'base1-001', language: 'en' as const, cardName: 'Alakazam', addedAt: timestamp };
    const layout = { collectionId: binder.id, gridPreset: '4x3' as const, cardOrder: [{ cardId: card.cardId, language: card.language, copyIndex: 0 }] };

    try {
      applySyncState({ tcgCustomCollections: [binder], tcgCustomCollectionCards: [card], tcgCustomCollectionLayouts: [layout] });
      const previous = pickSyncState();
      const previousMetadata = normalizeSyncMetadata(undefined, previous);
      const imported = validateImportPayload({ version: '3.0', data: { tcgDisplayCurrency: 'EUR' } });
      expect(imported.valid).toBe(true);
      if (!imported.valid) return;
      expect(imported.data).not.toHaveProperty('tcgCustomCollections');
      expect(imported.data).not.toHaveProperty('tcgCustomCollectionCards');
      expect(imported.data).not.toHaveProperty('tcgCustomCollectionLayouts');

      applySyncState(imported.data);
      const expected = pickSyncState();
      expect(expected.tcgCustomCollections).toEqual([binder]);
      expect(expected.tcgCustomCollectionCards).toEqual([card]);
      expect(expected.tcgCustomCollectionLayouts).toEqual([layout]);
      const localMetadata = advanceSyncMetadata(previousMetadata, previous, expected, 'currency-import');
      const reconciled = reconcileSyncState(expected, previous, localMetadata, previousMetadata, { deviceId: 'currency-import' }).state;

      expect(reconciled.tcgDisplayCurrency).toBe('EUR');
      expect(reconciled.tcgCustomCollections).toEqual([binder]);
      expect(reconciled.tcgCustomCollectionCards).toEqual([{ ...card, quantity: 1 }]);
      expect(reconciled.tcgCustomCollectionLayouts).toEqual([layout]);
    } finally {
      applySyncState(original);
    }
  });

  it.each([
    { label: 'binder-only', data: { tcgCustomCollections: [] } },
    { label: 'membership-only', data: { tcgCustomCollectionCards: [] } },
  ])('canonicalizes a $label partial import before sync confirmation', async ({ label, data }) => {
    const original = pickSyncState();
    const timestamp = '2026-10-19T10:00:00.000Z';
    const binder = { id: '126e8648-39da-4fc9-88b2-fd194d28cc5a', name: 'Favorites', createdAt: timestamp, updatedAt: timestamp };
    const card = { collectionId: binder.id, cardId: 'base1-001', language: 'en' as const, cardName: 'Alakazam', addedAt: timestamp };
    const layout = { collectionId: binder.id, gridPreset: '4x3' as const, cardOrder: [{ cardId: card.cardId, language: card.language, copyIndex: 0 }] };

    try {
      applySyncState({ tcgCustomCollections: [binder], tcgCustomCollectionCards: [card], tcgCustomCollectionLayouts: [layout] });
      const previous = pickSyncState();
      const previousMetadata = normalizeSyncMetadata(undefined, previous);
      const imported = validateImportPayload({ version: '3.0', data });
      expect(imported.valid).toBe(true);
      if (!imported.valid) return;

      const mergedImport = mergeAndNormalizeSyncState(previous, imported.data);
      applySyncState(mergedImport);
      const expected = pickSyncState();
      const localMetadata = advanceSyncMetadata(previousMetadata, previous, expected, 'partial-backup');
      const reconciled = reconcileSyncState(expected, previous, localMetadata, previousMetadata, { deviceId: 'partial-backup' }).state;
      const confirmation = waitForSyncChange(expected, pickSyncState, 200);
      confirmPendingSyncChanges(reconciled);

      await expect(confirmation).resolves.toEqual({ ok: true });
      expect(JSON.stringify(expected)).toBe(JSON.stringify(reconciled));
      if (label === 'binder-only') {
        expect(expected.tcgCustomCollections).toEqual([]);
        expect(expected.tcgCustomCollectionCards).toEqual([]);
        expect(expected.tcgCustomCollectionLayouts).toEqual([]);
      } else {
        expect(expected.tcgCustomCollections).toEqual([binder]);
        expect(expected.tcgCustomCollectionCards).toEqual([]);
        expect(expected.tcgCustomCollectionLayouts).toEqual([{ ...layout, cardOrder: [] }]);
      }
    } finally {
      applySyncState(original);
    }
  });

  it('keeps layouts for unrelated partial imports and confirms a two-binder round-trip in canonical order', async () => {
    const original = pickSyncState();
    const timestamp = '2026-10-19T10:00:00.000Z';
    const binderA = { id: '126e8648-39da-4fc9-88b2-fd194d28cc5a', name: 'A', createdAt: timestamp, updatedAt: timestamp };
    const binderB = { id: '36e431a6-c3c1-46d4-804d-f5fa08f1af9d', name: 'B', createdAt: '2026-10-20T10:00:00.000Z', updatedAt: '2026-10-20T10:00:00.000Z' };
    const cardA = { collectionId: binderA.id, cardId: 'base1-001', language: 'en' as const, cardName: 'Alakazam', addedAt: timestamp };
    const cardB = { collectionId: binderB.id, cardId: 'base1-002', language: 'fr' as const, cardName: 'Dracaufeu', addedAt: binderB.createdAt };
    const layoutA = { collectionId: binderA.id, gridPreset: '2x2' as const, cardOrder: [{ cardId: cardA.cardId, language: cardA.language, copyIndex: 0 }] };
    const layoutB = { collectionId: binderB.id, gridPreset: '4x4' as const, cardOrder: [{ cardId: cardB.cardId, language: cardB.language, copyIndex: 0 }] };

    try {
      applySyncState({
        tcgCustomCollections: [binderA, binderB],
        tcgCustomCollectionCards: [cardA, cardB],
        tcgCustomCollectionLayouts: [layoutB, layoutA],
      });
      const partial = validateImportPayload({ version: '3.0', data: { favorites: [25] } });
      expect(partial.valid).toBe(true);
      if (!partial.valid) return;
      applySyncState(partial.data);
      expect(pickSyncState().tcgCustomCollectionLayouts).toEqual([layoutB, layoutA]);

      const exported = pickSyncState();
      const imported = validateImportPayload(JSON.parse(JSON.stringify({ version: '3.0', data: exported })) as unknown);
      expect(imported.valid).toBe(true);
      if (!imported.valid) return;
      applySyncState(imported.data);
      const expected = pickSyncState();
      expect(expected.tcgCustomCollectionLayouts.map((layout) => layout.collectionId)).toEqual([binderA.id, binderB.id]);
      const reconciled = reconcileSyncState(expected, expected, undefined, undefined, { deviceId: 'backup-round-trip' }).state;
      const confirmation = waitForSyncChange(expected, pickSyncState, 1_000);
      confirmPendingSyncChanges(reconciled);

      await expect(confirmation).resolves.toEqual({ ok: true });
      expect(JSON.stringify(reconciled)).toBe(JSON.stringify(expected));
    } finally {
      applySyncState(original);
    }
  });
});
