import { describe, expect, it } from 'vitest';
import { buildSyncPayload, getInitialSyncState, pickSyncState } from './sync-state';

describe('buildSyncPayload', () => {
  it('preserves remote fields that this client does not know while replacing its own synced fields', () => {
    const snapshot = pickSyncState();
    const payload = buildSyncPayload(
      {
        favorites: [999],
        tcgDecks: [{ id: 'web-only-deck' }],
        nuzlockeRuns: [{ id: 'web-only-run' }],
      },
      snapshot,
    ) as { favorites: number[]; tcgDecks: { id: string }[]; nuzlockeRuns: { id: string }[] };

    expect(payload.favorites).toEqual(snapshot.favorites);
    expect(payload.tcgDecks).toEqual([{ id: 'web-only-deck' }]);
    expect(payload.nuzlockeRuns).toEqual([{ id: 'web-only-run' }]);
  });

  it('does not retain malformed remote snapshots', () => {
    const snapshot = pickSyncState();

    expect(buildSyncPayload(['not-an-object'], snapshot)).toEqual(snapshot);
    expect(buildSyncPayload(null, snapshot)).toEqual(snapshot);
  });

  it('provides a clean persisted baseline for a different account', () => {
    const initial = getInitialSyncState();

    expect(initial.favorites).toEqual([]);
    expect(initial.team).toEqual([]);
    expect(initial.compareList).toEqual([]);
  });
});
