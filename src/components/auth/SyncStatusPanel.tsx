'use client';

import { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
import { retrySyncAccess, type SyncAccessStatus } from '@/store/sync-access';
import { useAuth } from '@/lib/neon/AuthProvider';

interface SyncStatusPanelProps {
  status: Exclude<SyncAccessStatus, 'ready' | 'unauthenticated'>;
  headingLevel?: 1 | 2;
}

export function SyncStatusPanel({ status, headingLevel = 1 }: SyncStatusPanelProps) {
  const { t } = useTranslation();
  const { retrySession } = useAuth();
  const unavailable = status === 'unavailable';
  const [retryAttempt, setRetryAttempt] = useState(0);
  const [retryReadyForStatus, setRetryReadyForStatus] = useState<SyncAccessStatus | null>(null);
  const waitingTooLong = retryReadyForStatus === status;
  const showRetry = unavailable || waitingTooLong;
  const Heading = headingLevel === 2 ? 'h2' : 'h1';

  useEffect(() => {
    if (unavailable) return;
    const timeoutId = window.setTimeout(() => setRetryReadyForStatus(status), 10_000);
    return () => window.clearTimeout(timeoutId);
  }, [retryAttempt, status, unavailable]);

  const handleRetry = () => {
    setRetryReadyForStatus(null);
    setRetryAttempt((attempt) => attempt + 1);
    retrySyncAccess();
    retrySession();
  };

  return (
    <section className="mx-auto max-w-2xl page-surface px-5 py-8 text-center sm:px-8" aria-labelledby="sync-status-title">
      <Heading id="sync-status-title" className="text-3xl font-black tracking-tight">
        {t('auth.sync_title', { defaultValue: 'Collection synchronization' })}
      </Heading>
      <p className="mt-3 text-base leading-7 text-foreground/65">
        {t(unavailable ? 'auth.sync_unavailable' : waitingTooLong ? 'auth.sync_taking_longer' : 'auth.sync_checking', {
          defaultValue: unavailable
            ? 'Your account is signed in, but your saved data is temporarily unavailable. Please try again in a moment.'
            : waitingTooLong
              ? 'This is taking longer than expected. You can retry the synchronization.'
            : 'Your collection is still syncing. Please try again in a moment.',
        })}
      </p>
      {unavailable || showRetry ? (
        <button
          type="button"
          onClick={handleRetry}
          className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-sm border border-primary/45 bg-primary/10 px-5 text-sm font-black uppercase tracking-[0.1em] text-primary hover:bg-primary/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
        >
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
          {t('auth.sync_retry', { defaultValue: 'Retry synchronization' })}
        </button>
      ) : null}
      {!unavailable && !waitingTooLong && (
        <div
          role="status"
          className="mx-auto mt-6 h-8 w-8 animate-spin rounded-full border-2 border-primary/30 border-t-primary"
          aria-label={t('auth.sync_checking', { defaultValue: 'Synchronizing your collection' })}
        />
      )}
    </section>
  );
}
