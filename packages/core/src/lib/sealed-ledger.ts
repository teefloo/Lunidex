import {
  SEALED_PRODUCT_LANGUAGES,
  type SealedAllocation,
  type SealedAllocationMethod,
  type SealedLedgerResult,
  type SealedLot,
  type SealedPriceMetric,
  type SealedPriceSnapshot,
  type SealedProductLanguage,
  type SealedSale,
  type SealedTransaction,
  type SealedTransactionDraft,
  type SealedValuation,
} from '../types/sealed';

const MAX_MONEY_CENTS = 10_000_000_000_000;
const MAX_QUANTITY = 1_000_000;
const MAX_TEXT_LENGTH = 512;
const DAY_MS = 86_400_000;
const FALLBACK_METRICS: readonly SealedPriceMetric[] = ['avg1', 'avg7', 'trend', 'avg30', 'low'];
const LANGUAGE_SET = new Set<string>(SEALED_PRODUCT_LANGUAGES);

export class SealedDomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SealedDomainError';
  }
}

function assertInteger(value: number, field: string, minimum = 0, maximum = MAX_MONEY_CENTS): void {
  if (!Number.isSafeInteger(value) || value < minimum || value > maximum) {
    throw new SealedDomainError(`${field} must be a safe integer between ${minimum} and ${maximum}.`);
  }
}

function assertText(value: string, field: string, maximum = MAX_TEXT_LENGTH): void {
  if (typeof value !== 'string' || value.length > maximum) {
    throw new SealedDomainError(`${field} is invalid.`);
  }
}

export function isSealedProductLanguage(value: unknown): value is SealedProductLanguage {
  return typeof value === 'string' && LANGUAGE_SET.has(value);
}

export function isSealedDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = Date.parse(`${value}T00:00:00Z`);
  return Number.isFinite(parsed) && new Date(parsed).toISOString().slice(0, 10) === value;
}

export function utcToday(now = new Date()): string {
  return now.toISOString().slice(0, 10);
}

function dateFromDay(day: string): Date {
  return new Date(`${day}T00:00:00Z`);
}

function shiftDay(day: string, offset: number): string {
  return new Date(dateFromDay(day).getTime() + offset * DAY_MS).toISOString().slice(0, 10);
}

function dayDifference(from: string, to: string): number {
  return Math.round((dateFromDay(to).getTime() - dateFromDay(from).getTime()) / DAY_MS);
}

function isFiniteNonNegative(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

function ensureDraftShape(input: unknown): SealedTransactionDraft {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new SealedDomainError('Transaction payload is invalid.');
  }

  const value = input as Partial<SealedTransactionDraft>;
  const draft: SealedTransactionDraft = {
    kind: value.kind as SealedTransactionDraft['kind'],
    cardmarketProductId: value.cardmarketProductId as number,
    language: value.language as SealedProductLanguage,
    date: value.date as string,
    quantity: value.quantity as number,
    unitPriceCents: value.unitPriceCents as number,
    feesCents: value.feesCents as number,
    shippingCents: value.shippingCents as number,
    discountCents: value.discountCents as number,
    paymentFeesCents: value.paymentFeesCents as number,
    otherCostsCents: value.otherCostsCents as number,
    platform: value.platform as string,
    counterparty: value.counterparty as string,
    notes: value.notes as string,
    storage: value.storage as string,
    allocationMethod: value.allocationMethod as SealedAllocationMethod,
    selections: Array.isArray(value.selections) ? value.selections.map((selection) => ({
      lotId: typeof selection?.lotId === 'string' ? selection.lotId : '',
      quantity: typeof selection?.quantity === 'number' ? selection.quantity : Number.NaN,
    })) : [],
  };

  return draft;
}

/** Validates a transaction before it enters the replay or database layer. */
export function validateSealedTransactionDraft(
  input: unknown,
  now = new Date(),
): SealedTransactionDraft {
  const transaction = ensureDraftShape(input);

  if (transaction.kind !== 'buy' && transaction.kind !== 'sell') {
    throw new SealedDomainError('Transaction kind is invalid.');
  }
  if (!Number.isSafeInteger(transaction.cardmarketProductId) || transaction.cardmarketProductId <= 0) {
    throw new SealedDomainError('Cardmarket product id is invalid.');
  }
  if (!isSealedProductLanguage(transaction.language)) {
    throw new SealedDomainError('Product language is invalid.');
  }
  if (!isSealedDate(transaction.date) || transaction.date > utcToday(now)) {
    throw new SealedDomainError('Future or invalid transaction dates are not accepted.');
  }
  assertInteger(transaction.quantity, 'quantity', 1, MAX_QUANTITY);
  assertInteger(transaction.unitPriceCents, 'unitPriceCents');
  assertInteger(transaction.feesCents, 'feesCents');
  assertInteger(transaction.shippingCents, 'shippingCents');
  assertInteger(transaction.discountCents, 'discountCents');
  assertInteger(transaction.paymentFeesCents, 'paymentFeesCents');
  assertInteger(transaction.otherCostsCents, 'otherCostsCents');
  assertText(transaction.platform, 'platform');
  assertText(transaction.counterparty, 'counterparty');
  assertText(transaction.notes, 'notes', 4_000);
  assertText(transaction.storage, 'storage');

  if (transaction.allocationMethod !== 'fifo' && transaction.allocationMethod !== 'manual') {
    throw new SealedDomainError('Allocation method is invalid.');
  }
  if (!Array.isArray(transaction.selections) || transaction.selections.length > 1_000) {
    throw new SealedDomainError('Lot selections are invalid.');
  }
  for (const selection of transaction.selections) {
    assertText(selection.lotId, 'lotId', 128);
    assertInteger(selection.quantity, 'selection quantity', 1, MAX_QUANTITY);
  }

  const grossCents = calculateSealedGrossCents(transaction);
  if (!Number.isSafeInteger(grossCents) || grossCents > MAX_MONEY_CENTS) {
    throw new SealedDomainError('Transaction amount is too high.');
  }

  if (transaction.kind === 'buy') {
    if (
      transaction.paymentFeesCents !== 0
      || transaction.otherCostsCents !== 0
      || transaction.selections.length > 0
    ) {
      throw new SealedDomainError('Payment fees, other costs and allocations are only valid for sales.');
    }
    if (transaction.discountCents > grossCents + transaction.feesCents) {
      throw new SealedDomainError('Purchase discount cannot exceed the purchase total.');
    }
  } else if (transaction.discountCents !== 0) {
    throw new SealedDomainError('A sale discount must be included in the unit price.');
  }

  return transaction;
}

export function validateSealedTransaction(
  input: unknown,
  now = new Date(),
): SealedTransaction {
  const value = input as Partial<SealedTransaction>;
  const draft = validateSealedTransactionDraft(input, now);
  if (typeof value.id !== 'string' || value.id.length < 1 || value.id.length > 128) {
    throw new SealedDomainError('Transaction id is invalid.');
  }
  if (typeof value.revision !== 'number') {
    throw new SealedDomainError('Transaction revision is invalid.');
  }
  assertInteger(value.revision, 'revision', 1, 1_000_000);
  if (typeof value.createdAt !== 'string' || typeof value.updatedAt !== 'string') {
    throw new SealedDomainError('Transaction timestamps are invalid.');
  }
  assertText(value.createdAt, 'createdAt', 64);
  assertText(value.updatedAt, 'updatedAt', 64);
  if (typeof value.voided !== 'boolean') {
    throw new SealedDomainError('Transaction voided state is invalid.');
  }
  return {
    ...draft,
    id: value.id,
    revision: value.revision,
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
    voided: value.voided,
  };
}

export function calculateSealedFees(transaction: SealedTransactionDraft): number {
  return transaction.feesCents
    + transaction.shippingCents
    + (transaction.kind === 'sell'
      ? transaction.paymentFeesCents + transaction.otherCostsCents
      : 0);
}

export function calculateSealedGrossCents(transaction: SealedTransactionDraft): number {
  return transaction.quantity * transaction.unitPriceCents;
}

export function calculateSealedCashCents(transaction: SealedTransactionDraft): number {
  const gross = calculateSealedGrossCents(transaction);
  const totalFees = calculateSealedFees(transaction);
  return transaction.kind === 'buy'
    ? -(gross + totalFees - transaction.discountCents)
    : gross - totalFees;
}

function positionKey(transaction: SealedTransaction): string {
  return `${transaction.cardmarketProductId}:${transaction.language}`;
}

function positionTemplate(transaction: SealedTransaction) {
  return {
    cardmarketProductId: transaction.cardmarketProductId,
    language: transaction.language,
    bought: 0,
    sold: 0,
    quantity: 0,
    spentCents: 0,
    costCents: 0,
    grossSalesCents: 0,
    netSalesCents: 0,
    realizedCents: 0,
    buyFeesCents: 0,
    sellFeesCents: 0,
    firstBuy: transaction.date,
    lastBuy: transaction.date,
    lastSale: null,
  } as {
    cardmarketProductId: number;
    language: SealedProductLanguage;
    bought: number;
    sold: number;
    quantity: number;
    spentCents: number;
    costCents: number;
    grossSalesCents: number;
    netSalesCents: number;
    realizedCents: number;
    buyFeesCents: number;
    sellFeesCents: number;
    firstBuy: string;
    lastBuy: string;
    lastSale: string | null;
  };
}

function sortTransactions(transactions: readonly SealedTransaction[]): SealedTransaction[] {
  return [...transactions].sort((a, b) => (
    a.date.localeCompare(b.date)
    || (a.kind === b.kind ? 0 : a.kind === 'buy' ? -1 : 1)
    || a.createdAt.localeCompare(b.createdAt)
    || a.id.localeCompare(b.id)
  ));
}

function allocateCost(lot: SealedLot, quantity: number): number {
  const cumulative = Math.floor(
    (lot.costCents * (lot.consumed + quantity)) / lot.transaction.quantity,
  );
  const cost = cumulative - lot.allocatedCostCents;
  lot.allocatedCostCents = cumulative;
  lot.consumed += quantity;
  lot.remaining -= quantity;
  return cost;
}

/**
 * Replays the complete transaction stream. No database state is trusted as a
 * derived result: editing or voiding one event always rebuilds the ledger.
 */
export function replaySealedLedger(
  transactions: readonly SealedTransaction[],
  through = '9999-12-31',
): SealedLedgerResult {
  if (!isSealedDate(through)) throw new SealedDomainError('Replay date is invalid.');

  const rows = sortTransactions(transactions.filter((transaction) => (
    !transaction.voided && transaction.date <= through
  )));
  const positions = new Map<string, ReturnType<typeof positionTemplate>>();
  const lots = new Map<string, {
    transaction: SealedTransaction;
    remaining: number;
    costCents: number;
    consumed: number;
    allocatedCostCents: number;
  }>();
  const lotsByPosition = new Map<string, string[]>();
  const fifoIndexes = new Map<string, number>();
  const sales: SealedSale[] = [];

  for (const transaction of rows) {
    const validated = validateSealedTransaction(transaction, new Date(`${through}T23:59:59Z`));
    const key = positionKey(validated);
    const position = positions.get(key) ?? positionTemplate(validated);
    positions.set(key, position);

    if (validated.kind === 'buy') {
      const costCents = -calculateSealedCashCents(validated);
      if (costCents < 0) throw new SealedDomainError('Purchase cost cannot be negative.');
      const lot = {
        transaction: validated,
        remaining: validated.quantity,
        costCents,
        consumed: 0,
        allocatedCostCents: 0,
      };
      lots.set(validated.id, lot);
      const queue = lotsByPosition.get(key) ?? [];
      queue.push(validated.id);
      lotsByPosition.set(key, queue);
      position.bought += validated.quantity;
      position.quantity += validated.quantity;
      position.spentCents += costCents;
      position.costCents += costCents;
      position.buyFeesCents += calculateSealedFees(validated);
      position.lastBuy = validated.date;
      continue;
    }

    if (position.quantity < validated.quantity) {
      throw new SealedDomainError(`Insufficient stock on ${validated.date}.`);
    }

    const queue = lotsByPosition.get(key) ?? [];
    let selections = validated.selections;
    if (validated.allocationMethod !== 'manual') {
      selections = [];
      let cursor = fifoIndexes.get(key) ?? 0;
      let needed = validated.quantity;
      while (needed > 0 && cursor < queue.length) {
        const lot = lots.get(queue[cursor]);
        if (!lot || lot.remaining <= 0) {
          cursor += 1;
          continue;
        }
        const quantity = Math.min(needed, lot.remaining);
        selections.push({ lotId: lot.transaction.id, quantity });
        needed -= quantity;
        if (quantity === lot.remaining) cursor += 1;
      }
      fifoIndexes.set(key, cursor);
      if (needed > 0) throw new SealedDomainError('Incomplete FIFO allocation.');
    } else {
      const selectionTotal = selections.reduce((sum, selection) => sum + selection.quantity, 0);
      const uniqueLots = new Set(selections.map((selection) => selection.lotId));
      if (selectionTotal !== validated.quantity || uniqueLots.size !== selections.length) {
        throw new SealedDomainError('Manual lots must total exactly the sold quantity without duplicates.');
      }
    }

    let needed = validated.quantity;
    const allocations: SealedAllocation[] = [];
    for (const selection of selections) {
      if (!needed) break;
      const lot = lots.get(selection.lotId);
      if (
        !lot
        || lot.transaction.cardmarketProductId !== validated.cardmarketProductId
        || lot.transaction.language !== validated.language
        || lot.transaction.date > validated.date
        || selection.quantity > lot.remaining
      ) {
        throw new SealedDomainError('Lot is missing, later than the sale, or unavailable.');
      }
      const quantity = Math.min(needed, selection.quantity);
      const costCents = allocateCost(lot, quantity);
      allocations.push({
        lotId: lot.transaction.id,
        quantity,
        costCents,
        holdingDays: dayDifference(lot.transaction.date, validated.date),
      });
      needed -= quantity;
    }
    if (needed) throw new SealedDomainError('Incomplete lot allocation.');

    const costCents = allocations.reduce((sum, allocation) => sum + allocation.costCents, 0);
    const netCents = calculateSealedCashCents(validated);
    const profitCents = netCents - costCents;
    const holdingDays = allocations.reduce(
      (sum, allocation) => sum + allocation.holdingDays * allocation.quantity,
      0,
    ) / validated.quantity;
    const sale: SealedSale = {
      transaction: validated,
      grossCents: calculateSealedGrossCents(validated),
      feesCents: calculateSealedFees(validated),
      netCents,
      costCents,
      profitCents,
      roi: costCents === 0 ? null : (profitCents / costCents) * 100,
      holdingDays,
      allocations,
    };
    sales.push(sale);

    position.quantity -= validated.quantity;
    position.sold += validated.quantity;
    position.costCents -= costCents;
    position.grossSalesCents += sale.grossCents;
    position.netSalesCents += netCents;
    position.realizedCents += profitCents;
    position.sellFeesCents += calculateSealedFees(validated);
    position.lastSale = validated.date;
  }

  return {
    positions: [...positions.values()],
    lots: [...lots.values()],
    sales,
  };
}

function metricValue(snapshot: SealedPriceSnapshot, metric: SealedPriceMetric): number | null {
  if (metric === 'app_avg3') return null;
  const key = `${metric}Cents` as keyof SealedPriceSnapshot['metrics'];
  const value = snapshot.metrics[key];
  return isFiniteNonNegative(value) ? value : null;
}

function snapshotIsStale(asOf: string, snapshot: SealedPriceSnapshot): boolean {
  const asOfTime = Date.parse(`${asOf}T00:00:00Z`);
  const dayTime = Date.parse(`${snapshot.day}T00:00:00Z`);
  const sourceTime = Date.parse(snapshot.sourceAt);
  return Number.isFinite(asOfTime)
    && Number.isFinite(dayTime)
    && Number.isFinite(sourceTime)
    && asOfTime - Math.min(dayTime, sourceTime) > 2 * DAY_MS;
}

/** Reproduces scelle's AVG1 three-day metric and fallback order. */
export function selectSealedValuation(
  snapshots: readonly SealedPriceSnapshot[],
  asOf = utcToday(),
): SealedValuation {
  if (!isSealedDate(asOf)) throw new SealedDomainError('Valuation date is invalid.');
  const available = snapshots
    .filter((snapshot) => isSealedDate(snapshot.day) && snapshot.day <= asOf)
    .sort((a, b) => b.day.localeCompare(a.day));
  const byDay = new Map<string, SealedPriceSnapshot[]>();
  for (const snapshot of available) {
    const sameDay = byDay.get(snapshot.day) ?? [];
    sameDay.push(snapshot);
    byDay.set(snapshot.day, sameDay);
  }

  const avgDays = [1, 2, 3].map((offset) => byDay.get(shiftDay(asOf, -offset)) ?? []);
  if (avgDays.every((rows) => rows.length === 1)) {
    const avg1Values = avgDays.map((rows) => metricValue(rows[0], 'avg1'));
    if (avg1Values.every((value): value is number => value !== null)) {
      const priceCents = Math.round(avg1Values.reduce((sum, value) => sum + value, 0) / 3);
      const sourceRow = avgDays[0][0];
      return {
        priceCents,
        metric: 'app_avg3',
        day: sourceRow.day,
        stale: snapshotIsStale(asOf, sourceRow),
      };
    }
  }

  for (const snapshot of available) {
    for (const metric of FALLBACK_METRICS) {
      const priceCents = metricValue(snapshot, metric);
      if (priceCents !== null) {
        return {
          priceCents,
          metric,
          day: snapshot.day,
          stale: snapshotIsStale(asOf, snapshot),
        };
      }
    }
  }
  return { priceCents: null, metric: null, day: null, stale: true };
}

export function calculateSealedMarketChangePercent(
  snapshots: readonly SealedPriceSnapshot[],
  days: number,
  asOf = utcToday(),
): { percent: number; metric: SealedPriceMetric } | null {
  if (!Number.isSafeInteger(days) || days < 1) return null;
  const current = snapshots.find((snapshot) => snapshot.day === asOf);
  const beforeDay = shiftDay(asOf, -days);
  const before = snapshots.find((snapshot) => snapshot.day === beforeDay);
  if (!current || !before) return null;

  for (const metric of FALLBACK_METRICS) {
    const currentValue = metricValue(current, metric);
    const beforeValue = metricValue(before, metric);
    if (currentValue !== null && beforeValue !== null && beforeValue > 0) {
      return { percent: (currentValue / beforeValue - 1) * 100, metric };
    }
  }
  return null;
}
