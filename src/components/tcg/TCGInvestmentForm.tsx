'use client';

import { useEffect, useEffectEvent, useId, useRef, useState, type FormEvent } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { INVESTMENT_CONDITIONS, INVESTMENT_VARIANTS, type InvestmentCondition, type InvestmentVariant, type TCGInvestment } from '@primedex/core/lib/tcg-investments';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/lib/i18n';
import { getTCGCard } from '@/lib/api/tcg';
import { TCG_CARD_LANGUAGES, getTCGCardLanguageName, type TCGCardLanguage } from '@/lib/tcg-language';
import { getInvestmentMarketReference } from '@/lib/tcg-investments';
import { createInvestmentDraft, getDefaultInvestmentVariant, validateInvestmentDraft, type InvestmentDraft, type InvestmentErrors, type InvestmentField } from '@/lib/tcg-investment-form';
import { saveTCGInvestmentConfirmed } from '@/lib/tcg-investment-save';
import { useAuth } from '@/lib/neon/AuthProvider';
import type { TCGCard } from '@/types/tcg';
import { TCGInvestmentCardPicker } from './TCGInvestmentCardPicker';

export const investmentSelectClass = 'mt-2 min-h-11 w-full min-w-0 rounded-sm border border-border bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary';

interface InvestmentFormProps {
  lot?: TCGInvestment;
  initialCard?: TCGCard;
  language: TCGCardLanguage;
  onClose: () => void;
  onSaved: () => void;
}

export function TCGInvestmentForm({ lot, initialCard, language, onClose, onSaved }: InvestmentFormProps) {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const [accountId] = useState(user?.id);
  const queryClient = useQueryClient();
  const id = useId();
  const formRef = useRef<HTMLFormElement>(null);
  const [baseline] = useState(() => createInvestmentDraft(language, lot));
  const [draft, setDraft] = useState(baseline);
  const creationId = useRef<string | null>(null);
  const [selected, setSelected] = useState<TCGCard | null>(initialCard ?? (lot ? { id: lot.cardId, name: lot.cardName, localId: lot.cardId.split('-').at(-1)!, set: { id: lot.setId, name: lot.setId } } : null));
  const [errors, setErrors] = useState<InvestmentErrors>({});
  const [saveError, setSaveError] = useState('');
  const [pending, setPending] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState(false);
  const [advanced, setAdvanced] = useState(!!(lot?.feesCents || lot?.acquiredOn));
  const dirty = JSON.stringify(draft) !== JSON.stringify(baseline) || (!initialCard && !lot && !!selected);
  const detailKey = ['tcg', 'investment-detail-strict', draft.language, selected?.id];
  const detail = useQuery({
    queryKey: detailKey,
    queryFn: ({ signal }) => getTCGCard(selected!.id, draft.language, signal, { allowEnglishFallback: false, requirePricing: true }),
    enabled: !!selected,
    retry: false,
  });
  const card = detail.data?.id === selected?.id ? detail.data : selected;
  const variant = draft.variant || getDefaultInvestmentVariant(card);
  const variants = INVESTMENT_VARIANTS.filter((item) => item === 'other' || item === lot?.variant || card?.variants?.[item]);
  const marketReference = card && variant ? getInvestmentMarketReference(card, variant, draft.printing) : null;
  const reference = marketReference?.quote ?? null;
  const needsPrinting = variant === 'other' || draft.condition === 'graded';
  const variantLabel = (item: InvestmentVariant) => t(['normal', 'holo', 'reverse'].includes(item) ? `tcg.collection_variant_${item}` : `investments.${item}`);
  const fieldId = (field: InvestmentField) => `${id}-${field}`;
  const fieldLabels: Record<InvestmentField, string> = { language: 'tcg.card_language', variant: 'investments.variant', printing: 'investments.printing', condition: 'investments.condition', quantity: 'investments.quantity', unitCost: 'investments.unit_cost', fees: 'investments.fees', acquired: 'investments.acquired', estimate: 'investments.valuation', valuedOn: 'investments.valuation_date', confirmed: 'investments.confirm' };
  const errorProps = (field: InvestmentField) => ({ 'aria-label': t(fieldLabels[field]), id: fieldId(field), name: field, 'aria-invalid': !!errors[field], 'aria-describedby': errors[field] ? `${fieldId(field)}-error` : undefined });
  const feedback = (field: InvestmentField) => errors[field] ? <p id={`${fieldId(field)}-error`} className="mt-1 text-sm font-normal text-destructive">{t(`investments.error_${errors[field]}`)}</p> : null;
  const change = <K extends InvestmentField>(field: K, value: InvestmentDraft[K], reconfirm = false) => {
    setDraft((current) => ({ ...current, [field]: value, ...(reconfirm ? { confirmed: false } : {}), ...(field === 'estimate' && !String(value).trim() ? { valuedOn: '' } : {}) }));
    setErrors((current) => ({ ...current, [field]: undefined }));
    setSaveError('');
  };
  const close = () => {
    if (pending) return;
    if (!dirty || window.confirm(t('investments.discard_confirm'))) onClose();
  };
  useEffect(() => {
    if (!dirty) return;
    const beforeUnload = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', beforeUnload);
    return () => window.removeEventListener('beforeunload', beforeUnload);
  }, [dirty]);
  useEffect(() => {
    if (user?.id !== accountId) onClose();
  }, [accountId, onClose, user?.id]);
  const leaveHistory = useEffectEvent(() => {
    if (pending || (dirty && !window.confirm(t('investments.discard_confirm')))) return false;
    onClose();
    return true;
  });
  useEffect(() => {
    let active = true;
    let installed = false;
    let popped = false;
    const marker = 'primedexInvestmentDialog';
    const baseUrl = window.location.href;
    const baseState = window.history.state;
    const onPopState = (event: PopStateEvent) => {
      if (window.history.state?.[marker] === id) return;
      const changedRoute = window.location.href !== baseUrl;
      if (leaveHistory()) {
        popped = true;
        // A multi-entry traversal has already reached another route. Let Next
        // restore that destination rather than swallowing its popstate event.
        if (!changedRoute) event.stopImmediatePropagation();
      } else {
        event.stopImmediatePropagation();
        if (changedRoute) {
          window.history.pushState(baseState, '', baseUrl);
          window.history.pushState({ ...baseState, [marker]: id }, '', baseUrl);
        } else window.history.forward();
      }
    };
    // Defer installation so development StrictMode's discarded effect does not
    // add a second history entry. Back closes this sheet before its parent route.
    queueMicrotask(() => {
      if (!active) return;
      window.history.pushState({ ...window.history.state, [marker]: id }, '', window.location.href);
      window.addEventListener('popstate', onPopState, true);
      installed = true;
    });
    return () => {
      active = false;
      window.removeEventListener('popstate', onPopState, true);
      if (installed && !popped && window.history.state?.[marker] === id) window.history.back();
    };
  }, [id]);
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (pending || !card) return;
    setSaveError('');
    const result = validateInvestmentDraft({ ...draft, variant }, card, lot);
    setErrors(result.errors);
    if (!result.input) {
      if (result.errors.fees || result.errors.acquired) setAdvanced(true);
      requestAnimationFrame(() => {
        const field = Object.keys(result.errors)[0];
        if (field) formRef.current?.querySelector<HTMLElement>(`[name="${field}"]`)?.focus();
      });
      return;
    }
    setPending(true);
    try {
      if (!lot) creationId.current ??= crypto.randomUUID();
      const saved = await saveTCGInvestmentConfirmed(result.input, lot?.id, creationId.current ?? undefined);
      if (saved.ok) { onSaved(); return; }
      setSaveError(t(saved.reason === 'too-large' ? 'tcg.custom_collections.document_too_large' : 'investments.save_failed'));
    } catch {
      setSaveError(t('investments.save_failed'));
    } finally {
      setPending(false);
    }
  };
  const refresh = async () => {
    if (!selected || refreshing) return;
    setRefreshing(true); setRefreshError(false);
    try {
      const fresh = await getTCGCard(selected.id, draft.language, undefined, { allowEnglishFallback: false, requirePricing: true, forceRefresh: true });
      queryClient.setQueryData(detailKey, fresh);
      if (!fresh) setRefreshError(true);
    } catch { setRefreshError(true); }
    finally { setRefreshing(false); }
  };
  const chooseCard = (next: TCGCard) => {
    setSelected(next); setErrors({}); setRefreshError(false);
    setDraft((current) => ({ ...current, variant: getDefaultInvestmentVariant(next), printing: '', estimate: '', valuedOn: '', confirmed: false }));
  };
  const referenceDate = reference?.updatedAt ? new Date(reference.updatedAt) : null;
  const formattedDate = referenceDate && Number.isFinite(referenceDate.getTime()) ? new Intl.DateTimeFormat(i18n.language, { dateStyle: 'medium', timeStyle: 'short' }).format(referenceDate) : null;
  const referenceState = !variant ? 'choose_finish' : detail.isFetching && !reference ? 'reference_loading' : detail.isError && !reference ? 'reference_error' : draft.printing.trim() || !['normal', 'holo', 'reverse'].includes(variant) ? 'reference_special' : !card?.pricing?.cardmarket && !card?.variants_detailed?.some((entry) => entry.pricing?.cardmarket) ? 'reference_source_missing' : 'reference_missing';
  const printingLabels = [...new Set(card?.variants_detailed?.map((entry) => [entry.subtype, ...(Array.isArray(entry.stamp) ? entry.stamp : [entry.stamp]), entry.foil].filter(Boolean).join(' · ')).filter(Boolean) ?? [])];
  if (user?.id !== accountId) return null;
  return <Sheet open onOpenChange={(open) => { if (!open) close(); }}>
    <SheetContent side="right" overlayClassName="z-[400]" className="z-[401] data-[side=right]:w-full data-[side=right]:sm:max-w-2xl gap-0 overflow-hidden p-0">
      <SheetHeader className="shrink-0 border-b border-border/60 pr-14"><SheetTitle>{t(lot ? 'investments.edit' : 'investments.add')}</SheetTitle></SheetHeader>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6">
        <label className="mb-5 block text-sm font-semibold">{t('tcg.card_language')}
          <select aria-label={t('tcg.card_language')} className={investmentSelectClass} value={draft.language} disabled={!!lot || pending} onChange={(event) => { change('language', event.target.value as TCGCardLanguage, true); setSelected(null); }}>
            {TCG_CARD_LANGUAGES.map((lang) => <option key={lang} value={lang}>{getTCGCardLanguageName(lang, i18n.language)}</option>)}
          </select>
        </label>
        {!selected ? <TCGInvestmentCardPicker key={draft.language} language={draft.language} onSelect={chooseCard} /> : <>
          <div className="mb-5 flex flex-wrap items-center justify-between gap-2 rounded-sm border border-border/60 bg-muted/30 p-3">
            <div><p className="font-bold">{card?.name}</p><p className="text-sm text-muted-foreground">{selected.id} · {card?.set?.name ?? lot?.setId}</p></div>
            {!lot && <Button variant="ghost" disabled={pending} onClick={() => { setSelected(null); setErrors({}); }}>{t('tcg.custom_collections.search_cards')}</Button>}
          </div>
          {(detail.isError || (!detail.isPending && !detail.data)) && <p role="status" className="mb-4 text-sm text-muted-foreground">{t('investments.detail_optional')} <Button variant="outline" disabled={detail.isFetching} onClick={() => void detail.refetch()}>{t('tcg.custom_collections.retry')}</Button></p>}
          <form ref={formRef} id={`${id}-form`} noValidate onSubmit={submit} aria-busy={pending} className="space-y-5">
            <fieldset disabled={pending} className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="text-sm font-semibold">{t('investments.variant')}
                  <select {...errorProps('variant')} aria-label={t('investments.variant')} className={investmentSelectClass} value={variant} onChange={(event) => change('variant', event.target.value as InvestmentVariant | '', true)}>
                    <option value="">{t('investments.choose_finish')}</option>
                    {variants.map((item) => <option key={item} value={item}>{variantLabel(item)}</option>)}
                  </select>{feedback('variant')}
                </label>
                <label className="text-sm font-semibold">{t('investments.condition')}
                  <select {...errorProps('condition')} aria-label={t('investments.condition')} className={investmentSelectClass} value={draft.condition} onChange={(event) => change('condition', event.target.value as InvestmentCondition, true)}>
                    {INVESTMENT_CONDITIONS.map((item) => <option key={item} value={item}>{t(`investments.${item === 'unknown' ? 'unknown_condition' : item}`)}</option>)}
                  </select>
                </label>
              </div>
              {(needsPrinting || draft.printing) && <label className="block text-sm font-semibold">{t('investments.printing')}<Input {...errorProps('printing')} className="mt-2" value={draft.printing} maxLength={200} autoComplete="off" onChange={(event) => change('printing', event.target.value, true)} />{feedback('printing')}</label>}
              {printingLabels.length > 0 && <p className="text-xs text-muted-foreground">{t('investments.known_editions')}: {printingLabels.join(' / ')}</p>}
              <div className="grid grid-cols-2 gap-4">
                <label className="text-sm font-semibold">{t('investments.quantity')}<Input {...errorProps('quantity')} className="mt-2" type="number" min={1} max={10000} step={1} value={draft.quantity} onChange={(event) => change('quantity', event.target.value)} />{feedback('quantity')}</label>
                <label className="text-sm font-semibold">{t('investments.unit_cost')}<Input {...errorProps('unitCost')} className="mt-2" inputMode="decimal" autoComplete="off" value={draft.unitCost} onChange={(event) => change('unitCost', event.target.value)} />{feedback('unitCost')}</label>
              </div>
              <details data-testid="investment-extra-details" open={advanced} onToggle={(event) => setAdvanced(event.currentTarget.open)} className="rounded-sm border border-border/60 p-3">
                <summary className="min-h-11 cursor-pointer content-center text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">{t('investments.more_details')}</summary>
                <div className="mt-3 grid gap-4 sm:grid-cols-2">
                  <label className="text-sm font-semibold">{t('investments.fees')}<Input {...errorProps('fees')} className="mt-2" inputMode="decimal" autoComplete="off" value={draft.fees} onChange={(event) => change('fees', event.target.value)} />{feedback('fees')}</label>
                  <label className="text-sm font-semibold">{t('investments.acquired')}<Input {...errorProps('acquired')} className="mt-2" type="date" value={draft.acquired} onChange={(event) => change('acquired', event.target.value)} />{feedback('acquired')}</label>
                </div>
              </details>
              <section aria-label={t('investments.reference')} className="space-y-2 rounded-sm border border-border/60 bg-muted/20 p-3">
                <p className="text-sm font-bold">{t('investments.reference')}{reference ? ` · ${reference.provider === 'cardmarket' ? 'Cardmarket' : 'TCGplayer'}` : ''}</p>
                <p role="status" className="text-base font-semibold tabular-nums">{reference ? new Intl.NumberFormat(i18n.language, { style: 'currency', currency: 'EUR' }).format(reference.amount) : t(`investments.${referenceState}`)}</p>
                {formattedDate && <p className="text-xs text-muted-foreground">{t('investments.reference_date')}: {formattedDate}</p>}
                {marketReference && !marketReference.matchesFinish && <p className="text-xs text-muted-foreground">{t('tcg.collection_variant_' + marketReference.variant)} · {t('investments.reference_special')}</p>}
                <details className="text-xs text-muted-foreground"><summary className="min-h-11 cursor-pointer content-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">{t('investments.reference_limits')}</summary><p className="pb-2 leading-relaxed">{t('investments.reference_note')}</p></details>
                {refreshError && <p role="alert" className="text-sm text-destructive">{t('investments.reference_error')}</p>}
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="outline" disabled={refreshing || detail.isFetching} onClick={() => void refresh()}>{t(refreshing ? 'investments.reference_loading' : 'investments.refresh')}</Button>
                  {reference && marketReference?.matchesFinish && <Button type="button" variant="outline" onClick={() => change('estimate', reference.amount.toFixed(2), true)}>{t('investments.use_reference')}</Button>}
                </div>
              </section>
              <p className="text-sm text-muted-foreground">{t('investments.price_note')}</p>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="text-sm font-semibold">{t('investments.valuation')}<Input {...errorProps('estimate')} className="mt-2" inputMode="decimal" autoComplete="off" value={draft.estimate} onChange={(event) => change('estimate', event.target.value, true)} />{feedback('estimate')}</label>
                {draft.estimate.trim() && <label className="text-sm font-semibold">{t('investments.valuation_date')}<Input {...errorProps('valuedOn')} className="mt-2" type="date" value={draft.valuedOn} onChange={(event) => change('valuedOn', event.target.value)} />{feedback('valuedOn')}</label>}
              </div>
              {draft.estimate.trim() && <div><label className="flex min-h-11 cursor-pointer items-start gap-3 text-sm"><input {...errorProps('confirmed')} className="mt-1 size-5 shrink-0 accent-primary" type="checkbox" checked={draft.confirmed} onChange={(event) => change('confirmed', event.target.checked)} />{t('investments.confirm')}</label>{feedback('confirmed')}</div>}
            </fieldset>
            {saveError && <p role="alert" className="text-sm font-semibold text-destructive">{saveError}</p>}
          </form>
        </>}
      </div>
      {selected && <div className="flex shrink-0 flex-wrap gap-3 border-t border-border/60 bg-card p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <Button type="submit" form={`${id}-form`} disabled={pending}>{t(pending ? 'investments.saving' : 'tcg.custom_collections.save')}</Button>
        <Button type="button" variant="outline" disabled={pending} onClick={close}>{t('tcg.custom_collections.cancel')}</Button>
        <p role="status" className="w-full text-sm text-muted-foreground">{pending ? t('investments.saving_note') : ''}</p>
      </div>}
    </SheetContent>
  </Sheet>;
}
