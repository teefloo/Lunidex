import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  confirmPendingSyncChanges,
  rejectPendingSyncChanges,
  rejectSupersededSyncChanges,
  waitForSyncChange,
} from './sync-confirmation';

describe('sync write confirmations', () => {
  afterEach(() => {
    rejectPendingSyncChanges('unavailable');
    vi.useRealTimers();
  });

  it('confirms only when the requested snapshot is accepted and still current', async () => {
    const expected = { cards: ['base1-1'] };
    const current = { ...expected };
    const result = waitForSyncChange(expected, () => current);
    confirmPendingSyncChanges({ cards: ['base1-1'] });
    await expect(result).resolves.toEqual({ ok: true });
  });

  it('rejects a request if the user has since made a different edit', async () => {
    const expected = { cards: ['base1-1'] };
    let current = expected;
    const result = waitForSyncChange(expected, () => current);
    current = { cards: ['base1-1', 'base1-2'] };
    rejectSupersededSyncChanges();
    await expect(result).resolves.toEqual({ ok: false, reason: 'conflict' });
  });

  it('rejects a request that is not present in the server-accepted snapshot', async () => {
    const expected = { cards: ['base1-1'] };
    const result = waitForSyncChange(expected, () => expected);
    confirmPendingSyncChanges({ cards: [] });
    rejectPendingSyncChanges('unavailable');
    await expect(result).resolves.toEqual({ ok: false, reason: 'unavailable' });
  });

  it('bounds an acknowledgement wait when no sync bridge responds', async () => {
    vi.useFakeTimers();
    const expected = { cards: ['base1-1'] };
    const result = waitForSyncChange(expected, () => expected, 100);
    const assertion = expect(result).resolves.toEqual({ ok: false, reason: 'unavailable' });
    await vi.advanceTimersByTimeAsync(100);
    await assertion;
  });
});
