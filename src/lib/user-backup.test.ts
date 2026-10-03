import { describe, expect, it } from 'vitest';
import { validateImportPayload } from './user-backup';
import { SYNCED_KEYS, usePrimeDexStore } from '@/store/primedex';

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
});
