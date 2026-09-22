'use client';

import { useId, useState } from 'react';
import { Languages, MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useClientLanguage } from '@/hooks/useLocaleHref';
import { useTranslation } from '@/lib/i18n';
import {
  getTCGCardLanguageName,
  TCG_CARD_LANGUAGES,
  type TCGCardLanguage,
} from '@/lib/tcg-language';

interface TCGCollectionLanguageDialogProps {
  currentLanguage: TCGCardLanguage;
  setName: string;
  hasCards: boolean;
  onConfirm: (nextLanguage: TCGCardLanguage) => boolean;
  className?: string;
  compact?: boolean;
}

export function TCGCollectionLanguageDialog({
  currentLanguage,
  setName,
  hasCards,
  onConfirm,
  className,
  compact = false,
}: TCGCollectionLanguageDialogProps) {
  const { t } = useTranslation();
  const interfaceLanguage = useClientLanguage();
  const selectId = useId();
  const [open, setOpen] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState<TCGCardLanguage>(currentLanguage);

  const openDialog = () => {
    setSelectedLanguage(currentLanguage);
    setOpen(true);
  };

  const handleConfirm = () => {
    if (selectedLanguage === currentLanguage) {
      setOpen(false);
      return;
    }
    if (onConfirm(selectedLanguage)) setOpen(false);
  };

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size={compact ? 'icon-touch' : 'sm'}
        className={className}
        onClick={openDialog}
        aria-label={t('tcg.collection_options_for_set', { name: setName, defaultValue: `Options for ${setName}` })}
      >
        {compact ? <MoreHorizontal aria-hidden="true" /> : <><Languages aria-hidden="true" />{t('tcg.collection_options', { defaultValue: 'Options' })}</>}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('tcg.collection_change_language', { defaultValue: 'Change collection language' })}</DialogTitle>
            <DialogDescription>
              {hasCards
                ? t('tcg.collection_language_transfer_description', { name: setName, defaultValue: `Changing the language moves the cards in ${setName} to the selected collection.` })
                : t('tcg.collection_language_open_description', { name: setName, defaultValue: `Open ${setName} in another card language.` })}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-2">
            <label htmlFor={selectId} className="text-sm font-semibold text-foreground">
              {t('tcg.card_language', { defaultValue: 'Card language' })}
            </label>
            <select
              id={selectId}
              name="collection-language"
              value={selectedLanguage}
              onChange={(event) => setSelectedLanguage(event.target.value as TCGCardLanguage)}
              className="min-h-11 rounded-sm border border-border/50 bg-card px-3 text-sm font-semibold text-foreground outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
            >
              {TCG_CARD_LANGUAGES.map((language) => (
                <option key={language} value={language}>
                  {getTCGCardLanguageName(language, interfaceLanguage)}
                </option>
              ))}
            </select>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              {t('common.cancel', { defaultValue: 'Cancel' })}
            </Button>
            <Button type="button" onClick={handleConfirm} disabled={selectedLanguage === currentLanguage}>
              {hasCards
                ? t('tcg.collection_confirm_language_transfer', { defaultValue: 'Move cards' })
                : t('tcg.collection_open_in_language', { defaultValue: 'Open collection' })}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
