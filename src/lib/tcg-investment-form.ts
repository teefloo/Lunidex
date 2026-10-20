import type { InvestmentCondition, InvestmentVariant, TCGInvestment } from '@primedex/core/lib/tcg-investments';
import type { TCGCardLanguage } from '@/lib/tcg-language';
import type { TCGCard } from '@/types/tcg';
import { parseEuroCents } from './tcg-investments';

export interface InvestmentDraft {
  language: TCGCardLanguage;
  variant: InvestmentVariant | '';
  printing: string;
  condition: InvestmentCondition;
  quantity: string;
  unitCost: string;
  fees: string;
  acquired: string;
  estimate: string;
  valuedOn: string;
  confirmed: boolean;
}

export type InvestmentField = keyof InvestmentDraft;
export type InvestmentFieldError = 'amount' | 'quantity' | 'date' | 'confirm' | 'printing' | 'variant';
export type InvestmentErrors = Partial<Record<InvestmentField, InvestmentFieldError>>;
export type InvestmentInput = Omit<TCGInvestment, 'id' | 'createdAt' | 'updatedAt'>;

export function getDefaultInvestmentVariant(card: TCGCard | null | undefined): InvestmentVariant | '' {
  const standards = (['normal', 'holo', 'reverse'] as const).filter((variant) => card?.variants?.[variant]);
  return standards.length === 1 ? standards[0] : '';
}

export function createInvestmentDraft(language: TCGCardLanguage, lot?: TCGInvestment): InvestmentDraft {
  return {
    language: lot?.language ?? language, variant: lot?.variant ?? '', printing: lot?.printing ?? '', condition: lot?.condition ?? 'unknown',
    quantity: String(lot?.quantity ?? 1), unitCost: lot ? (lot.unitCostCents / 100).toFixed(2) : '', fees: lot ? (lot.feesCents / 100).toFixed(2) : '0',
    acquired: lot?.acquiredOn ?? '', estimate: lot?.valuation ? (lot.valuation.unitPriceCents / 100).toFixed(2) : '', valuedOn: lot?.valuation?.valuedOn ?? '', confirmed: !!lot?.valuation,
  };
}

function isDate(value: string): boolean {
  if (!value) return true;
  const date = new Date(`${value}T00:00:00Z`);
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function validateInvestmentDraft(draft: InvestmentDraft, card: TCGCard, lot?: TCGInvestment): { input: InvestmentInput | null; errors: InvestmentErrors } {
  const errors: InvestmentErrors = {};
  const variant = draft.variant || getDefaultInvestmentVariant(card);
  const unitCostCents = parseEuroCents(draft.unitCost);
  const feesCents = parseEuroCents(draft.fees);
  const hasEstimate = !!draft.estimate.trim();
  const unitPriceCents = hasEstimate ? parseEuroCents(draft.estimate) : null;
  if (!variant || (variant !== 'other' && !card.variants?.[variant] && variant !== lot?.variant)) errors.variant = 'variant';
  if ((variant === 'other' || draft.condition === 'graded') && !draft.printing.trim()) errors.printing = 'printing';
  if (!/^\d+$/.test(draft.quantity) || Number(draft.quantity) < 1 || Number(draft.quantity) > 10000) errors.quantity = 'quantity';
  if (unitCostCents === null) errors.unitCost = 'amount';
  if (feesCents === null) errors.fees = 'amount';
  if (hasEstimate && unitPriceCents === null) errors.estimate = 'amount';
  if (hasEstimate && !draft.confirmed) errors.confirmed = 'confirm';
  if (!isDate(draft.acquired)) errors.acquired = 'date';
  if (!isDate(draft.valuedOn) || (!hasEstimate && draft.valuedOn)) errors.valuedOn = 'date';
  if (Object.keys(errors).length || !variant || unitCostCents === null || feesCents === null) return { input: null, errors };
  return { errors, input: {
    cardId: card.id, cardName: card.name, setId: card.set?.id ?? lot?.setId ?? card.id.slice(0, card.id.lastIndexOf('-')),
    language: draft.language, variant, printing: draft.printing.trim(), condition: draft.condition, quantity: Number(draft.quantity), unitCostCents, feesCents,
    acquiredOn: draft.acquired || null, valuation: unitPriceCents === null ? null : { unitPriceCents, valuedOn: draft.valuedOn || null },
  } };
}
