'use client';

import { useEffect } from 'react';

/**
 * Client-side redirect into the Team Builder. The parent page returns a real
 * 200 response (so crawlers can read the per-team Open Graph tags) and then
 * humans are forwarded to `/team?code=...`, where the existing loader hydrates
 * the shared team.
 */
export function RedirectToTeam({ href }: { href: string }) {
  useEffect(() => {
    window.location.replace(href);
  }, [href]);

  return null;
}
