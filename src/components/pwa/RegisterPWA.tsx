'use client';

import { useEffect } from 'react';
import type { Workbox } from 'workbox-window';

declare global {
  interface Window {
    workbox?: Workbox;
  }
}

/** Registers the generated service worker without leaking rejected promises. */
export function RegisterPWA() {
  useEffect(() => {
    const register = () => {
      if (!('serviceWorker' in navigator) || typeof caches === 'undefined') return;

      const workbox = window.workbox;
      if (!workbox) return;

      void workbox.register().catch(() => undefined);
    };

    const initialAttempt = window.setTimeout(register, 0);
    window.addEventListener('online', register);

    return () => {
      window.clearTimeout(initialAttempt);
      window.removeEventListener('online', register);
    };
  }, []);

  return null;
}
