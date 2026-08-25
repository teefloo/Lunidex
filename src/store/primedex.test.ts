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

  it('applies pokedex view filters locally for signed-out visitors', () => {
    const onRequired = vi.fn();
    const unsubscribe = onSyncAccessRequired(onRequired);

    setSyncAccessStatus('unauthenticated');
    usePrimeDexStore.getState().toggleType('fire');
    usePrimeDexStore.getState().setSortBy('name-asc');
    usePrimeDexStore.getState().setSelectedGeneration(1);

    expect(usePrimeDexStore.getState().selectedTypes).toEqual(['fire']);
    expect(usePrimeDexStore.getState().sortBy).toBe('name-asc');
    expect(usePrimeDexStore.getState().selectedGeneration).toBe(1);
    expect(onRequired).not.toHaveBeenCalled();
    unsubscribe();
  });

  it('applies sound and sprite display preferences locally', () => {
    const onRequired = vi.fn();
    const unsubscribe = onSyncAccessRequired(onRequired);

    setSyncAccessStatus('unauthenticated');
    usePrimeDexStore.getState().toggleSound();
    usePrimeDexStore.getState().toggleAnimatedSprites();

    expect(usePrimeDexStore.getState().soundEnabled).toBe(false);
    expect(usePrimeDexStore.getState().animatedSprites).toBe(true);
    expect(onRequired).not.toHaveBeenCalled();
    unsubscribe();
  });

  it('keeps gating collection data such as the team while signed out', () => {
    const onRequired = vi.fn();
    const unsubscribe = onSyncAccessRequired(onRequired);

    setSyncAccessStatus('unauthenticated');
    usePrimeDexStore.getState().addToTeam(25);

    expect(usePrimeDexStore.getState().team).toEqual([]);
    expect(onRequired).toHaveBeenCalledOnce();
    unsubscribe();
  });

  it('applies theme changes locally without requiring sync access', () => {
    const onRequired = vi.fn();
    const unsubscribe = onSyncAccessRequired(onRequired);

    setSyncAccessStatus('unauthenticated');
    usePrimeDexStore.getState().setTheme('dark');

    expect(usePrimeDexStore.getState().theme).toBe('dark');
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

  it('persists local display preferences in the persistence snapshot', () => {
    expect(usePrimeDexStore.persist.getOptions().partialize?.(usePrimeDexStore.getState())).toEqual({
      language: initialState.language,
      theme: initialState.theme,
    });
  });

  it('keeps the local theme while preserving the URL-owned language preference', () => {
    expect(usePrimeDexStore.persist.getOptions().partialize?.({ ...initialState, language: 'fr' })).toEqual({
      language: 'fr',
      theme: initialState.theme,
    });
  });

  it('restores valid local preferences on rehydration and drops legacy fields', () => {
    const currentState = usePrimeDexStore.getInitialState();
    const merge = usePrimeDexStore.persist.getOptions().merge!;
    const migrate = usePrimeDexStore.persist.getOptions().migrate!;

    expect(merge({ language: 'fr', theme: 'dark', favorites: [25], genTheme: 'gen1' }, currentState)).toEqual({
      ...currentState,
      language: 'fr',
      theme: 'dark',
    });
    expect(merge({ language: 'auto', theme: 'invalid', favorites: [25] }, currentState)).toEqual(currentState);
    expect(merge(null, currentState)).toEqual(currentState);
    expect(merge(undefined, currentState)).toEqual(currentState);
    expect(migrate({ language: 'fr', theme: 'dark', genTheme: 'gen1', autoGenTheme: true }, 0)).toEqual({
      language: 'fr',
      theme: 'dark',
    });
  });
});
