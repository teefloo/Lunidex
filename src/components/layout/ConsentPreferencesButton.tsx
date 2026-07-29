'use client';

import type { MouseEvent } from 'react';
import { setProductConsent } from '@/lib/product-measurement';

export function ConsentPreferencesButton({ label }: { label: string }) {
  const open = (event: MouseEvent<HTMLButtonElement>) => {
    try { window.localStorage.removeItem('primedex-cookie-consent'); } catch {}
    setProductConsent({ version: 2, policyVersion: '2026-07-29', chosenAt: '', audiencePerformance: 'unset', productMeasurement: 'unset' });
    window.dispatchEvent(new CustomEvent('primedex-open-consent-preferences', { detail: { opener: event.currentTarget } }));
  };
  return <button type="button" className="touch-target inline-flex items-center hover:text-foreground transition-colors" onClick={open}>{label}</button>;
}
