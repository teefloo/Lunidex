'use client';

import { useCallback, useSyncExternalStore } from 'react';

const FILTER_EVENT = 'lunidex-catalog-filter';

function subscribe(listener: () => void) {
  window.addEventListener('popstate', listener);
  window.addEventListener(FILTER_EVENT, listener);
  return () => {
    window.removeEventListener('popstate', listener);
    window.removeEventListener(FILTER_EVENT, listener);
  };
}

const getSnapshot = () => window.location.search;
const getServerSnapshot = () => '';

/** Keep catalogue filters on the history entry when visiting a detail page. */
export function useCatalogFilter<T extends string | null>(
  key: string,
  defaultValue: T,
  allowedValues?: readonly string[],
): readonly [T, (value: T) => void] {
  const search = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const raw = new URLSearchParams(search).get(key);
  const value = raw !== null && (!allowedValues || allowedValues.includes(raw)) ? raw as T : defaultValue;
  const setValue = useCallback((next: T) => {
    const url = new URL(window.location.href);
    if (next === null || next === defaultValue) url.searchParams.delete(key);
    else url.searchParams.set(key, next);
    window.history.replaceState(window.history.state, '', url);
    window.dispatchEvent(new Event(FILTER_EVENT));
  }, [key, defaultValue]);
  return [value, setValue];
}
