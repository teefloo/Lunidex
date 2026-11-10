'use client';

import { useEffect } from 'react';

export function useHashTargetRestoration() {
  useEffect(() => {
    let observer: MutationObserver | null = null;
    let timeoutId: number | null = null;

    const clearPendingRestore = () => {
      observer?.disconnect();
      observer = null;
      if (timeoutId !== null) window.clearTimeout(timeoutId);
      timeoutId = null;
    };

    const restoreHashTarget = () => {
      clearPendingRestore();
      if (!window.location.hash) return;

      let targetId: string;
      try {
        targetId = decodeURIComponent(window.location.hash.slice(1));
      } catch {
        return;
      }
      if (!targetId) return;

      const tryRestore = () => {
        const target = document.getElementById(targetId);
        if (!(target instanceof HTMLElement)) return false;
        if (typeof target.scrollIntoView === 'function') target.scrollIntoView({ block: 'start' });
        target.focus({ preventScroll: true });
        clearPendingRestore();
        return true;
      };

      if (tryRestore()) return;
      observer = new MutationObserver(() => {
        tryRestore();
      });
      observer.observe(document.body, { childList: true, subtree: true });
      timeoutId = window.setTimeout(clearPendingRestore, 5000);
    };

    window.addEventListener('popstate', restoreHashTarget);
    window.addEventListener('hashchange', restoreHashTarget);
    restoreHashTarget();

    return () => {
      window.removeEventListener('popstate', restoreHashTarget);
      window.removeEventListener('hashchange', restoreHashTarget);
      clearPendingRestore();
    };
  }, []);
}
