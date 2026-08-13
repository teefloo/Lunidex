'use client';

import { useEffect } from 'react';

export function HomeFaqAnchorBehavior() {
  useEffect(() => {
    const openFromHash = () => {
      const id = window.location.hash.slice(1);
      if (!id) return;
      const details = document.getElementById(id);
      if (!(details instanceof HTMLDetailsElement)) return;
      details.open = true;
      window.requestAnimationFrame(() => details.scrollIntoView({ block: 'start' }));
    };

    openFromHash();
    window.addEventListener('hashchange', openFromHash);
    return () => window.removeEventListener('hashchange', openFromHash);
  }, []);

  return null;
}

