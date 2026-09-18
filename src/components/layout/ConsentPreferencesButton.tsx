'use client';

import type { MouseEvent } from 'react';
import { setProductConsent } from '@/lib/product-measurement';
import { createUnsetProductConsent } from '@/lib/posthog-consent';
import { cn } from '@/lib/utils';

export function ConsentPreferencesButton({ label, className }: { label: string; className?: string }) {
  const open = (event: MouseEvent<HTMLButtonElement>) => {
    try { window.localStorage.removeItem('primedex-cookie-consent'); } catch {}
    setProductConsent(createUnsetProductConsent());
    window.dispatchEvent(new CustomEvent('primedex-open-consent-preferences', { detail: { opener: event.currentTarget } }));
  };
  return <button type="button" className={cn('touch-target inline-flex items-center hover:text-foreground transition-colors', className)} onClick={open}>{label}</button>;
}
