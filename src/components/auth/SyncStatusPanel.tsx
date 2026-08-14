'use client';

import { RefreshCw } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
import { retrySyncAccess, type SyncAccessStatus } from '@/store/sync-access';

interface SyncStatusPanelProps {
  status: Exclude<SyncAccessStatus, 'ready' | 'unauthenticated'>;
}

export function SyncStatusPanel({ status }: SyncStatusPanelProps) {
  const { t } = useTranslation();
  const unavailable = status === 'unavailable';

  return (
    <section className="mx-auto max-w-2xl page-surface px-5 py-8 text-center sm:px-8" aria-labelledby="sync-status-title">
      <h1 id="sync-status-title" className="text-3xl font-black tracking-tight">
        {t('auth.sync_title', { defaultValue: 'Collection synchronization' })}
      </h1>
      <p className="mt-3 text-base leading-7 text-foreground/65">
        {t(unavailable ? 'auth.sync_unavailable' : 'auth.sync_checking', {
          defaultValue: unavailable
            ? 'Your account is signed in, but your saved data is temporarily unavailable. Please try again in a moment.'
            : 'Your collection is still syncing. Please try again in a moment.',
        })}
      </p>
      {unavailable ? (
        <button
          type="button"
          onClick={retrySyncAccess}
          className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-sm border border-primary/45 bg-primary/10 px-5 text-sm font-black uppercase tracking-[0.1em] text-primary hover:bg-primary/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
        >
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
          {t('auth.sync_retry', { defaultValue: 'Retry synchronization' })}
        </button>
      ) : (
        <div
          role="status"
          className="mx-auto mt-6 h-8 w-8 animate-spin rounded-full border-2 border-primary/30 border-t-primary"
          aria-label={t('auth.sync_checking', { defaultValue: 'Synchronizing your collection' })}
        />
      )}
    </section>
  );
}
