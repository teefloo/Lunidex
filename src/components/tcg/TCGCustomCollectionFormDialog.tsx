'use client';

import { useRef, useState, type FormEvent } from 'react';
import { Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useTranslation } from '@/lib/i18n';
import { usePrimeDexStore } from '@/store/primedex';
import type { TCGCustomCollection } from '@primedex/core/lib/tcg-custom-collections';
import { hasSyncAccess, requestSyncAccess } from '@/store/sync-access';
import { pickSyncState } from '@/lib/supabase/sync-state';
import { waitForSyncChange, type SyncChangeFailure } from '@/lib/sync-confirmation';

interface TCGCustomCollectionFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  collection?: TCGCustomCollection;
  onSaved?: (collectionId: string) => void;
}

export function TCGCustomCollectionFormDialog({
  open,
  onOpenChange,
  collection,
  onSaved,
}: TCGCustomCollectionFormDialogProps) {
  const { t } = useTranslation();
  const createCollection = usePrimeDexStore((state) => state.createTCGCustomCollection);
  const editCollection = usePrimeDexStore((state) => state.editTCGCustomCollection);
  const [name, setName] = useState(collection?.name ?? '');
  const [description, setDescription] = useState(collection?.description ?? '');
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const submitGuard = useRef(false);

  const syncErrorMessage = (reason: SyncChangeFailure): string => t(reason === 'too-large'
    ? 'common.sync_too_large'
    : reason === 'conflict'
      ? 'common.sync_conflict'
      : reason === 'session'
        ? 'common.sync_session'
        : 'common.sync_failed');

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitGuard.current) return;
    const normalizedName = name.trim();
    if (!normalizedName || normalizedName.length > 120) {
      setError(t('tcg.custom_collections.invalid_name'));
      return;
    }
    if (!hasSyncAccess()) {
      requestSyncAccess();
      setError(t('tcg.custom_collections.sync_required'));
      return;
    }
    const normalizedDescription = description.trim();
    let collectionId: string;
    submitGuard.current = true;
    setIsSaving(true);
    setError('');
    if (collection) {
      if (!editCollection(collection.id, normalizedName, normalizedDescription)) {
        setError(t('tcg.custom_collections.save_error'));
        submitGuard.current = false;
        setIsSaving(false);
        return;
      }
      collectionId = collection.id;
    } else {
      collectionId = createCollection(normalizedName, normalizedDescription);
      if (!collectionId) {
        setError(t('tcg.custom_collections.save_error'));
        submitGuard.current = false;
        setIsSaving(false);
        return;
      }
    }
    try {
      const result = await waitForSyncChange(pickSyncState(), pickSyncState);
      if (!result.ok) {
        setError(syncErrorMessage(result.reason));
        return;
      }
      onSaved?.(collectionId);
      onOpenChange(false);
    } finally {
      submitGuard.current = false;
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => { if (!isSaving) onOpenChange(nextOpen); }}>
      <DialogContent className="sm:max-w-lg" aria-labelledby="custom-collection-form-title" aria-busy={isSaving}>
        <DialogHeader>
          <DialogTitle id="custom-collection-form-title" className="pr-10 text-lg font-black">
            {collection ? t('tcg.custom_collections.edit_title') : t('tcg.custom_collections.create_title')}
          </DialogTitle>
          <DialogDescription>{t('tcg.custom_collections.description')}</DialogDescription>
        </DialogHeader>
        <form onSubmit={(event) => void submit(event)} className="space-y-4">
          <label className="block space-y-2 text-sm font-bold" htmlFor="custom-collection-name">
            <span>{t('tcg.custom_collections.name')}</span>
            <Input
              id="custom-collection-name"
              autoFocus
              value={name}
              onChange={(event) => { setName(event.target.value); setError(''); }}
              disabled={isSaving}
              maxLength={120}
              required
              placeholder={t('tcg.custom_collections.name_placeholder')}
              aria-invalid={Boolean(error)}
            />
            <span className="block text-right text-xs font-medium text-muted-foreground">{name.length}/120</span>
          </label>
          <label className="block space-y-2 text-sm font-bold" htmlFor="custom-collection-description">
            <span>{t('tcg.custom_collections.description_label')}</span>
            <textarea
              id="custom-collection-description"
              value={description}
              onChange={(event) => { setDescription(event.target.value); setError(''); }}
              disabled={isSaving}
              maxLength={2_000}
              rows={4}
              placeholder={t('tcg.custom_collections.description_placeholder')}
              className="glass-control min-h-24 w-full resize-y rounded-sm border border-input/70 px-4 py-3 text-base outline-none transition focus-visible:ring-2 focus-visible:ring-primary/50 md:text-sm"
            />
            <span className="block text-right text-xs font-medium text-muted-foreground">{description.length}/2000</span>
          </label>
          {error && <p role="alert" className="text-sm font-semibold text-destructive">{error}</p>}
          <DialogFooter>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              disabled={isSaving}
              className="inline-flex min-h-11 items-center justify-center rounded-sm border border-border px-4 font-bold hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              {t('tcg.custom_collections.cancel')}
            </button>
            <button
              type="submit"
              disabled={isSaving}
              aria-busy={isSaving}
              className="inline-flex min-h-11 items-center justify-center rounded-sm bg-primary px-4 font-black text-primary-foreground hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 motion-safe:animate-spin" aria-hidden="true" /> : null}
              {isSaving ? t('common.saving_changes') : t('tcg.custom_collections.save')}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
