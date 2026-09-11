import {
  calculateSealedCashCents,
  calculateSealedFees,
  calculateSealedGrossCents,
  calculateSealedMarketChangePercent,
  replaySealedLedger,
  selectSealedValuation,
} from './sealed-ledger';
import type {
  SealedCashflowRow,
  SealedPortfolioTotals,
  SealedPositionView,
  SealedPriceSnapshot,
  SealedProduct,
  SealedTransaction,
} from '../types/sealed';

const DAY_MS = 86_400_000;

function ratio(numerator: number, denominator: number): number | null {
  return denominator === 0 ? null : (numerator / denominator) * 100;
}

function dayDate(day: string): Date {
  return new Date(`${day}T00:00:00Z`);
}

function shiftDay(day: string, offset: number): string {
  return new Date(dayDate(day).getTime() + offset * DAY_MS).toISOString().slice(0, 10);
}

function periodEnd(period: string, group: 'day' | 'month' | 'year'): string {
  if (group === 'day') return period;
  if (group === 'year') return `${period}-12-31`;
  const [year, month] = period.split('-').map(Number);
  return new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10);
}

export interface SealedPortfolioSummary {
  positions: SealedPositionView[];
  lots: ReturnType<typeof replaySealedLedger>['lots'];
  sales: ReturnType<typeof replaySealedLedger>['sales'];
  totals: SealedPortfolioTotals;
}

/**
 * Builds a complete portfolio view from the event stream and normalized
 * Cardmarket observations. The function is deterministic and contains no
 * database or UI concerns, so it is also safe to use in import/export tests.
 */
export function summarizeSealedPortfolio(
  transactions: readonly SealedTransaction[],
  products: readonly SealedProduct[],
  prices: readonly SealedPriceSnapshot[],
  asOf: string,
): SealedPortfolioSummary {
  const ledger = replaySealedLedger(transactions, asOf);
  const byProduct = new Map(products.map((product) => [product.cardmarketProductId, product]));
  const history = new Map<number, SealedPriceSnapshot[]>();
  for (const snapshot of prices) {
    const rows = history.get(snapshot.cardmarketProductId) ?? [];
    rows.push(snapshot);
    history.set(snapshot.cardmarketProductId, rows);
  }

  const positions = ledger.positions.map((position) => {
    const product = byProduct.get(position.cardmarketProductId);
    if (!product) throw new Error(`Missing sealed product ${position.cardmarketProductId}.`);
    const rows = history.get(position.cardmarketProductId) ?? [];
    const valuation = selectSealedValuation(rows, asOf);
    const valueCents = position.quantity === 0
      ? 0
      : valuation.priceCents === null
        ? null
        : valuation.priceCents * position.quantity;
    const latentCents = valueCents === null ? null : valueCents - position.costCents;
    return {
      ...position,
      product,
      valuation,
      valueCents,
      latentCents,
      latentRoi: latentCents === null ? null : ratio(latentCents, position.costCents),
      lifetimeRoi: latentCents === null
        ? null
        : ratio(position.realizedCents + latentCents, position.spentCents),
      changes: {
        '1': calculateSealedMarketChangePercent(rows, 1, asOf),
        '7': calculateSealedMarketChangePercent(rows, 7, asOf),
        '30': calculateSealedMarketChangePercent(rows, 30, asOf),
      },
    } satisfies SealedPositionView;
  });

  const sum = <K extends keyof SealedPositionView>(key: K): number => (
    positions.reduce((total, position) => total + Number(position[key]), 0)
  );
  const missingPrices = positions.filter((position) => (
    position.quantity > 0 && position.valueCents === null
  ));
  const knownValueCents = positions.reduce((total, position) => total + (position.valueCents ?? 0), 0);
  const valueCents = missingPrices.length > 0 ? null : knownValueCents;
  const latentCents = valueCents === null ? null : valueCents - sum('costCents');
  const realizedCents = sum('realizedCents');
  const totalCents = latentCents === null ? null : realizedCents + latentCents;
  const sold = sum('sold');
  const holdingDays = sold > 0
    ? ledger.sales.reduce((total, sale) => total + sale.holdingDays * sale.transaction.quantity, 0) / sold
    : null;

  const totals: SealedPortfolioTotals = {
    units: sum('quantity'),
    costCents: sum('costCents'),
    valueCents,
    latentCents,
    realizedCents,
    totalCents,
    spentCents: sum('spentCents'),
    grossSalesCents: sum('grossSalesCents'),
    netSalesCents: sum('netSalesCents'),
    buyFeesCents: sum('buyFeesCents'),
    sellFeesCents: sum('sellFeesCents'),
    bought: sum('bought'),
    sold,
    distinct: positions.filter((position) => position.quantity > 0).length,
    missingPrices: missingPrices.length,
    roi: totalCents === null ? null : ratio(totalCents, sum('spentCents')),
    cashFlowCents: sum('netSalesCents') - sum('spentCents'),
    soldCostCents: sum('spentCents') - sum('costCents'),
    averageEntryCents: sum('bought') > 0 ? sum('spentCents') / sum('bought') : null,
    averageExitCents: sold > 0 ? sum('grossSalesCents') / sold : null,
    holdingDays,
    winningSales: ledger.sales.length > 0
      ? (ledger.sales.filter((sale) => sale.profitCents > 0).length / ledger.sales.length) * 100
      : null,
    losingSales: ledger.sales.length > 0
      ? (ledger.sales.filter((sale) => sale.profitCents < 0).length / ledger.sales.length) * 100
      : null,
    profitPerSoldUnitCents: sold > 0 ? realizedCents / sold : null,
    sellThrough: ratio(sold, sum('bought')),
  };

  return { positions, lots: ledger.lots, sales: ledger.sales, totals };
}

/** Reproduces scelle's period cashflow view, including cumulative balances. */
export function calculateSealedCashflow(
  transactions: readonly SealedTransaction[],
  from: string,
  to: string,
  group: 'day' | 'month' | 'year' = 'month',
): SealedCashflowRow[] {
  const buckets = new Map<string, SealedCashflowRow>();
  let investedCents = 0;
  let recoveredCents = 0;
  const ordered = [...transactions]
    .filter((transaction) => !transaction.voided && transaction.date <= to)
    .sort((a, b) => a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id));

  for (const transaction of ordered) {
    if (transaction.kind === 'buy') investedCents -= calculateSealedCashCents(transaction);
    else recoveredCents += calculateSealedCashCents(transaction);
    if (transaction.date < from) continue;
    const period = transaction.date.slice(0, group === 'day' ? 10 : group === 'month' ? 7 : 4);
    const row = buckets.get(period) ?? {
      period,
      buysCents: 0,
      buyFeesCents: 0,
      discountCents: 0,
      grossSalesCents: 0,
      netSalesCents: 0,
      sellFeesCents: 0,
      netCents: 0,
      investedCents: 0,
      recoveredCents: 0,
      stockCostCents: 0,
    };
    if (transaction.kind === 'buy') {
      row.buysCents += calculateSealedGrossCents(transaction);
      row.buyFeesCents += calculateSealedFees(transaction);
      row.discountCents += transaction.discountCents;
    } else {
      row.grossSalesCents += calculateSealedGrossCents(transaction);
      row.netSalesCents += calculateSealedCashCents(transaction);
      row.sellFeesCents += calculateSealedFees(transaction);
    }
    row.netCents += calculateSealedCashCents(transaction);
    row.investedCents = investedCents;
    row.recoveredCents = recoveredCents;
    buckets.set(period, row);
  }

  for (const row of buckets.values()) {
    const end = periodEnd(row.period, group);
    row.stockCostCents = replaySealedLedger(transactions, end < to ? end : to).positions
      .reduce((total, position) => total + position.costCents, 0);
  }
  return [...buckets.values()];
}

export function sealedHistoryDays(
  prices: readonly SealedPriceSnapshot[],
  from: string,
  to: string,
): string[] {
  return [...new Set(prices.map((snapshot) => snapshot.day))]
    .filter((day) => day >= from && day <= to)
    .sort();
}

export function sealedRecentDays(asOf: string, offsets: readonly number[] = [1, 7, 30]): string[] {
  return offsets.map((offset) => shiftDay(asOf, -offset));
}
