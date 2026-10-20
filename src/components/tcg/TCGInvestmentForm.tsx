'use client';

import { useState, type FormEvent } from 'react';
import { useQuery } from '@tanstack/react-query';
import { INVESTMENT_CONDITIONS, INVESTMENT_VARIANTS, type InvestmentCondition, type InvestmentVariant, type TCGInvestment } from '@primedex/core/lib/tcg-investments';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/lib/i18n';
import { getTCGCard } from '@/lib/api/tcg';
import { TCG_CARD_LANGUAGES, getTCGCardLanguageName, type TCGCardLanguage } from '@/lib/tcg-language';
import { getInvestmentReferenceQuote, parseEuroCents } from '@/lib/tcg-investments';
import { usePrimeDexStore } from '@/store/primedex';
import type { TCGCard } from '@/types/tcg';
import { TCGInvestmentCardPicker } from './TCGInvestmentCardPicker';

export const investmentSelectClass = 'mt-2 min-h-11 w-full min-w-0 rounded-sm border border-border bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary';

export function TCGInvestmentForm({ lot, language: initialLanguage, onClose, onSaved }: { lot?: TCGInvestment; language: TCGCardLanguage; onClose: () => void; onSaved: () => void }) {
  const { t, i18n } = useTranslation();
  const save = usePrimeDexStore((state) => state.saveTCGInvestment);
  const [language, setLanguage] = useState(lot?.language ?? initialLanguage);
  const [selected, setSelected] = useState<TCGCard | null>(lot ? { id: lot.cardId, name: lot.cardName, localId: lot.cardId.split('-').at(-1)! } : null);
  const [variant, setVariant] = useState<InvestmentVariant>(lot?.variant ?? 'normal');
  const [printing, setPrinting] = useState(lot?.printing ?? '');
  const [condition, setCondition] = useState<InvestmentCondition>(lot?.condition ?? 'unknown');
  const [quantity, setQuantity] = useState(String(lot?.quantity ?? 1));
  const [unitCost, setUnitCost] = useState(lot ? (lot.unitCostCents / 100).toFixed(2) : '');
  const [fees, setFees] = useState(lot ? (lot.feesCents / 100).toFixed(2) : '0');
  const [acquired, setAcquired] = useState(lot?.acquiredOn ?? '');
  const [estimate, setEstimate] = useState(lot?.valuation ? (lot.valuation.unitPriceCents / 100).toFixed(2) : '');
  const [valuedOn, setValuedOn] = useState(lot?.valuation?.valuedOn ?? '');
  const [confirmed, setConfirmed] = useState(!!lot?.valuation);
  const [error, setError] = useState('');
  const detail = useQuery({
    queryKey: ['tcg', 'investment-detail-strict', language, selected?.id],
    queryFn: ({ signal }) => getTCGCard(selected!.id, language, signal, { allowEnglishFallback: false, requirePricing: true }),
    enabled: !!selected,
    retry: false,
  });
  const card = detail.data?.id === selected?.id ? detail.data : null;
  const reference = card ? getInvestmentReferenceQuote(card, variant, printing) : null;
  const variants = INVESTMENT_VARIANTS.filter((item) => item === 'other' || (item === variant && !!lot) || card?.variants?.[item]);
  const variantLabel = (item: InvestmentVariant) => t(['normal', 'holo', 'reverse'].includes(item) ? `tcg.collection_variant_${item}` : `investments.${item}`);
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setError('');
    const unitCostCents = parseEuroCents(unitCost), feesCents = parseEuroCents(fees), unitPriceCents = estimate.trim() ? parseEuroCents(estimate) : null;
    const activeCard = card ?? (lot ? selected : null);
    if (!activeCard || !/^\d+$/.test(quantity) || unitCostCents === null || feesCents === null || (estimate.trim() && (unitPriceCents === null || !confirmed)) || (!estimate.trim() && valuedOn) || (!lot && !variants.includes(variant))) { setError(t('investments.invalid')); return; }
    const id = save({
      cardId: activeCard.id, cardName: activeCard.name, setId: activeCard.set?.id ?? lot?.setId ?? activeCard.id.slice(0, activeCard.id.lastIndexOf('-')),
      language, variant, printing, condition, quantity: Number(quantity), unitCostCents, feesCents, acquiredOn: acquired || null,
      valuation: unitPriceCents === null ? null : { unitPriceCents, valuedOn: valuedOn || null },
    }, lot?.id);
    if (!id) { setError(t('tcg.custom_collections.save_error')); return; }
    onSaved();
  };
  const chooseCard = (next: TCGCard) => {
    setSelected(next);
    setVariant('other'); setPrinting(''); setConfirmed(false);
  };
  return <Sheet open onOpenChange={(open) => { if (!open) onClose(); }}>
    <SheetContent side="right" className="data-[side=right]:w-full data-[side=right]:sm:max-w-2xl gap-0 overflow-y-auto p-0">
      <SheetHeader className="border-b border-border/60 pr-14"><SheetTitle>{t(lot ? 'investments.edit' : 'investments.add')}</SheetTitle></SheetHeader>
      <div className="space-y-5 p-4 sm:p-6">
        <label className="block text-sm font-semibold">{t('tcg.card_language')}
          <select aria-label={t('tcg.card_language')} className={investmentSelectClass} value={language} disabled={!!lot} onChange={(event) => { setLanguage(event.target.value as TCGCardLanguage); setSelected(null); setConfirmed(false); }}>
            {TCG_CARD_LANGUAGES.map((lang) => <option key={lang} value={lang}>{getTCGCardLanguageName(lang, i18n.language)}</option>)}
          </select>
        </label>
        {!selected ? <TCGInvestmentCardPicker key={language} language={language} onSelect={chooseCard} /> : <>
          <div className="rounded-sm border border-border/60 bg-muted/30 p-4">
            <p className="font-bold">{card?.name ?? selected.name}</p><p className="text-sm text-muted-foreground">{selected.id} · {card?.set?.name ?? lot?.setId}</p>
            {!lot && <Button variant="ghost" onClick={() => { setSelected(null); setEstimate(''); setValuedOn(''); setConfirmed(false); }}>{t('tcg.custom_collections.search_cards')}</Button>}
          </div>
          {detail.isFetching && <p role="status" className="text-sm text-muted-foreground">{t('tcg.custom_collections.loading')}</p>}
          {(detail.isError || (!detail.isPending && !card)) && <p role="alert" className="text-sm text-destructive">{t('investments.unavailable')} <Button variant="outline" onClick={() => void detail.refetch()}>{t('tcg.custom_collections.retry')}</Button></p>}
          <form className="space-y-5" onSubmit={submit}>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="text-sm font-semibold">{t('investments.variant')}
                <select aria-label={t('investments.variant')} className={investmentSelectClass} value={variant} onChange={(event) => { setVariant(event.target.value as InvestmentVariant); setConfirmed(false); }}>
                  {variants.map((item) => <option key={item} value={item}>{variantLabel(item)}</option>)}
                </select>
              </label>
              <label className="text-sm font-semibold">{t('investments.condition')}
                <select aria-label={t('investments.condition')} className={investmentSelectClass} value={condition} onChange={(event) => { setCondition(event.target.value as InvestmentCondition); setConfirmed(false); }}>
                  {INVESTMENT_CONDITIONS.map((item) => <option key={item} value={item}>{t(`investments.${item === 'unknown' ? 'unknown_condition' : item}`)}</option>)}
                </select>
              </label>
            </div>
            <label className="block text-sm font-semibold">{t('investments.printing')}<Input className="mt-2" value={printing} maxLength={200} required={variant === 'other' || condition === 'graded'} onChange={(event) => { setPrinting(event.target.value); setConfirmed(false); }} /></label>
            {card?.variants_detailed?.length ? <ul className="text-xs text-muted-foreground">{card.variants_detailed.map((entry, index) => <li key={entry.variantId ?? index}>{[entry.type, entry.variantId, entry.foil, ...(Array.isArray(entry.stamp) ? entry.stamp : [entry.stamp])].filter(Boolean).join(' · ')}</li>)}</ul> : null}
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="text-sm font-semibold">{t('investments.quantity')}<Input className="mt-2" type="number" min={1} max={10000} step={1} required value={quantity} onChange={(event) => setQuantity(event.target.value)} /></label>
              <label className="text-sm font-semibold">{t('investments.unit_cost')}<Input className="mt-2" inputMode="decimal" required value={unitCost} onChange={(event) => setUnitCost(event.target.value)} /></label>
              <label className="text-sm font-semibold">{t('investments.fees')}<Input className="mt-2" inputMode="decimal" required value={fees} onChange={(event) => setFees(event.target.value)} /></label>
              <label className="text-sm font-semibold">{t('investments.acquired')}<Input className="mt-2" type="date" value={acquired} onChange={(event) => setAcquired(event.target.value)} /></label>
            </div>
            <p className="text-sm text-muted-foreground">{t('investments.price_note')}</p>
            <div className="space-y-3 rounded-sm border border-border/60 bg-muted/20 p-4">
              <p className="text-sm font-bold">{t('investments.reference')}</p>
              <p className="text-lg font-semibold tabular-nums">{reference ? new Intl.NumberFormat(i18n.language, { style: 'currency', currency: 'EUR' }).format(reference.amount) : t('investments.reference_missing')}</p>
              {reference?.updatedAt && <p className="text-xs text-muted-foreground">{t('investments.valuation_date')}: {reference.updatedAt}</p>}
              <p className="text-xs leading-relaxed text-muted-foreground">{t('investments.reference_note')}</p>
              <Button variant="outline" disabled={detail.isFetching} onClick={() => void detail.refetch()}>{t('investments.refresh')}</Button>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="text-sm font-semibold">{t('investments.valuation')}<Input className="mt-2" inputMode="decimal" value={estimate} onChange={(event) => { setEstimate(event.target.value); setConfirmed(false); if (!event.target.value.trim()) setValuedOn(''); }} /></label>
              <label className="text-sm font-semibold">{t('investments.valuation_date')}<Input className="mt-2" type="date" value={valuedOn} onChange={(event) => setValuedOn(event.target.value)} /></label>
            </div>
            {estimate.trim() && <label className="flex min-h-11 cursor-pointer items-start gap-3 text-sm"><input className="mt-1 size-5 shrink-0 accent-primary" type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} />{t('investments.confirm')}</label>}
            {error && <p role="alert" className="text-sm font-semibold text-destructive">{error}</p>}
            <div className="flex flex-wrap gap-3 border-t border-border/60 pt-4">
              <Button type="submit" disabled={!lot && (!card || detail.isFetching)}>{t('tcg.custom_collections.save')}</Button>
              <Button type="button" variant="outline" onClick={onClose}>{t('tcg.custom_collections.cancel')}</Button>
            </div>
          </form>
        </>}
      </div>
    </SheetContent>
  </Sheet>;
}
