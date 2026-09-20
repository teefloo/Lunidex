# Sealed Exchanges Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add one atomic `exchange` transaction to the sealed-product portfolio so a given product leaves the collection, a received product enters it with transferred acquisition cost, and buy/sell accounting remains unchanged.

**Architecture:** Keep one exchange event in `tcg_sealed_transactions`. Reuse the existing product/language/quantity fields for the received leg and add an explicit `exchangeGive` leg for the outgoing product. Extend the deterministic core ledger to consume outgoing lots and create a received lot at the transferred historical cost; extend the existing Neon mutation transaction, history UI, exports, and product lookups without introducing a second transaction stream.

**Tech Stack:** TypeScript, Vitest, Next.js 16 / React 19, TanStack Query, Neon PostgreSQL migrations, existing Tailwind/base-nova UI primitives, i18next, and the current `@primedex/core` sealed ledger.

**Spec:** `docs/superpowers/specs/2026-09-20-sealed-exchanges-design.md`

## Global Constraints

- Use `buy | sell | exchange` as the transaction kinds; preserve all existing `primedex` and `@primedex/core` compatibility identifiers.
- Store one exchange event with a received leg in the common transaction fields and a given leg in `exchange_give_*` persistence fields exposed as `exchangeGive` in TypeScript.
- Transfer the historical acquisition cost of the given lots to the received lot; never derive exchange cost from a future market price.
- An exchange has zero monetary fields and must not create cashflow, a purchase, a sale, fees, or realized profit.
- Reject future dates, invalid identifiers, zero/negative quantities, invalid languages, incomplete allocations, and quantities greater than the available stock.
- Keep replay deterministic, use FIFO by default, support manual allocation, and recompute edits/voids from the complete event stream.
- Make the SQL change additive in `neon/migrations/0006_tcg_sealed_exchanges.sql`; do not execute a production migration.
- Keep the eight web locales synchronized: `en`, `fr`, `es`, `de`, `it`, `ja`, `ko`, and `zh`.
- Preserve the existing desktop/mobile style and the current buy/sell behavior; do not add soulte or payment-complement handling.
- Persist only compact transaction data and derived projections; keep remote catalogue and price responses out of Zustand persistence.

## Review Focus

- Same-day ordering: a buy on the exchange date must be available before the exchange, and a received exchange lot must be available to a later same-day sale. Pin with a ledger ordering test in Task 2.
- Different languages: the given and received legs may have different languages and must use distinct position keys. Pin with a ledger position test in Task 2 and a source-candidate test in Task 4.
- Exchange-only inventory: a product received without a direct purchase must still have a costed lot, normal market valuation, and readable product history. Pin with ledger/analytics tests in Task 2 and detail mapping coverage in Task 3.
- Dependent event edits and voids: changing or voiding an exchange must replay both legs and must not leave allocations or stock from the old version. Pin with replay tests in Task 2 and mutation serialization coverage in Task 3.
- Malformed or partial exchange payloads: incomplete legs, nonzero money fields, and invalid allocations must fail before any persisted mutation. Pin with normalizer tests in Task 3 and replay failure/immutability assertions in Task 2.

## File Map

- `packages/core/src/types/sealed.ts`: exchange leg, transaction kind, position counters, exchange projection, and portfolio totals.
- `packages/core/src/lib/sealed-ledger.ts`: validation, chronological ordering, outgoing lot allocation, cost transfer, and exchange replay.
- `packages/core/src/lib/sealed-analytics.ts`: exchange projections and cashflow/statistics semantics.
- `packages/core/src/lib/sealed-ledger.test.ts`: ledger and accounting tests.
- `neon/migrations/0006_tcg_sealed_exchanges.sql`: additive database constraints, columns, references, and index.
- `src/lib/tcg-sealed-server.ts`: row mapping, product discovery, mutation writes, detail loading, exports, and exchange allocations.
- `src/lib/tcg-sealed-server.test.ts`: pure server-boundary normalization/export tests.
- `src/lib/api/tcg-sealed.ts`: exchange-aware response types and product-detail data.
- `src/lib/tcg-sealed-sale-products.ts`: source candidates keyed by product and language.
- `src/lib/tcg-sealed-sale-products.test.ts`: owned source candidate tests.
- `src/lib/tcg-sealed-display.ts`: pure history-summary formatting and transaction product-id helpers.
- `src/lib/tcg-sealed-display.test.ts`: exchange history display tests.
- `src/app/tcg/sealed/SealedPortfolioPage.tsx`: form legs, summary, history rows, detail product map, and query wiring.
- `src/lib/i18n/{en,fr,es,de,it,ja,ko,zh}.ts`: localized exchange labels and explanatory copy.

No route-handler shape change is expected: the current POST/PATCH/void routes already forward validated JSON to `mutateSealedTransaction`; their generic contracts must be rechecked after the server changes.

---

### Task 1: Write the failing core exchange tests

**Files:**
- Modify: `packages/core/src/lib/sealed-ledger.test.ts`

**Interfaces:**
- Consumes: the existing `draft`, `transaction`, `snapshot`, and `summarizeSealedPortfolio` test factories.
- Produces: failing examples defining `exchangeGive`, `exchangeIn`, `exchangeOut`, `SealedLedgerResult.exchanges`, and zero-cash exchange semantics for Task 2.

- [ ] **Step 1: Add a test-only exchange fixture without changing production code.**

Add a helper that builds the future payload shape through an `unknown` boundary, so the tests can run against the current implementation and fail for the missing behavior:

```ts
function exchangeTransaction(
  id: string,
  overrides: Record<string, unknown> = {},
): SealedTransaction {
  const { exchangeGive: exchangeGiveOverride, ...transactionOverrides } = overrides;
  const value = transaction(id, {
    ...transactionOverrides,
    kind: 'exchange' as unknown as SealedTransactionDraft['kind'],
    cardmarketProductId: 200,
    language: 'fr',
    quantity: 1,
    unitPriceCents: 0,
    feesCents: 0,
    shippingCents: 0,
    discountCents: 0,
    paymentFeesCents: 0,
    otherCostsCents: 0,
  });
  return {
    ...value,
    kind: 'exchange',
    exchangeGive: exchangeGiveOverride ?? {
      cardmarketProductId: 100,
      language: 'fr',
      quantity: 1,
    },
  } as unknown as SealedTransaction;
}
```

Keep this cast at the test boundary only; Task 2 makes production types authoritative.

- [ ] **Step 2: Add the one-for-one RED test.**

```ts
it('moves one unit and its historical cost without creating a sale or cashflow', () => {
  const buy = transaction('buy-give', {
    cardmarketProductId: 100,
    quantity: 1,
    unitPriceCents: 1_000,
    feesCents: 0,
    shippingCents: 0,
    discountCents: 0,
  });
  const exchange = exchangeTransaction('exchange-1');

  const result = replaySealedLedger([buy, exchange]);

  expect(result.sales).toEqual([]);
  expect(result.exchanges[0]).toMatchObject({
    transaction: { id: 'exchange-1' },
    costCents: 1_000,
  });
  expect(result.positions).toEqual(expect.arrayContaining([
    expect.objectContaining({
      cardmarketProductId: 100,
      quantity: 0,
      costCents: 0,
      exchangeOut: 1,
    }),
    expect.objectContaining({
      cardmarketProductId: 200,
      quantity: 1,
      costCents: 1_000,
      exchangeIn: 1,
    }),
  ]));
  expect(calculateSealedCashflow(
    [buy, exchange],
    '2026-09-01',
    '2026-09-01',
    'day',
  )).toHaveLength(1);
});
```

- [ ] **Step 3: Add RED tests for different quantities, existing destination, and absent destination.**

Use a buy of three source units at 10 € each and an exchange of all three for two received units; assert source quantity/cost become zero and the received lot cost is 30 €. Add a separate destination buy of one unit at 5 €, exchange one source unit into it, and assert destination quantity is two, cost is 15 €, `bought` remains one, and `exchangeIn` is one. Assert an exchange-only destination is present in positions with a nonzero transferred cost.

- [ ] **Step 4: Add RED tests for validation and replay boundaries.**

Add tests that assert `SealedDomainError` for: source quantity greater than available; zero or negative give/receive quantities; nonzero exchange money fields; missing `exchangeGive`; incompatible manual lot; and a future exchange date. Add a test with give language `fr` and receive language `en` to assert separate position keys. Add a same-day chain `buy -> exchange -> sell` to prove the received lot can be sold later that day. Assert a failed replay does not mutate the input transaction objects.

- [ ] **Step 5: Add RED accounting tests.**

Summarize a buy, exchange, and sale with price snapshots. Assert exchange does not change `spentCents`, `cashFlowCents`, `grossSalesCents`, `netSalesCents`, or realized profit; assert the received position has normal market value and latent P/L based on transferred cost. Add a voided exchange and an edited replacement with the same id to prove replay removes the old two-leg state.

- [ ] **Step 6: Run the focused test file and confirm the failures are feature failures.**

Run:

```bash
npx vitest run packages/core/src/lib/sealed-ledger.test.ts
```

Expected: current buy/sell tests pass, while the new exchange tests fail because the validator rejects `exchange` or no exchange replay branch exists. Fix only test setup errors if a failure is a syntax/fixture error.

- [ ] **Step 7: Commit the red tests.**

```bash
git add packages/core/src/lib/sealed-ledger.test.ts
git commit -m "[tcg] Add failing sealed exchange ledger tests" -m "Co-authored-by: Gemini CLI <agent@gemini.google.com>"
```

---

### Task 2: Implement the shared exchange ledger and analytics

**Files:**
- Modify: `packages/core/src/types/sealed.ts`
- Modify: `packages/core/src/lib/sealed-ledger.ts`
- Modify: `packages/core/src/lib/sealed-analytics.ts`
- Test: `packages/core/src/lib/sealed-ledger.test.ts`

**Interfaces:**
- Consumes: the failing exchange scenarios from Task 1.
- Produces: `SealedTransactionDraft.exchangeGive`, `SealedExchange`, `SealedLedgerResult.exchanges`, `SealedPosition.exchangeIn/exchangeOut`, and matching portfolio totals for later tasks.

- [ ] **Step 1: Extend the shared types minimally.**

In `packages/core/src/types/sealed.ts`, add:

```ts
export type SealedTransactionKind = 'buy' | 'sell' | 'exchange';

export interface SealedExchangeLeg {
  cardmarketProductId: number;
  language: SealedProductLanguage;
  quantity: number;
}

// Add this optional field to SealedTransactionDraft.
exchangeGive?: SealedExchangeLeg;

export interface SealedExchange {
  transaction: SealedTransaction;
  costCents: number;
  allocations: SealedAllocation[];
}
```

Add `exchangeIn` and `exchangeOut` to `SealedPosition`, `exchanges` to `SealedLedgerResult`, `exchangeIn` and `exchangeOut` to `SealedPortfolioTotals`, and `exchanges` to the portfolio summary. Preserve all existing fields and exports.

- [ ] **Step 2: Run the RED tests after the type change.**

Run:

```bash
npx vitest run packages/core/src/lib/sealed-ledger.test.ts
```

Expected: tests still fail at runtime in validation/replay, proving the type-only change did not implement behavior.

- [ ] **Step 3: Extend draft-shape and transaction validation.**

In `sealed-ledger.ts`, parse `exchangeGive` as an optional object with explicit product id, language, and quantity. Accept `exchange` as a kind, then enforce:

```ts
if (transaction.kind === 'exchange') {
  if (!transaction.exchangeGive) {
    throw new SealedDomainError('Exchange give leg is required.');
  }
  if (
    transaction.unitPriceCents !== 0
    || transaction.feesCents !== 0
    || transaction.shippingCents !== 0
    || transaction.discountCents !== 0
    || transaction.paymentFeesCents !== 0
    || transaction.otherCostsCents !== 0
  ) {
    throw new SealedDomainError('Exchange money fields must be zero.');
  }
  assertProductId(transaction.exchangeGive.cardmarketProductId, 'Exchange give product id');
  if (!isSealedProductLanguage(transaction.exchangeGive.language)) {
    throw new SealedDomainError('Exchange give language is invalid.');
  }
  assertInteger(transaction.exchangeGive.quantity, 'Exchange give quantity', 1, MAX_QUANTITY);
} else if (transaction.exchangeGive) {
  throw new SealedDomainError('Exchange give leg is only valid for exchanges.');
}
```

Use a small internal `assertProductId` helper. Keep existing buy/sell validation behavior unchanged.

- [ ] **Step 4: Refactor outgoing lot allocation behind one helper.**

Extract the existing FIFO/manual selection logic into a helper with this contract:

```ts
function allocateOutgoingLots(
  transaction: SealedTransaction,
  productId: number,
  language: SealedProductLanguage,
  quantity: number,
  positionQuantity: number,
  lots: Map<string, SealedLot>,
  lotsByPosition: Map<string, string[]>,
  fifoIndexes: Map<string, number>,
): SealedAllocation[]
```

The helper must reject insufficient stock, incomplete FIFO allocation, duplicate/incomplete manual selections, future/wrong-product/wrong-language lots, and selections above remaining lot quantities. Interpret `selections` as sale lots for `sell` and given lots for `exchange`.

- [ ] **Step 5: Add the exchange branch to `replaySealedLedger`.**

Use transaction kind order `buy: 0, exchange: 1, sell: 2` for equal dates. For `exchange`:

1. Read `exchangeGive` and get the source position by its own product/language key.
2. Call `allocateOutgoingLots` with the give quantity.
3. Sum allocation costs.
4. Decrease source quantity/cost and increment `exchangeOut`.
5. Create a received lot using the exchange transaction id, received quantity, and summed transfer cost.
6. Increase the received position quantity/cost and `exchangeIn`.
7. Append `{ transaction, costCents, allocations }` to `exchanges` without touching sales or cash fields.

Change `positionTemplate` to accept explicit product id/language/date so a source position is never initialized with the received product. Keep buy and sell branches behaviorally identical.

- [ ] **Step 6: Make analytics exchange-aware without changing cash metrics.**

Return `ledger.exchanges` and aggregate `exchangeIn/exchangeOut`. In `calculateSealedCashflow`, branch explicitly on `buy`, `sell`, and `exchange`; the exchange branch must `continue` without creating a cashflow bucket. Do not add exchanges to buys, sales, invested, recovered, or realized-profit fields. Keep market valuation based on price snapshots.

- [ ] **Step 7: Run focused tests and core type-check.**

Run:

```bash
npx vitest run packages/core/src/lib/sealed-ledger.test.ts
npx tsc --project packages/core/tsconfig.json --noEmit
```

Expected: all ledger/analytics tests pass, including same-day and different-language cases, and the core compiler exits 0.

- [ ] **Step 8: Commit the core implementation.**

```bash
git add packages/core/src/types/sealed.ts packages/core/src/lib/sealed-ledger.ts packages/core/src/lib/sealed-analytics.ts packages/core/src/lib/sealed-ledger.test.ts
git commit -m "[tcg] Add atomic sealed exchange replay" -m "Co-authored-by: Gemini CLI <agent@gemini.google.com>"
```

---

### Task 3: Add the Neon migration and server/API exchange boundary

**Files:**
- Create: `neon/migrations/0006_tcg_sealed_exchanges.sql`
- Modify: `src/lib/tcg-sealed-server.ts`
- Modify: `src/lib/api/tcg-sealed.ts`
- Create: `src/lib/tcg-sealed-server.test.ts`

**Interfaces:**
- Consumes: core exchange types and replay result from Task 2.
- Produces: database rows mapping to `exchangeGive`, exchange-aware mutations, related-product detail data, exchange allocations, and typed API responses.

- [ ] **Step 1: Write failing server-boundary tests.**

Create pure tests for the exported server helpers:

```ts
it('normalizes an exchange with zero monetary fields and default language', () => {
  expect(normalizeSealedDraft({
    kind: 'exchange',
    cardmarketProductId: 200,
    quantity: 1,
    date: '2026-09-10',
    exchangeGive: { cardmarketProductId: 100, language: 'fr', quantity: 1 },
  })).toMatchObject({
    kind: 'exchange',
    language: 'unknown',
    unitPriceCents: 0,
    exchangeGive: { cardmarketProductId: 100, language: 'fr', quantity: 1 },
  });
});

it('rejects nonzero exchange money or an incomplete give leg', () => {
  expect(() => normalizeSealedDraft({
    kind: 'exchange',
    cardmarketProductId: 200,
    quantity: 1,
    date: '2026-09-10',
    unitPriceCents: 1,
    exchangeGive: { cardmarketProductId: 100, language: 'fr', quantity: 1 },
  })).toThrow(SealedServerError);

  expect(() => normalizeSealedDraft({
    kind: 'exchange',
    cardmarketProductId: 200,
    quantity: 1,
    date: '2026-09-10',
  })).toThrow(SealedServerError);
});
```

Add a CSV assertion that an exchange row contains received product/quantity and given product/language/quantity.

- [ ] **Step 2: Run the server tests RED.**

Run:

```bash
npx vitest run src/lib/tcg-sealed-server.test.ts
```

Expected: current normalization rejects `exchange` or the CSV is missing the given-leg columns.

- [ ] **Step 3: Write the additive migration.**

Create a transaction-wrapped migration with this shape:

```sql
begin;

alter table public.tcg_sealed_transactions
  drop constraint if exists tcg_sealed_transactions_kind_check;

alter table public.tcg_sealed_transactions
  add column if not exists exchange_give_product_id integer
    references public.tcg_sealed_products (cardmarket_product_id),
  add column if not exists exchange_give_language text,
  add column if not exists exchange_give_quantity integer;

alter table public.tcg_sealed_transactions
  add constraint tcg_sealed_transactions_kind_check
    check (kind in ('buy', 'sell', 'exchange')),
  add constraint tcg_sealed_transactions_exchange_shape_check
    check (
      (kind = 'exchange'
        and exchange_give_product_id is not null
        and exchange_give_language in ('unknown', 'en', 'fr', 'es', 'de', 'it', 'ja')
        and exchange_give_quantity is not null
        and exchange_give_quantity > 0
        and unit_price_cents = 0
        and fees_cents = 0
        and shipping_cents = 0
        and discount_cents = 0
        and payment_fees_cents = 0
        and other_costs_cents = 0)
      or
      (kind in ('buy', 'sell')
        and exchange_give_product_id is null
        and exchange_give_language is null
        and exchange_give_quantity is null)
    );

create index if not exists tcg_sealed_transactions_user_exchange_give_idx
  on public.tcg_sealed_transactions (user_id, exchange_give_product_id, date);

commit;
```

Do not change or drop existing row data. Add separate nullable checks for language/quantity only if needed for clearer PostgreSQL diagnostics.

- [ ] **Step 4: Extend row mapping and normalization.**

Add nullable exchange-give columns to `SealedTransactionRow`. Map a complete non-null set to `exchangeGive`, map the all-null legacy shape to `undefined`, and let a partial set fail through `validateSealedTransaction`. Pass `value.exchangeGive` from `normalizeSealedDraft` to the shared validator.

- [ ] **Step 5: Extend reads and product discovery.**

Select the three new columns in both transaction queries. A product filter must match either received `cardmarket_product_id` or `exchange_give_product_id`. In `loadSealedPortfolio`, include both received and given IDs before parallel product/price loads. In `getSealedProductDetail`, load all products referenced by filtered transactions and return them as `products` so both history names resolve.

- [ ] **Step 6: Extend mutation validation and the serializable write.**

For create/update, collect both product IDs from the normalized draft and reject the mutation if either catalogue product is absent. Keep void using the stored event and existing revision checks. Add exchange columns to insert and conflict-update clauses, serializing nulls for buy/sell. Build derived allocation rows from both `ledger.sales` and `ledger.exchanges` before deleting/reinserting the projection. Keep revision guard, audit insert, allocation rebuild, and daily-cache invalidation in the same serializable transaction.

The return value remains `{ transaction, revision, allocations }`; an exchange allocation uses its exchange id in the existing `sale_id` compatibility column.

- [ ] **Step 7: Extend overview, detail, API types, and exports.**

Return `current.exchanges` from `getSealedOverview`. Add `exchanges` to `SealedOverviewResponse`. Add `products: SealedProduct[]` to `SealedProductDetailResponse`. Append exchange-give columns to CSV without removing existing columns, and keep JSON transaction objects backward-compatible with optional `exchangeGive`.

- [ ] **Step 8: Run server tests and static checks.**

Run:

```bash
npx vitest run src/lib/tcg-sealed-server.test.ts packages/core/src/lib/sealed-ledger.test.ts
npx tsc --project packages/core/tsconfig.json --noEmit
npm run typecheck
```

Expected: normalization, export, core, and web type checks pass. Do not run `npm run db:neon:import` or any production database command.

- [ ] **Step 9: Commit the migration and server boundary.**

```bash
git add neon/migrations/0006_tcg_sealed_exchanges.sql src/lib/tcg-sealed-server.ts src/lib/api/tcg-sealed.ts src/lib/tcg-sealed-server.test.ts
git commit -m "[tcg] Persist sealed exchange legs" -m "Co-authored-by: Gemini CLI <agent@gemini.google.com>"
```

---

### Task 4: Add owned exchange candidates and pure history formatting

**Files:**
- Modify: `src/lib/tcg-sealed-sale-products.ts`
- Modify: `src/lib/tcg-sealed-sale-products.test.ts`
- Create: `src/lib/tcg-sealed-display.ts`
- Create: `src/lib/tcg-sealed-display.test.ts`

**Interfaces:**
- Consumes: `SealedPosition`, `SealedProduct`, and `SealedTransaction` from `@primedex/core`.
- Produces: `SealedExchangeProductCandidate`, `getSealedExchangeProducts`, `formatSealedExchangeSummary`, and `getSealedTransactionProductIds`.

- [ ] **Step 1: Write failing candidate and display tests.**

```ts
it('keeps exchange source candidates distinct by product and language', () => {
  expect(getSealedExchangeProducts([
    { product: product(100, 'ETB ME04'), language: 'fr', quantity: 1 },
    { product: product(100, 'ETB ME04'), language: 'en', quantity: 2 },
    { product: product(200, 'Empty'), language: 'fr', quantity: 0 },
  ])).toEqual([
    { product: product(100, 'ETB ME04'), language: 'fr', availableQuantity: 1 },
    { product: product(100, 'ETB ME04'), language: 'en', availableQuantity: 2 },
  ]);
});

it('formats both legs in the journal shape', () => {
  expect(formatSealedExchangeSummary({
    kind: 'exchange',
    quantity: 1,
    cardmarketProductId: 200,
    exchangeGive: { cardmarketProductId: 100, language: 'fr', quantity: 1 },
  } as SealedTransaction, new Map([
    [100, 'ETB ME04'],
    [200, 'ETB ME03'],
  ]))).toBe('1 × ETB ME04 → 1 × ETB ME03');
});
```

Also test `getSealedTransactionProductIds` returns both IDs for an exchange and only the primary ID for buy/sell.

- [ ] **Step 2: Run helper tests RED.**

Run:

```bash
npx vitest run src/lib/tcg-sealed-sale-products.test.ts src/lib/tcg-sealed-display.test.ts
```

Expected: the new functions are missing or return no exchange candidate/summary.

- [ ] **Step 3: Implement the owned-source candidate helper.**

Add:

```ts
export interface SealedExchangeProductCandidate {
  product: SealedProduct;
  language: SealedProductLanguage;
  availableQuantity: number;
}

interface SealedExchangePositionWithProduct {
  product: SealedProduct;
  language: SealedProductLanguage;
  quantity: number;
}

export function getSealedExchangeProducts(
  positions: readonly SealedExchangePositionWithProduct[],
): SealedExchangeProductCandidate[]
```

Aggregate only safe positive quantities by product/language key and preserve first-seen portfolio order. Leave `getSealedSaleProducts` unchanged for sales.

- [ ] **Step 4: Implement pure display helpers.**

`formatSealedExchangeSummary(transaction, names)` accepts `Pick<SealedTransactionDraft, 'kind' | 'quantity' | 'cardmarketProductId' | 'exchangeGive'>`, returns `null` for non-exchanges, and otherwise uses give quantity/name, received quantity/name, and the arrow separator. Resolve missing names as `#<id>`. `getSealedTransactionProductIds` returns a de-duplicated array in received-then-given order.

- [ ] **Step 5: Run helper tests and commit.**

Run:

```bash
npx vitest run src/lib/tcg-sealed-sale-products.test.ts src/lib/tcg-sealed-display.test.ts
```

Expected: all candidate and display tests pass.

```bash
git add src/lib/tcg-sealed-sale-products.ts src/lib/tcg-sealed-sale-products.test.ts src/lib/tcg-sealed-display.ts src/lib/tcg-sealed-display.test.ts
git commit -m "[tcg] Add sealed exchange display helpers" -m "Co-authored-by: Gemini CLI <agent@gemini.google.com>"
```

---

### Task 5: Integrate the exchange form, history, and product detail UI

**Files:**
- Modify: `src/app/tcg/sealed/SealedPortfolioPage.tsx`

**Interfaces:**
- Consumes: API fields from Task 3, owned exchange candidates from Task 4, and `formatSealedExchangeSummary`.
- Produces: localized, accessible exchange form/history while preserving the current buy/sell path.

- [ ] **Step 1: Extend local form state and query inputs.**

Change `FormState.kind` to `'buy' | 'sell' | 'exchange'`, add `giveProduct?: SealedProduct`, and pass `exchangeProducts: SealedExchangeProductCandidate[]` into `TransactionForm`. Compute exchange candidates with `useMemo` from overview positions. When editing an exchange, pass received and given products from a map of all overview positions.

Keep the existing sale-product calculation for sales. Enable the catalogue query for `buy` and `exchange`, not `sell`; preserve its current query key and abort signal.

- [ ] **Step 2: Add the three-way selector without changing existing fields.**

Keep the current common form fields for the received leg and add the `exchange` option. Keep the type selector disabled for existing transactions. On a new kind change, clear selected products/searches/selections and reset all money fields to zero so a sale allocation cannot leak into an exchange.

- [ ] **Step 3: Implement two product pickers.**

Keep the current picker as the received-leg picker. Add a second controlled picker for the given leg:

- source options come only from `exchangeProducts`, filtered by name/alias and shown with language/available quantity;
- received options come from the catalogue query;
- selecting source sets `form.exchangeGive` and its language;
- selecting received sets common product/language fields;
- existing transaction product identities remain locked as in the current form.

Use separate labels/listbox names for “Je donne” and “Je reçois”, and reuse `Input`, `ProductThumb`, and existing focus classes.

- [ ] **Step 4: Add quantities, allocation, and pre-submit summary.**

Bind the source quantity to `exchangeGive.quantity`, the received quantity to `form.quantity`, and render separate language selects. Reuse manual-lot UI by filtering lots against the source leg; manual totals use source quantity.

For exchange, replace money fields with a bordered summary and cost-basis hint:

```tsx
<div role="status">
  <p>{t('tcg.sealed.exchange_cost_basis_hint')}</p>
  <p>{formatSealedExchangeSummary(form, productNames)}</p>
</div>
```

On submit, skip visible money parsing for exchange and send every money field as zero. Disable Save until both products and both positive quantities exist. Keep existing money validation for buy/sell.

- [ ] **Step 5: Make journal rows show both legs.**

Update `TransactionRow` to accept received and optional given products. For exchange, show the pure helper output as the primary line, an exchange badge, date/languages, and current edit/void controls. Keep current single-product price layout for buy/sell. Build the journal map from all overview positions, including zero-stock positions.

- [ ] **Step 6: Keep product history and chart semantics correct.**

Pass `data.products` into `ProductView` and resolve both legs in transaction rows. Skip exchange transactions when `ProductPriceHistoryChart` builds monetary trade points so a zero unit price is never rendered as a fake market observation.

- [ ] **Step 7: Apply React/Next performance and accessibility constraints.**

Use primitive `useMemo` dependencies for candidate/product maps, avoid defining new components inside `TransactionForm`, preserve query cache keys, and do not add client fetch calls. Ensure both listboxes/options have correct roles, buttons have touch-sized targets, and summary/errors are keyboard-readable. Preserve the current mobile scroll container and reduced-motion behavior.

- [ ] **Step 8: Run focused tests and type-check.**

Run:

```bash
npx vitest run packages/core/src/lib/sealed-ledger.test.ts src/lib/tcg-sealed-sale-products.test.ts src/lib/tcg-sealed-display.test.ts src/lib/tcg-sealed-server.test.ts
npm run lint
npm run typecheck
npm run typecheck --workspace=@primedex/mobile
```

Expected: no buy/sell regressions and no consumer type errors.

- [ ] **Step 9: Commit the UI integration.**

```bash
git add src/app/tcg/sealed/SealedPortfolioPage.tsx
git commit -m "[tcg] Add sealed exchange workflow" -m "Co-authored-by: Gemini CLI <agent@gemini.google.com>"
```

---

### Task 6: Localize exchange copy in every supported locale

**Files:**
- Modify: `src/lib/i18n/en.ts`
- Modify: `src/lib/i18n/fr.ts`
- Modify: `src/lib/i18n/es.ts`
- Modify: `src/lib/i18n/de.ts`
- Modify: `src/lib/i18n/it.ts`
- Modify: `src/lib/i18n/ja.ts`
- Modify: `src/lib/i18n/ko.ts`
- Modify: `src/lib/i18n/zh.ts`

**Interfaces:**
- Consumes: exact `tcg.sealed.*` keys referenced by Task 5.
- Produces: complete locale bundles with no new hard-coded transaction strings.

- [ ] **Step 1: Add English keys.**

Add these keys to the existing `tcg.sealed` object: `exchange`, `give`, `receive`, `exchange_badge`, `exchange_source_label`, `exchange_received_label`, `exchange_source_placeholder`, `exchange_received_placeholder`, `exchange_summary`, `exchange_no_owned_source`, and `exchange_cost_basis_hint`. Use identical interpolation variables for quantities/product names across all locales.

- [ ] **Step 2: Add equivalent translations to the other seven locales.**

Keep key names and interpolation variables identical across all eight files. Preserve each bundle’s existing formatting and locale punctuation.

- [ ] **Step 3: Run locale checks.**

Run:

```bash
npm run typecheck
npm run lint
npx vitest run
```

Expected: all bundles parse and no existing translation module/import test fails.

- [ ] **Step 4: Commit localized copy.**

```bash
git add src/lib/i18n/en.ts src/lib/i18n/fr.ts src/lib/i18n/es.ts src/lib/i18n/de.ts src/lib/i18n/it.ts src/lib/i18n/ja.ts src/lib/i18n/ko.ts src/lib/i18n/zh.ts
git commit -m "[i18n] Localize sealed exchange labels" -m "Co-authored-by: Gemini CLI <agent@gemini.google.com>"
```

---

### Task 7: Full verification and browser walkthrough

**Files:**
- Modify only if verification exposes a defect: files from Tasks 1–6.

**Interfaces:**
- Consumes: complete exchange implementation and committed tests.
- Produces: fresh evidence for the final handoff; no completion claim is based on compilation alone.

- [ ] **Step 1: Run the full automated suite.**

Run:

```bash
npm test
```

Expected: Vitest exits 0 with zero failed tests. Record the exact count and report any unrelated failure by name.

- [ ] **Step 2: Run CI-equivalent static checks.**

Run separately:

```bash
npm run lint
npm run typecheck
npx tsc --project packages/core/tsconfig.json --noEmit
npm run typecheck --workspace=@primedex/mobile
npm run build
```

Expected: every command exits 0 and the build retains the repository’s `--webpack` script behavior.

- [ ] **Step 3: Inspect diff and migration safety.**

Run:

```bash
git diff --check master...HEAD
git status --short
git log --oneline -8
```

Confirm no generated PWA output, secrets, `.env` files, unrelated edits, destructive SQL, or production database artifacts were added. Confirm revision guard, audit, allocation rebuild, and daily-cache invalidation remain in one serializable transaction. Do not run the Neon import script.

- [ ] **Step 4: Run the browser walkthrough only if Neon can serve the private portfolio.**

Run:

```bash
npm run dev
```

If Neon is configured, use the browser/Chrome DevTools surface to:

1. open the locale-prefixed Scellé page;
2. record one source buy and confirm collection stock;
3. create a one-for-one exchange;
4. confirm source stock decreases, received stock increases, received cost equals transferred source cost, and market value comes from price data;
5. confirm journal text shows source arrow received and no fake cashflow/sale;
6. edit the exchange where valid and confirm replayed stock/cost;
7. void it and confirm both legs disappear while audit remains;
8. verify existing buy and sale still submit/render;
9. inspect console errors and mutation/query network responses.

If Neon is unavailable, record the established unavailable/private-sync state and do not claim a successful browser transaction.

- [ ] **Step 5: Commit only verification-driven fixes and report evidence.**

For any defect, add or update a failing test first, repeat the red/green cycle, and commit the focused fix with the required co-author line. After the final fix, rerun every command supporting the final claims.


