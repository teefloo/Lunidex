import type { MouseEvent as ReactMouseEvent } from 'react';
import {
  DETAIL_RETURN_COUNT_PARAM,
  MAX_DETAIL_RETURN_COUNT,
  parseDetailReturnCount,
  parsePokemonReturnTarget,
} from '@/lib/pokemon-filter-url';

export const DETAIL_RETURN_TARGET_KEY = 'lunidex:detail-return-target';

/** Record a valid list anchor only for an unmodified same-tab detail navigation. */
export function recordDetailReturnOrigin(
  event: ReactMouseEvent<HTMLAnchorElement>,
  rawTarget: string,
): boolean {
  try {
    window.sessionStorage.removeItem(DETAIL_RETURN_TARGET_KEY);
  } catch {
    // The navigation can continue without the optional history shortcut.
  }

  if (
    event.defaultPrevented
    || event.button !== 0
    || event.metaKey
    || event.ctrlKey
    || event.shiftKey
    || event.altKey
    || (event.currentTarget.target !== '' && event.currentTarget.target !== '_self')
    || event.currentTarget.hasAttribute('download')
  ) {
    return false;
  }

  const validatedTarget = parsePokemonReturnTarget(rawTarget);
  if (!validatedTarget) return false;

  try {
    const currentUrl = new URL(window.location.href);
    const returnUrl = new URL(validatedTarget, window.location.origin);
    const returnCount = returnUrl.searchParams.get(DETAIL_RETURN_COUNT_PARAM);
    if (returnCount !== null && parseDetailReturnCount(returnCount, 1) !== Number(returnCount)) return false;
    if (returnCount !== null && Number(returnCount) > MAX_DETAIL_RETURN_COUNT) return false;

    const comparableSearch = (url: URL) => {
      const params = new URLSearchParams(url.searchParams);
      params.delete(DETAIL_RETURN_COUNT_PARAM);
      return params.toString();
    };
    if (
      returnUrl.origin !== currentUrl.origin
      || returnUrl.pathname !== currentUrl.pathname
      || comparableSearch(returnUrl) !== comparableSearch(currentUrl)
    ) {
      return false;
    }

    const targetWithFragment = `${returnUrl.pathname}${returnUrl.search}${returnUrl.hash}`;
    window.history.replaceState(window.history.state, '', targetWithFragment);
    window.sessionStorage.setItem(DETAIL_RETURN_TARGET_KEY, targetWithFragment);
    return true;
  } catch {
    return false;
  }
}
