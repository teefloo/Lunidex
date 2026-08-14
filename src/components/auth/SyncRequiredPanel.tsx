'use client';

import dynamic from 'next/dynamic';
import { useState } from 'react';
import { useTranslation } from '@/lib/i18n';
import { useAuth } from '@/lib/neon/AuthProvider';
import { AuthModalBoundary } from './AuthModalBoundary';

const AuthModal = dynamic(() => import('./AuthModal'), { ssr: false });

export function SyncRequiredPanel() {
  const { enabled } = useAuth();
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  const title = enabled
    ? t('auth.signin_title', { defaultValue: 'Sign in to continue' })
    : t('auth.session_unavailable', { defaultValue: 'Accounts are currently unavailable.' });
  const description = enabled
    ? t('auth.signin_subtitle', { defaultValue: 'Sign in to save and sync your collection.' })
    : t('auth.session_unavailable', { defaultValue: 'Accounts are currently unavailable.' });

  return (
    <section className="mx-auto max-w-2xl page-surface px-5 py-8 text-center sm:px-8" aria-labelledby="sync-required-title">
      <h1 id="sync-required-title" className="text-3xl font-black tracking-tight">
        {title}
      </h1>
      <p className="mt-3 text-base leading-7 text-foreground/65">
        {description}
      </p>
      {enabled && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="mt-6 inline-flex min-h-11 items-center rounded-sm border border-primary/45 bg-primary/10 px-5 text-sm font-black uppercase tracking-[0.1em] text-primary hover:bg-primary/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
        >
          {t('auth.signin_cta', { defaultValue: 'Sign in' })}
        </button>
      )}
      {open && (
        <AuthModalBoundary onClose={() => setOpen(false)}>
          <AuthModal open onOpenChange={setOpen} />
        </AuthModalBoundary>
      )}
    </section>
  );
}
