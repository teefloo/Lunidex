'use client';

import { Check, CloudUpload, LoaderCircle, RefreshCw } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
import { useSyncWriteStatus } from '@/hooks/useSyncWriteStatus';
import { resetSyncWriteStatus } from '@/store/sync-write-status';
import { retrySyncAccess } from '@/store/sync-access';

export function SyncWriteIndicator() {
  const { t } = useTranslation();
  const status = useSyncWriteStatus();

  if (status.state === 'idle') return null;

  const label = status.state === 'queued'
    ? t('common.sync_pending')
    : status.state === 'saving'
      ? t('common.sync_saving')
      : status.state === 'saved'
        ? t('common.sync_saved')
        : t(status.reason === 'too-large'
          ? 'common.sync_too_large'
          : status.reason === 'conflict'
            ? 'common.sync_conflict'
            : status.reason === 'session'
              ? 'common.sync_session'
              : 'common.sync_failed');

  const Icon = status.state === 'saved'
    ? Check
    : status.state === 'queued'
      ? CloudUpload
      : status.state === 'saving'
        ? LoaderCircle
        : RefreshCw;

  return (
    <div
      role={status.state === 'error' ? 'alert' : 'status'}
      aria-live={status.state === 'error' ? 'assertive' : 'polite'}
      aria-atomic="true"
      className="flex max-w-[min(92vw,24rem)] items-center gap-2 rounded-sm border border-border/50 bg-card/95 px-3 py-2 text-xs font-semibold text-foreground shadow-[var(--shadow-pixel-sm)]"
    >
      <Icon
        aria-hidden="true"
        className={`h-4 w-4 shrink-0 ${status.state === 'saving' ? 'motion-safe:animate-spin' : ''} ${status.state === 'error' ? 'text-destructive' : 'text-primary'}`}
      />
      <span className="min-w-0 flex-1">{label}</span>
      {status.state === 'error' && (
        <button
          type="button"
          className="min-h-11 shrink-0 rounded-sm px-2 text-primary underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          onClick={() => {
            resetSyncWriteStatus();
            retrySyncAccess();
          }}
        >
          {t('common.sync_retry')}
        </button>
      )}
    </div>
  );
}
