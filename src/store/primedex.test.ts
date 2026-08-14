import { afterEach, describe, expect, it, vi } from 'vitest';
import { usePrimeDexStore } from './primedex';
import { onSyncAccessRequired, setSyncAccessStatus } from './sync-access';

const initialState = usePrimeDexStore.getInitialState();

afterEach(() => {
  usePrimeDexStore.setState(initialState, true);
  setSyncAccessStatus('checking');
});

describe('web online-only user state', () => {
  it('blocks syncable mutations until the remote session is ready', () => {
    const onRequired = vi.fn();
    const unsubscribe = onSyncAccessRequired(onRequired);

    setSyncAccessStatus('unauthenticated');
    usePrimeDexStore.getState().addFavorite(25);

    expect(usePrimeDexStore.getState().favorites).toEqual([]);
    expect(onRequired).toHaveBeenCalledOnce();
    unsubscribe();
  });

  it('also blocks passive syncable activity before remote access is ready', () => {
    const onRequired = vi.fn();
    const unsubscribe = onSyncAccessRequired(onRequired);

    setSyncAccessStatus('unauthenticated');
    usePrimeDexStore.getState().incrementVisit();

    expect(usePrimeDexStore.getState().visitCount).toBe(0);
    expect(onRequired).toHaveBeenCalledOnce();
    unsubscribe();
  });

  it('writes syncable state only after remote access is ready', () => {
    setSyncAccessStatus('ready');
    usePrimeDexStore.getState().addFavorite(25);

    expect(usePrimeDexStore.getState().favorites).toEqual([25]);
  });

  it('does not expose syncable state through the local persistence snapshot', () => {
    expect(usePrimeDexStore.persist.getOptions().partialize?.(usePrimeDexStore.getState())).toEqual({});
  });
});
