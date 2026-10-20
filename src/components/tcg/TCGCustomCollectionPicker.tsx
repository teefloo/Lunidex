'use client';

import { useMemo, useState } from 'react';
import { FolderPlus, Search } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useClientLanguage } from '@/hooks/useLocaleHref';
import { getTCGCardLanguageName } from '@/lib/tcg-language';
import { useTranslation } from '@/lib/i18n';
import { usePrimeDexStore } from '@/store/primedex';
import type { TCGCard } from '@/types/tcg';
import type { TCGCardLanguage } from '@/lib/tcg-language';
import { TCGCustomCollectionFormDialog } from './TCGCustomCollectionFormDialog';

interface TCGCustomCollectionPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  card: TCGCard;
  language: TCGCardLanguage;
}

function normalizeSearch(value: string): string {
  return value.normalize('NFKD').replace(/\p{Diacritic}/gu, '').toLocaleLowerCase().trim();
}

export function TCGCustomCollectionPicker({ open, onOpenChange, card, language }: TCGCustomCollectionPickerProps) {
  const { t } = useTranslation();
  const collections = usePrimeDexStore((state) => state.tcgCustomCollections);
  const memberships = usePrimeDexStore((state) => state.tcgCustomCollectionCards);
  const interfaceLanguage = useClientLanguage();
  const addCard = usePrimeDexStore((state) => state.addTCGCustomCollectionCard);
  const removeCard = usePrimeDexStore((state) => state.removeTCGCustomCollectionCard);
  const [query, setQuery] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [error, setError] = useState('');
  const filteredCollections = useMemo(() => {
    const normalized = normalizeSearch(query);
    return normalized
      ? collections.filter((collection) => normalizeSearch(`${collection.name} ${collection.description ?? ''}`).includes(normalized))
      : collections;
  }, [collections, query]);

  const toggleCollection = (collectionId: string) => {
    setError('');
    const selected = memberships.some((entry) => entry.collectionId === collectionId && entry.cardId === card.id && entry.language === language);
    const changed = selected
      ? removeCard(collectionId, card.id, language)
      : addCard(collectionId, { cardId: card.id, language, cardName: card.name });
    if (!changed) setError(selected ? t('tcg.custom_collections.remove_error') : t('tcg.custom_collections.add_error'));
  };

  const addToNewCollection = (collectionId: string) => {
    if (!addCard(collectionId, { cardId: card.id, language, cardName: card.name })) {
      setError(t('tcg.custom_collections.add_error'));
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg" aria-labelledby="custom-collection-picker-title">
          <DialogHeader>
            <DialogTitle id="custom-collection-picker-title" className="pr-10 text-lg font-black">{t('tcg.custom_collections.organize')}</DialogTitle>
            <DialogDescription>{t('tcg.custom_collections.organize_description')}</DialogDescription>
          </DialogHeader>
          <div className="rounded-sm border border-border/50 bg-muted/20 p-3">
            <p className="break-words text-sm font-black">{card.name}</p>
            <p className="mt-1 font-mono text-xs text-muted-foreground">{card.id}</p>
            <p className="mt-2 text-xs font-bold">{getTCGCardLanguageName(language, interfaceLanguage)} · {language.toUpperCase()}</p>
          </div>
          {collections.length > 0 && (
            <label className="relative block" htmlFor="custom-collection-picker-search">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
              <Input id="custom-collection-picker-search" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t('tcg.custom_collections.search_collections_placeholder')} aria-label={t('tcg.custom_collections.search_collections')} className="pl-10" />
            </label>
          )}
          {error && <p role="alert" className="text-sm font-semibold text-destructive">{error}</p>}
          {collections.length === 0 ? (
            <p className="rounded-sm border border-dashed border-border/60 p-4 text-center text-sm text-muted-foreground">{t('tcg.custom_collections.no_collections')}</p>
          ) : filteredCollections.length === 0 ? (
            <p role="status" className="rounded-sm border border-border/50 p-4 text-center text-sm text-muted-foreground">{t('tcg.custom_collections.no_results')}</p>
          ) : (
            <ul className="max-h-72 space-y-2 overflow-y-auto pr-1" aria-label={t('tcg.custom_collections.title')}>
              {filteredCollections.map((collection) => {
                const selected = memberships.some((entry) => entry.collectionId === collection.id && entry.cardId === card.id && entry.language === language);
                return (
                  <li key={collection.id}>
                    <label className="flex min-h-12 cursor-pointer items-center gap-3 rounded-sm border border-border/50 bg-card/50 px-3 py-2 hover:border-primary/45 focus-within:ring-2 focus-within:ring-primary">
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={() => toggleCollection(collection.id)}
                        aria-label={collection.name}
                        className="h-5 w-5 accent-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      />
                      <span className="min-w-0 flex-1 truncate text-sm font-bold">{collection.name}</span>
                      {selected && <span className="text-xs font-black text-primary">{t('tcg.custom_collections.already_added')}</span>}
                    </label>
                  </li>
                );
              })}
            </ul>
          )}
          <button type="button" onClick={() => setFormOpen(true)} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-sm border border-primary/40 px-4 text-sm font-bold text-primary hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
            <FolderPlus className="h-4 w-4" aria-hidden="true" />{t('tcg.custom_collections.create')}
          </button>
        </DialogContent>
      </Dialog>
      {formOpen && <TCGCustomCollectionFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        onSaved={addToNewCollection}
      />}
    </>
  );
}
