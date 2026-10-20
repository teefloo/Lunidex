import { normalizeTCGCardLanguage, type TCGCardLanguage } from './tcg-language';

export const INVESTMENT_VARIANTS = ['normal', 'holo', 'reverse', 'firstEdition', 'wPromo', 'other'] as const;
export const INVESTMENT_CONDITIONS = ['nm', 'ex', 'gd', 'lp', 'pl', 'poor', 'graded', 'unknown'] as const;
export const MAX_TCG_INVESTMENTS = 1000;
export type InvestmentVariant = (typeof INVESTMENT_VARIANTS)[number];
export type InvestmentCondition = (typeof INVESTMENT_CONDITIONS)[number];

/** One acquisition lot. All money is EUR integer cents; fees cover the whole lot. */
export interface TCGInvestment {
  id: string;
  cardId: string;
  cardName: string;
  setId: string;
  language: TCGCardLanguage;
  variant: InvestmentVariant;
  printing: string;
  condition: InvestmentCondition;
  quantity: number;
  unitCostCents: number;
  feesCents: number;
  acquiredOn: string | null;
  /** User-confirmed estimate for this printing, language and condition. Never an automatic quote. */
  valuation: { unitPriceCents: number; valuedOn: string | null } | null;
  createdAt: string;
  updatedAt: string;
}

const record = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);
const money = (value: unknown): value is number => typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 && value <= 100_000_000;
const text = (value: unknown, max: number): value is string => typeof value === 'string' && value.trim().length > 0 && value.length <= max;
const date = (value: unknown): value is string | null => value === null || (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value);
const timestamp = (value: unknown): value is string => typeof value === 'string' && value.length <= 40 && /^\d{4}-\d{2}-\d{2}T/.test(value) && Number.isFinite(Date.parse(value));

export function normalizeTCGInvestment(value: unknown): TCGInvestment | null {
  if (!record(value)) return null;
  if (!text(value.id, 36) || !/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i.test(value.id)) return null;
  if (!text(value.cardId, 128) || !/^[a-z0-9][a-z0-9._:-]*-[a-z0-9][a-z0-9._:-]*$/i.test(value.cardId)) return null;
  if (!text(value.cardName, 200) || !text(value.setId, 128) || !value.cardId.startsWith(`${value.setId}-`)) return null;
  const language = normalizeTCGCardLanguage(value.language);
  if (!language || language !== value.language) return null;
  if (!INVESTMENT_VARIANTS.includes(value.variant as InvestmentVariant) || !INVESTMENT_CONDITIONS.includes(value.condition as InvestmentCondition)) return null;
  if (typeof value.printing !== 'string' || value.printing.length > 200 || ((value.variant === 'other' || value.condition === 'graded') && !value.printing.trim())) return null;
  if (typeof value.quantity !== 'number' || !Number.isSafeInteger(value.quantity) || value.quantity < 1 || value.quantity > 10000) return null;
  if (!money(value.unitCostCents) || !money(value.feesCents) || !date(value.acquiredOn) || !timestamp(value.createdAt) || !timestamp(value.updatedAt)) return null;
  let valuation: TCGInvestment['valuation'] = null;
  if (value.valuation !== null) {
    if (!record(value.valuation) || !money(value.valuation.unitPriceCents) || !date(value.valuation.valuedOn)) return null;
    valuation = { unitPriceCents: value.valuation.unitPriceCents, valuedOn: value.valuation.valuedOn };
  }
  return {
    id: value.id, cardId: value.cardId, cardName: value.cardName.trim(), setId: value.setId, language,
    variant: value.variant as InvestmentVariant, printing: value.printing.trim(), condition: value.condition as InvestmentCondition,
    quantity: value.quantity, unitCostCents: value.unitCostCents, feesCents: value.feesCents,
    acquiredOn: value.acquiredOn, valuation, createdAt: value.createdAt, updatedAt: value.updatedAt,
  };
}

export function normalizeTCGInvestments(value: unknown, maxEntries = MAX_TCG_INVESTMENTS): TCGInvestment[] | null {
  if (!Array.isArray(value) || value.length > maxEntries) return null;
  const lots: TCGInvestment[] = [];
  const ids = new Set<string>();
  for (const entry of value) {
    const lot = normalizeTCGInvestment(entry);
    if (!lot || ids.has(lot.id)) return null;
    lots.push(lot);
    ids.add(lot.id);
  }
  return lots;
}

export function valueTCGInvestment(lot: TCGInvestment) {
  const investedCents = lot.unitCostCents * lot.quantity + lot.feesCents;
  const valueCents = lot.valuation === null ? null : lot.valuation.unitPriceCents * lot.quantity;
  const gainCents = valueCents === null ? null : valueCents - investedCents;
  return { investedCents, valueCents, gainCents, returnPercent: gainCents === null || investedCents === 0 ? null : gainCents / investedCents * 100 };
}

export function summarizeTCGInvestments(lots: readonly TCGInvestment[]) {
  let investedCents = 0, valuedCostCents = 0, knownValueCents = 0, quantity = 0, unvaluedQuantity = 0, valuedLots = 0;
  for (const lot of lots) {
    const value = valueTCGInvestment(lot);
    quantity += lot.quantity;
    investedCents += value.investedCents;
    if (value.valueCents === null) unvaluedQuantity += lot.quantity;
    else { valuedCostCents += value.investedCents; knownValueCents += value.valueCents; valuedLots += 1; }
  }
  const valueCents = valuedLots > 0 ? knownValueCents : null;
  const gainCents = valueCents === null ? null : valueCents - valuedCostCents;
  return {
    investedCents, valuedCostCents, valueCents, gainCents, quantity, unvaluedQuantity,
    unvaluedCostCents: investedCents - valuedCostCents,
    returnPercent: gainCents === null || valuedCostCents === 0 ? null : gainCents / valuedCostCents * 100,
  };
}
