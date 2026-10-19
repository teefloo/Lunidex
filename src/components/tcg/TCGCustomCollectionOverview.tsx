'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { FolderPlus, Pencil, Search, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useLocaleHref } from '@/hooks/useLocaleHref';
import { useTranslation } from '@/lib/i18n';
import { usePrimeDexStore } from '@/store/primedex';
import { TCGCustomCollectionFormDialog } from './TCGCustomCollectionFormDialog';
import type { TCGCustomCollection } from '@primedex/core/lib/tcg-custom-collections';

function normalizeSearch(value: string): string {
  return value.normalize('NFKD').replace(/\p{Diacritic}/gu, '').toLocaleLowerCase().trim();
}

export function TCGCustomCollectionOverview() {
  const { t } = useTranslation();
  const localeHref = useLocaleHref();
  const collections = usePrimeDexStore((state) => state.tcgCustomCollections);
  const cards = usePrimeDexStore((state) => state.tcgCustomCollectionCards);
  const deleteCollection = usePrimeDexStore((state) => state.deleteTCGCustomCollection);
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<TCGCustomCollection | undefined>();
  const [deleting, setDeleting] = useState<TCGCustomCollection | null>(null);
  const [error, setError] = useState('');
  const cardCountByCollection = useMemo(() => {
    const counts = new Map<string, number>();
    for (const card of cards) counts.set(card.collectionId, (counts.get(card.collectionId) ?? 0) + 1);
    return counts;
  }, [cards]);
  const visibleCollections = useMemo(() => {
    const query = normalizeSearch(search);
    if (!query) return collections;
    return collections.filter((collection) => normalizeSearch(`${collection.name} ${collection.description ?? ''}`).includes(query));
  }, [collections, search]);

  const openCreate = () => {
    setEditing(undefined);
    setFormOpen(true);
  };

  const openEdit = (collection: TCGCustomCollection) => {
    setEditing(collection);
    setFormOpen(true);
  };

  const confirmDelete = () => {
    if (!deleting) return;
    if (!deleteCollection(deleting.id)) {
      setError(t('tcg.custom_collections.delete_error'));
      return;
    }
    setDeleting(null);
    setError('');
  };

  return (
    <section aria-labelledby="custom-collections-heading" className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-2xl">
          <h2 id="custom-collections-heading" className="text-xl font-black uppercase tracking-tight sm:text-2xl">
            {t('tcg.custom_collections.title')}
          </h2>
          <p className="mt-2 text-sm leading-6 text-foreground/65">{t('tcg.custom_collections.description')}</p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-sm bg-primary px-4 text-sm font-black text-primary-foreground shadow-[var(--shadow-pixel-sm)] hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          <FolderPlus className="h-4 w-4" aria-hidden="true" />
          {t('tcg.custom_collections.create')}
        </button>
      </div>

      {collections.length > 0 && (
        <label className="relative block max-w-xl" htmlFor="custom-collection-search">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input
            id="custom-collection-search"
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={t('tcg.custom_collections.search_collections_placeholder')}
            aria-label={t('tcg.custom_collections.search_collections')}
            className="pl-10"
          />
        </label>
      )}

      {error && <p role="alert" className="rounded-sm border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}

      {collections.length === 0 ? (
        <div className="rounded-sm border border-dashed border-primary/30 bg-card/30 px-5 py-10 text-center">
          <h3 className="text-lg font-black">{t('tcg.custom_collections.empty_title')}</h3>
          <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground">{t('tcg.custom_collections.empty_description')}</p>
          <button type="button" onClick={openCreate} className="mt-5 inline-flex min-h-11 items-center rounded-sm border border-primary/50 px-4 font-bold text-primary hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
            {t('tcg.custom_collections.create')}
          </button>
        </div>
      ) : visibleCollections.length === 0 ? (
        <p className="rounded-sm border border-border/50 bg-card/30 p-6 text-center text-sm text-muted-foreground" role="status">
          {t('tcg.custom_collections.no_results')}
        </p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3" aria-label={t('tcg.custom_collections.title')}>
          {visibleCollections.map((collection) => {
            const cardCount = cardCountByCollection.get(collection.id) ?? 0;
            return (
              <li key={collection.id} className="group relative flex min-h-40 flex-col rounded-sm border border-border/50 bg-card/50 p-4 shadow-[var(--shadow-pixel-sm)] transition hover:border-primary/45 hover:bg-card/80">
                <Link href={localeHref(`/tcg/collection/custom/${encodeURIComponent(collection.id)}`)} className="absolute inset-0 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary" aria-label={collection.name}>
                  <span className="sr-only">{collection.name}</span>
                </Link>
                <div className="pointer-events-none relative z-10 flex min-h-0 flex-1 flex-col">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="min-w-0 break-words text-lg font-black leading-tight group-hover:text-primary">{collection.name}</h3>
                    <span className="shrink-0 rounded-sm border border-primary/30 bg-primary/10 px-2 py-1 text-xs font-black text-primary">
                      {t('tcg.custom_collections.cards_count', { count: cardCount })}
                    </span>
                  </div>
                  {collection.description && <p className="mt-3 line-clamp-3 break-words text-sm leading-6 text-foreground/65">{collection.description}</p>}
                </div>
                <div className="relative z-20 mt-4 flex gap-2 self-end">
                  <button type="button" onClick={() => openEdit(collection)} aria-label={`${t('tcg.custom_collections.edit_title')}: ${collection.name}`} className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-sm border border-border bg-background/80 text-foreground/75 hover:border-primary/50 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                    <Pencil className="h-4 w-4" aria-hidden="true" />
                  </button>
                  <button type="button" onClick={() => { setDeleting(collection); setError(''); }} aria-label={`${t('tcg.custom_collections.delete')}: ${collection.name}`} className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-sm border border-border bg-background/80 text-foreground/75 hover:border-destructive/50 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive">
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {formOpen && <TCGCustomCollectionFormDialog
        open={formOpen}
        onOpenChange={(open) => { setFormOpen(open); if (!open) setEditing(undefined); }}
        collection={editing}
      />}
      <Dialog open={Boolean(deleting)} onOpenChange={(open) => { if (!open) setDeleting(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{deleting ? t('tcg.custom_collections.delete_confirm', { name: deleting.name }) : t('tcg.custom_collections.delete')}</DialogTitle>
            <DialogDescription>{t('tcg.custom_collections.delete_inventory')}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <button type="button" onClick={() => setDeleting(null)} className="inline-flex min-h-11 items-center justify-center rounded-sm border border-border px-4 font-bold hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
              {t('tcg.custom_collections.cancel')}
            </button>
            <button type="button" onClick={confirmDelete} className="inline-flex min-h-11 items-center justify-center rounded-sm bg-destructive px-4 font-black text-destructive-foreground hover:bg-destructive/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive focus-visible:ring-offset-2">
              {t('tcg.custom_collections.delete')}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
