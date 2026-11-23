'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link2, RotateCcw, ShieldOff } from 'lucide-react';
import {
  createTCGCollectionShareLink,
  getTCGCollectionShareSettings,
  revokeTCGCollectionShare,
  updateTCGCollectionShareSettings,
  type TCGCollectionShareSettings,
} from '@/lib/api/tcg-share';
import { useTranslation } from '@/lib/i18n';

interface TCGCustomCollectionSharePanelProps {
  collectionId: string;
  signedIn: boolean;
  canManage: boolean;
  authLoading: boolean;
}

function shareQueryKey(collectionId: string) {
  return ['tcg', 'custom-collection-share', collectionId] as const;
}

export function TCGCustomCollectionSharePanel({ collectionId, signedIn, canManage, authLoading }: TCGCustomCollectionSharePanelProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [generatedUrl, setGeneratedUrl] = useState('');
  const [feedback, setFeedback] = useState('');
  const settingsQuery = useQuery({
    queryKey: shareQueryKey(collectionId),
    queryFn: ({ signal }) => getTCGCollectionShareSettings(collectionId, signal),
    enabled: canManage,
    staleTime: 0,
    retry: false,
  });
  const updateMutation = useMutation({
    mutationFn: (settings: Pick<TCGCollectionShareSettings, 'showQuantities' | 'showPrices'>) => (
      updateTCGCollectionShareSettings(collectionId, settings)
    ),
    onSuccess: (settings) => {
      queryClient.setQueryData(shareQueryKey(collectionId), settings);
      setFeedback('');
    },
    onError: () => setFeedback(t('tcg.custom_collections.share_update_error')),
  });
  const createMutation = useMutation({
    mutationFn: (rotate: boolean) => createTCGCollectionShareLink(collectionId, rotate),
    onSuccess: (result) => {
      setGeneratedUrl(result.url);
      queryClient.setQueryData(shareQueryKey(collectionId), {
        active: result.active,
        showQuantities: result.showQuantities,
        showPrices: result.showPrices,
      });
      setFeedback('');
    },
    onError: () => setFeedback(t('tcg.custom_collections.share_create_error')),
  });
  const revokeMutation = useMutation({
    mutationFn: () => revokeTCGCollectionShare(collectionId),
    onSuccess: (settings) => {
      queryClient.setQueryData(shareQueryKey(collectionId), settings);
      setGeneratedUrl('');
      setFeedback(t('tcg.custom_collections.share_revoked'));
    },
    onError: () => setFeedback(t('tcg.custom_collections.share_revoke_error')),
  });

  const settings = settingsQuery.data;
  const busy = updateMutation.isPending || createMutation.isPending || revokeMutation.isPending;
  const copyUrl = async () => {
    if (!generatedUrl) return;
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(generatedUrl);
      setFeedback(t('tcg.custom_collections.share_copy_done'));
    } catch {
      setFeedback(t('tcg.custom_collections.share_copy_error'));
    }
  };

  return (
    <section className="rounded-sm border border-border/45 bg-card/25 p-4" aria-labelledby="custom-collection-share-title">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="custom-collection-share-title" className="text-sm font-black uppercase tracking-[0.08em] text-foreground/75">
            {t('tcg.custom_collections.share_title')}
          </h2>
          <p className="mt-1 max-w-3xl text-xs leading-5 text-foreground/55">{t('tcg.custom_collections.share_description')}</p>
        </div>
        {settings?.active && <span className="rounded-sm border border-emerald-500/35 bg-emerald-500/10 px-2 py-1 text-[10px] font-bold text-emerald-700 dark:text-emerald-200">{t('tcg.custom_collections.share_active')}</span>}
      </div>

      {authLoading ? (
        <p className="mt-3 text-xs text-muted-foreground" role="status">{t('tcg.custom_collections.share_loading')}</p>
      ) : !canManage ? (
        <p className="mt-3 text-xs font-semibold text-foreground/60">
          {signedIn ? t('tcg.custom_collections.share_sync_required') : t('tcg.custom_collections.share_login_required')}
        </p>
      ) : settingsQuery.isPending ? (
        <p className="mt-3 text-xs text-muted-foreground" role="status">{t('tcg.custom_collections.share_loading')}</p>
      ) : settingsQuery.isError ? (
        <p className="mt-3 text-xs font-semibold text-destructive" role="alert">{t('tcg.custom_collections.share_create_error')}</p>
      ) : (
        <>
          <p className="mt-3 text-xs font-bold text-foreground/65" role="status">
            {settings?.active ? t('tcg.custom_collections.share_link_ready') : t('tcg.custom_collections.share_inactive')}
          </p>
          <p className="mt-1 text-[11px] leading-5 text-foreground/50">{t('tcg.custom_collections.share_privacy_note')}</p>

          {settings?.active && (
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <label className="flex min-h-11 items-center gap-2 rounded-sm border border-border/50 px-3 text-xs font-semibold">
                <input
                  type="checkbox"
                  checked={settings.showQuantities}
                  disabled={busy}
                  onChange={(event) => updateMutation.mutate({ showQuantities: event.currentTarget.checked, showPrices: settings.showPrices })}
                  className="h-4 w-4 accent-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                />
                {t('tcg.custom_collections.share_show_quantities')}
              </label>
              <label className="flex min-h-11 items-center gap-2 rounded-sm border border-border/50 px-3 text-xs font-semibold">
                <input
                  type="checkbox"
                  checked={settings.showPrices}
                  disabled={busy}
                  onChange={(event) => updateMutation.mutate({ showQuantities: settings.showQuantities, showPrices: event.currentTarget.checked })}
                  className="h-4 w-4 accent-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                />
                {t('tcg.custom_collections.share_show_prices')}
              </label>
            </div>
          )}

          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => { setFeedback(''); createMutation.mutate(Boolean(settings?.active)); }}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-sm bg-primary px-3 text-xs font-black text-primary-foreground hover:bg-primary/90 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              {settings?.active ? <RotateCcw className="h-4 w-4" aria-hidden="true" /> : <Link2 className="h-4 w-4" aria-hidden="true" />}
              {settings?.active ? t('tcg.custom_collections.share_rotate') : t('tcg.custom_collections.share_create')}
            </button>
            {settings?.active && (
              <button
                type="button"
                disabled={busy}
                onClick={() => { setFeedback(''); revokeMutation.mutate(); }}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-sm border border-destructive/35 px-3 text-xs font-bold text-destructive hover:bg-destructive/5 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive"
              >
                <ShieldOff className="h-4 w-4" aria-hidden="true" />{t('tcg.custom_collections.share_revoke')}
              </button>
            )}
          </div>

          {generatedUrl && settings?.active && (
            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <input
                aria-label={t('tcg.custom_collections.share_title')}
                readOnly
                value={generatedUrl}
                className="min-h-11 min-w-0 flex-1 rounded-sm border border-border bg-background px-3 text-xs"
              />
              <button type="button" onClick={() => void copyUrl()} className="min-h-11 rounded-sm border border-border px-3 text-xs font-bold hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                {t('tcg.custom_collections.share_copy')}
              </button>
            </div>
          )}
          {feedback && <p className="mt-2 text-xs font-semibold text-foreground/65" role="status">{feedback}</p>}
        </>
      )}
    </section>
  );
}
