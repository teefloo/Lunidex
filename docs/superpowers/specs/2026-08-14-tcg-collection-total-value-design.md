# TCG Collection Total Value Design

## Goal

Add a global estimated value to the collection overview at `/fr/tcg/collection` and its other supported locales. The amount must cover every card currently owned across all extensions, not only extensions marked as active.

## Scope

The feature is read-only and remains compatible with the app's local-first model. It will not change ownership persistence, active-set behavior, card pricing sources, currency conversion, or the existing per-set insight cards.

## Design

### Data flow

1. `TCGCollectionOverview` derives a stable, de-duplicated, sorted list from `tcgOwnedCards`.
2. A centralized helper in `src/lib/api/tcg.ts` hydrates only those card IDs through the existing `getTCGCard` API client, using bounded concurrency and the existing browser cache.
3. Hydrated cards are projected with `toCollectionCard` and aggregated with `aggregateCollectionValue`.
4. The query is keyed by the owned ID list and resolved language, with a one-hour stale time. Changing ownership invalidates the key and refreshes the estimate without blocking the rest of the page.

The valuation keeps the current source policy: Cardmarket values are preferred, with TCGplayer as a per-card fallback. Totals are grouped by currency rather than converted.

### Overview UI

The recap panel becomes a responsive four-column metric grid on large screens and remains two columns on smaller screens. The new metric uses the existing `collection_value_estimate` label and displays:

- one or more formatted currency totals when prices are available;
- `priced/owned` coverage beneath the total;
- the existing loading label while prices are being fetched;
- the existing no-price or no-owned-card labels when no total can be shown.

The existing total owned, completed sets, and overall progress metrics remain unchanged. The value metric is visually emphasized with the established primary color, matching the per-set value treatment.

### Accessibility and localization

No new user-facing strings are required. Existing localized keys are reused for the label, coverage, loading, no-price, and no-owned-card states. The currency formatter receives the resolved application language and preserves the currency code when a provider uses a non-local currency. The metric remains text-based and readable by assistive technology.

### Error and performance behavior

- A failed or unavailable card lookup results in an unpriced card rather than a page-level error.
- The overview remains rendered while valuation is loading.
- Requests are limited to owned IDs, de-duplicated, and bounded in parallelism.
- Existing IndexedDB card caching reduces repeat work after the first calculation.
- No full-catalog hydration is introduced.

## Implementation units

- Extend the centralized TCG API module with a collection valuation loader.
- Add the valuation query and fourth recap metric to `TCGCollectionOverview`.
- Reuse existing valuation domain types and formatting conventions.
- Update focused component/API tests only where the new behavior requires coverage.

## Verification

Run the focused collection tests first, then the web checks required by the repository guide:

```bash
npx vitest run src/lib/tcg-collection.test.ts src/components/tcg/TCGCollectionOverview.test.tsx
npm run lint
npm run typecheck
```

Success means the global value is calculated from all owned IDs, currencies remain separated, partial pricing is reported accurately, and the existing collection overview interactions continue to pass.
