import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { usePrimeDexStore } from './primedex';
import { setSyncAccessStatus } from './sync-access';
import { normalizeTCGInvestment } from '@primedex/core/lib/tcg-investments';
import { normalizeUserStateData } from '@/lib/tcg-owned-cards';
import { validateImportPayload } from '@/lib/user-backup';
import { advanceSyncMetadata, getInitialSyncState, normalizeSyncMetadata, reconcileSyncState } from '@/lib/supabase/sync-state';

const lot = normalizeTCGInvestment({
  id: '126e8648-39da-4fc9-88b2-fd194d28cc5a', cardId: 'base1-1', cardName: 'Alakazam', setId: 'base1',
  language: 'fr', variant: 'holo', printing: '', condition: 'nm', quantity: 2, unitCostCents: 2000, feesCents: 500,
  acquiredOn: null, valuation: { unitPriceCents: 3500, valuedOn: '2026-10-19' },
  createdAt: '2026-10-19T10:00:00.000Z', updatedAt: '2026-10-19T10:00:00.000Z',
})!;
const input = {
  cardId: lot.cardId, cardName: lot.cardName, setId: lot.setId, language: lot.language,
  variant: lot.variant, printing: lot.printing, condition: lot.condition, quantity: lot.quantity,
  unitCostCents: lot.unitCostCents, feesCents: lot.feesCents, acquiredOn: lot.acquiredOn, valuation: lot.valuation,
};

beforeEach(() => { usePrimeDexStore.setState({ tcgInvestments: [] }); setSyncAccessStatus('ready'); });
afterEach(() => { usePrimeDexStore.setState({ tcgInvestments: [] }); setSyncAccessStatus('checking'); });

describe('private card investments', () => {
  it('creates independent purchases, edits one, and leaves inventory unchanged', () => {
    const owned = usePrimeDexStore.getState().tcgOwnedCards;
    const id = usePrimeDexStore.getState().saveTCGInvestment(input);
    const secondId = usePrimeDexStore.getState().saveTCGInvestment({ ...input, unitCostCents: 4000 });
    expect(id).toBeTruthy(); expect(secondId).not.toBe(id);
    expect(usePrimeDexStore.getState().saveTCGInvestment({ ...input, quantity: 3 }, id!)).toBe(id);
    expect(usePrimeDexStore.getState().tcgInvestments.map((entry) => entry.quantity)).toEqual([3, 2]);
    expect(usePrimeDexStore.getState().tcgOwnedCards).toEqual(owned);
    expect(usePrimeDexStore.getState().deleteTCGInvestment(id!)).toBe(true);
    expect(usePrimeDexStore.getState().tcgInvestments.map((entry) => entry.id)).toEqual([secondId]);
  });
  it('gates writes until the account is loaded and rejects stale ids', () => {
    expect(usePrimeDexStore.getState().saveTCGInvestment(input, lot.id)).toBeNull();
    setSyncAccessStatus('unauthenticated');
    expect(usePrimeDexStore.getState().saveTCGInvestment(input)).toBeNull();
    expect(usePrimeDexStore.getState().deleteTCGInvestment(lot.id)).toBe(false);
    expect(usePrimeDexStore.getState().tcgInvestments).toEqual([]);
  });
  it('validates remote and backup data and reads older snapshots as an empty portfolio', () => {
    expect(normalizeUserStateData({ tcgInvestments: [lot] })?.tcgInvestments).toEqual([lot]);
    expect(normalizeUserStateData({ tcgInvestments: [{ ...lot, feesCents: -1 }] })).toBeNull();
    expect(normalizeUserStateData({ tcgInvestments: null })).toBeNull();
    expect(normalizeUserStateData({ tcgOwnedCards: [] })?.tcgInvestments).toEqual([]);
    expect(validateImportPayload({ version: '3.0', data: { tcgInvestments: [lot] } })).toMatchObject({ valid: true, data: { tcgInvestments: [lot] } });
    expect(getInitialSyncState().tcgInvestments).toEqual([]);
  });
  it('merges concurrent acquisitions and preserves a later edit and deletion', () => {
    const initial = getInitialSyncState();
    const local = { ...initial, tcgInvestments: [lot] };
    const remote = { ...initial, tcgInvestments: [{ ...lot, id: '226e8648-39da-4fc9-88b2-fd194d28cc5a' }] };
    const base = normalizeSyncMetadata(undefined, initial);
    const lm = advanceSyncMetadata(base, initial, local, 'a');
    const rm = advanceSyncMetadata(base, initial, remote, 'b');
    const merged = reconcileSyncState(local, remote, lm, rm, { deviceId: 'a' });
    expect(merged.state.tcgInvestments).toHaveLength(2);
    const edited = { ...merged.state, tcgInvestments: merged.state.tcgInvestments.map((entry) => entry.id === lot.id ? { ...entry, unitCostCents: 999 } : entry) };
    const em = advanceSyncMetadata(merged.metadata, merged.state, edited, 'a');
    const updated = reconcileSyncState(edited, merged.state, em, merged.metadata, { deviceId: 'a' });
    expect(updated.state.tcgInvestments.find((entry) => entry.id === lot.id)?.unitCostCents).toBe(999);
    const deleted = { ...edited, tcgInvestments: [] };
    const dm = advanceSyncMetadata(em, edited, deleted, 'a');
    expect(reconcileSyncState(deleted, edited, dm, em, { deviceId: 'a' }).state.tcgInvestments).toEqual([]);
  });
});
