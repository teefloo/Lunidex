import { afterEach, describe, expect, it, vi } from 'vitest';
import { usePrimeDexStore } from './primedex';
import { onSyncAccessRequired, onSyncAccessRetry, onSyncAccessStatusChange, retrySyncAccess, setSyncAccessStatus } from './sync-access';

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

  it('applies language changes locally without requiring sync access', () => {
    const onRequired = vi.fn();
    const unsubscribe = onSyncAccessRequired(onRequired);

    setSyncAccessStatus('unauthenticated');
    usePrimeDexStore.getState().setLanguage('fr');

    expect(usePrimeDexStore.getState().language).toBe('fr');
    expect(onRequired).not.toHaveBeenCalled();
    unsubscribe();
  });

  it('can retry a temporarily unavailable remote session', () => {
    const onRetry = vi.fn();
    const unsubscribe = onSyncAccessRetry(onRetry);

    retrySyncAccess();

    expect(onRetry).toHaveBeenCalledOnce();
    unsubscribe();
  });

  it('notifies subscribers when sync access changes', () => {
    const onStatusChange = vi.fn();
    const unsubscribe = onSyncAccessStatusChange(onStatusChange);

    setSyncAccessStatus('unavailable');
    setSyncAccessStatus('unavailable');

    expect(onStatusChange).toHaveBeenCalledOnce();
    expect(onStatusChange).toHaveBeenCalledWith('unavailable');
    unsubscribe();
  });

  it('persists only the local language preference in the persistence snapshot', () => {
    // `language` is a local device preference (the effective UI language comes
    // from the URL), so it is the only field allowed into local persistence.
    expect(usePrimeDexStore.persist.getOptions().partialize?.(usePrimeDexStore.getState())).toEqual({
      language: initialState.language,
    });
  });

  it('no longer treats language as a remotely synced key', () => {
    expect(usePrimeDexStore.persist.getOptions().partialize?.({ ...initialState, language: 'fr' })).toEqual({
      language: 'fr',
    });
  });

  it('restores the persisted language preference on rehydration and drops legacy fields', () => {
    const currentState = usePrimeDexStore.getInitialState();
    const merge = usePrimeDexStore.persist.getOptions().merge!;

    expect(merge({ language: 'fr', favorites: [25] }, currentState)).toEqual({
      ...currentState,
      language: 'fr',
    });
    expect(merge({ language: 'auto', favorites: [25] }, currentState)).toEqual(currentState);
    expect(merge(null, currentState)).toEqual(currentState);
    expect(merge(undefined, currentState)).toEqual(currentState);
  });
});
