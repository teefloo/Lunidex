import type { TCGCard } from '@/types/tcg';
import type { TCGCardLanguage } from '@/lib/tcg-language';

export const TCG_ILLUSTRATOR_PAGE_SIZE = 24;

export function buildTCGIllustratorPath(
  identity: string,
  language: TCGCardLanguage,
  page = 1,
): string {
  const normalizedIdentity = normalizeTCGIllustratorIdentity(identity);
  const path = `/tcg/illustrators/${encodeURIComponent(normalizedIdentity)}`;
  const params = new URLSearchParams();
  if (language !== 'en') params.set('tcgLang', language);
  if (page > 1) params.set('page', String(Math.floor(page)));
  const query = params.toString();
  return query ? `${path}?${query}` : path;
}

export function parseTCGIllustratorPage(value: string | string[] | undefined): number | null {
  if (value === undefined) return 1;
  if (typeof value !== 'string' || !/^[1-9]\d{0,2}$/.test(value)) return null;
  const page = Number(value);
  return Number.isSafeInteger(page) ? page : null;
}

const UNKNOWN_ILLUSTRATOR_CREDITS = new Set([
  'n/a',
  'na',
  'unknown',
  'none',
  'not available',
  'not applicable',
]);

export function normalizeTCGIllustratorIdentity(value: string): string {
  return value.normalize('NFC').trim().replace(/\s+/gu, ' ').toLowerCase().normalize('NFC');
}

export function isTCGIllustratorCredit(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const normalized = normalizeTCGIllustratorIdentity(value);
  return normalized.length > 0 && !UNKNOWN_ILLUSTRATOR_CREDITS.has(normalized);
}

export function getTCGIllustratorAliases(names: readonly string[], identity: string): string[] {
  const normalizedIdentity = normalizeTCGIllustratorIdentity(identity);
  return [...new Set(names.filter((name) =>
    isTCGIllustratorCredit(name) && normalizeTCGIllustratorIdentity(name) === normalizedIdentity,
  ))].sort(compareStrings);
}

export function mergeTCGIllustratorCards(groups: readonly (readonly TCGCard[])[]): TCGCard[] {
  const cardsById = new Map<string, TCGCard>();
  for (const group of groups) {
    for (const card of group) {
      if (!cardsById.has(card.id)) cardsById.set(card.id, card);
    }
  }
  return [...cardsById.values()].sort((left, right) => compareStrings(left.id, right.id));
}

export function paginateTCGIllustratorCards(
  cards: readonly TCGCard[],
  page: number,
  pageSize = TCG_ILLUSTRATOR_PAGE_SIZE,
): { cards: TCGCard[]; total: number; pageCount: number } {
  const safePage = Number.isFinite(page) && page >= 1 ? Math.floor(page) : 1;
  const safePageSize = Number.isFinite(pageSize) && pageSize >= 1 ? Math.floor(pageSize) : TCG_ILLUSTRATOR_PAGE_SIZE;
  const orderedCards = mergeTCGIllustratorCards([cards]);
  return {
    cards: orderedCards.slice((safePage - 1) * safePageSize, safePage * safePageSize),
    total: orderedCards.length,
    pageCount: Math.ceil(orderedCards.length / safePageSize),
  };
}

function compareStrings(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}
