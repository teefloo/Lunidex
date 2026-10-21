import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  getSyncWriteStatus,
  queueSyncWrite,
  reportSyncWriteError,
  reportSyncWriteSaved,
  reportSyncWriteSaving,
  resetSyncWriteStatus,
} from './sync-write-status';

describe('sync write status', () => {
  afterEach(() => {
    resetSyncWriteStatus();
    vi.useRealTimers();
  });

  it('shows a confirmed save briefly and then returns to idle', () => {
    vi.useFakeTimers();
    const version = queueSyncWrite();
    reportSyncWriteSaving(version);
    reportSyncWriteSaved(version);

    expect(getSyncWriteStatus()).toEqual({ state: 'saved' });
    vi.advanceTimersByTime(3_000);
    expect(getSyncWriteStatus()).toEqual({ state: 'idle' });
  });

  it('does not let an older response replace a newer queued write', () => {
    const olderVersion = queueSyncWrite();
    reportSyncWriteSaving(olderVersion);
    queueSyncWrite();
    reportSyncWriteSaved(olderVersion);

    expect(getSyncWriteStatus()).toEqual({ state: 'queued' });
  });

  it('keeps a failed write visible until another write or session reset', () => {
    const version = queueSyncWrite();
    reportSyncWriteSaving(version);
    reportSyncWriteError('unavailable');

    expect(getSyncWriteStatus()).toEqual({ state: 'error', reason: 'unavailable' });
    queueSyncWrite();
    expect(getSyncWriteStatus()).toEqual({ state: 'queued' });
    resetSyncWriteStatus();
    expect(getSyncWriteStatus()).toEqual({ state: 'idle' });
  });
});
