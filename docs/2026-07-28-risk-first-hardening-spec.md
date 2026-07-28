# PrimeDex risk-first hardening specification

**Status:** approved for implementation on 2026-07-28  
**Scope:** confirmed P0/P1 defects and the directly related P2 corrections.  
**Non-goals:** a web/core rewrite, a product redesign, production deployment, production data changes, and broad mobile feature parity.

## Baseline and evidence standard

The starting tree is `master` at `3b0fd815ceb03893ad0ed9297b1abbd33f71bdf9` with no user changes. The audit inventoried 606 tracked files. Baseline lint, root typecheck, core typecheck, mobile typecheck, 290 tests, and the production build passed; lint emitted five pre-existing warnings. The build and initial checks ran on Node 26 because Node 22 was not initially installed; Node 22.23.1 is now available for final validation.

Each item below is a confirmed source-path or runtime finding. A finding is not treated as confirmed merely because it resembles a common weakness. Static-only items explicitly retain their validation requirement.

## Confirmed P0/P1 evidence matrix

| ID | Batch | Affected code path | Reproduction / expected behaviour | Actual behaviour | Correction and validation |
| --- | --- | --- | --- | --- | --- |
| SEC-01 | 1 | `src/app/u/[handle]/page.tsx` JSON-LD scripts; `src/lib/supabase/AuthProvider.tsx` signup name | Create a public profile whose name contains `</script><script>window.__x=1</script>`; JSON-LD must remain data. | Raw `JSON.stringify` in `dangerouslySetInnerHTML` leaves `<` unescaped and can close the script element. | Central JSON-LD serializer escapes HTML-script delimiters; bound profile name validation; render test asserts no executable breakout. |
| SEC-02 | 1 | `supabase/migrations/20240101000002_profiles.sql`, `20240101000005_public_profiles.sql`, `src/lib/api/public-profile.ts` | An anonymous visitor may read intentional public profile fields but never email. | Public table SELECT plus an attempted column revoke can still expose email under table-level privileges. | Add an additive safe public projection and revoke direct anonymous profile-table selection; SQL fixture documents anon/owner expectations. |
| SEC-03 | 1 | `supabase/functions/poll-tcg-prices/index.ts`; `supabase/AGENTS.md` | Invoke poller with no/wrong secret; it must make no calls or writes. | `--no-verify-jwt` setup and optional `CRON_SECRET` permit unauthenticated service-role work. | Require POST and configured scheduler secret, compare safely, return 401/503 before any work; unit-test authorization guards. |
| SEC-04 | 1 | `20260623_tcg_price_history.sql`; `poll-tcg-prices/index.ts` push delivery | Store a malicious subscription endpoint; worker must never call a private/arbitrary host. | Authenticated users can store arbitrary endpoint JSON and the service-role worker fetches it. | Validate subscriptions on write and before delivery; restrict protocol/origin, reject private hosts/redirects, add timeout; retain the current browser-side subscription format. |
| SEC-05 | 1 | `src/app/api/quiz/leaderboard/route.ts`; `20240101000003_quiz_scores.sql` | Authenticated user directly calls PostgREST with a forged score/date/mode; it must be denied. | Owner policies permit direct insert/update and the route trusts client score within a range. | Revoke direct mutations and expose a constrained atomic RPC; route derives identity/date and only raises a stored high score. Test route validation and migration policy contract. |
| SEC-06 | 1 | `20240101000000_battle_rooms.sql`; `src/app/api/battle/room/route.ts`; `src/components/battle/BattleRoom.tsx` | Player one must not alter player two data; outsider must not join/broadcast. | Either participant can update the whole row, arbitrary member fields survive API validation, and Realtime is public. | Narrow room input now and add database transition/RLS hardening without changing public feature semantics; use private room channels where supported. SQL-level tests remain required before production rollout. |
| DATA-01 | 1/2 | `src/lib/supabase/useSupabaseSync.ts`; `packages/core/src/supabase/useSupabaseSync.ts`; both stores | Sign in as A, sign out, sign in as B on the same device. B must never receive A's local state. | One globally persisted snapshot is merged and immediately pushed for whichever account signs in. | Account-scoped local buckets plus an explicit anonymous bucket; no implicit cross-account merge; regression tests model A/B/anonymous transitions. |
| DATA-02 | 1/2 | `packages/core/src/store/primedex.ts`; `src/store/primedex.ts`; both sync hooks | Seed web-only synchronized fields, sign into mobile, change a favorite, then reopen web. All web fields must remain. | Core's smaller snapshot upserts the complete JSONB column and removes web-only fields. | Shared versioned envelope preserves unknown fields during every read/write; old flat snapshots are accepted. Mixed-client test proves preservation. |
| DATA-03 | 2 | `src/lib/supabase/sync-state.ts`; `packages/core/src/supabase/sync-state.ts` | Delete an item on one client and update another client; deletion must not be resurrected and caps must hold. | Union merges resurrect deleted data, whole snapshots race, and teams/compare lists can exceed UI limits. | Field timestamps/revision-aware merge with deterministic invariant enforcement and optimistic retry; unit tests cover delete, conflict, and limits. |
| DATA-04 | 2 | web/core Zustand persistence and import/export paths | Corrupt or old import and failed hydration must leave a usable store. | Imports lack runtime schema/version handling; failed hydration can remain unresolved. | Versioned validated import with non-destructive rejection, migration defaults, and settled hydration state; tests cover malformed/v1/current snapshots. |
| MOBILE-01 | 7 | `packages/core/src/store/primedex.ts`; `apps/mobile/src/providers/AppProviders.tsx` | Import the core store in a React-Native-shaped runtime with no `navigator.language`. | Native `window` may exist while `navigator.language` is undefined, causing `.split` during module initialization. | Platform-neutral default language and post-hydration native locale bridge; import regression test. |
| MOBILE-02 | 7 | `apps/mobile/package.json`; `apps/mobile/metro.config.js`; root package metadata | Build the production Metro graph; exactly one React runtime must resolve. | Mobile pins React 19.0.0 while root/core resolve 19.2.6 and Metro allows hierarchical lookup. | Pin/resolve Expo-compatible React consistently and force Metro aliases; validate a production export and resolution test. |
| MOBILE-03 | 7 | `packages/core/src/supabase/AuthProvider.tsx`; native platform adapters | Configure Supabase on native; provider must mount and use a deep-link redirect. | Browser-only `window.location` reads crash on native. | Inject platform redirect/origin adapter; Expo uses `primedex` deep links; type and native-shaped tests cover the adapter. |
| LOGIC-01 | 3 | `src/lib/breeding-engine.ts`; `src/lib/__tests__/breeding-engine.test.ts` | Two perfect parents, Destiny Knot, six requested perfect IVs should yield `1/32`. | Approximation returns an inflated probability and the test accepts any value in `(0,1]`. | Exact combinatorial calculation and table-driven canonical fixtures. |
| LOGIC-02 | 3 | `src/app/quiz/page.tsx` | Start Time Attack, answer incorrectly, wait for feedback. The next question must load and the timer continue. | State remains `answered`; timer only runs in `playing`, so the game stalls. | Separate feedback from round/timer progression; fake-timer regression test. |
| LOGIC-03 | 3 | `src/lib/api/graphql.ts`; TCG API/query consumers | Expired cache or failed GraphQL response must refetch/throw a recoverable error. | Stale cache is accepted and failures are cached as empty successful results. | Respect expiry, reject malformed/error responses, preserve useful prior data, and test failure/retry. |
| LOGIC-04 | 3 | TCG catalog, collection, wishlist, deck and filter query paths | Search/collection failure must show error/retry; a late-set wishlist card must resolve without loading every set. | Full catalog fan-out and ignored errors create false empty or infinite loading states. | Bound pagination/direct-ID lookup, complete query keys, and explicit aggregate loading/error/retry states. |
| LOGIC-05 | 3 | `src/components/ev-iv/EVIVCalculator.tsx` | Empty or impossible actual stats must not produce a valid IV range. | Zero/default or impossible inputs display `0–31` as if valid. | Require complete stats and render a no-solution state; unit/component tests. |
| PWA-01 | 4 | `src/proxy.ts`; generated `sw.js`; `public/push-worker.js` | Production `HEAD /sw.js` and `/push-worker.js` must return JavaScript without redirects. | Reproduced locally: both return `308` to `/en/...`, preventing reliable registration/import. | Exclude worker/static paths from locale handling; production header, registration, and offline tests. |
| UX-01 | 5 | `src/app/pokemon/[name]/PokemonDetailClient.tsx` | At every breakpoint all detail actions remain reachable. | Desktop/tablet/mobile action sets differ; `640–767px` loses actions. | One responsive action model with equivalent controls and announcements; breakpoint tests. |
| UX-02 | 5 | `src/components/pokemon/PokemonCard.tsx`; TCG wishlist controls | Keyboard interaction with cards/actions must have one interactive owner per control. | Buttons are nested in links/buttons. | Separate navigation and action controls with clear names; accessibility tests. |
| UX-03 | 5 | modal/dialog components, charts, heat map, mobile forms | Dialogs must trap/restore focus; charts need an accessible equivalent; forms need labels/errors. | Several hand-rolled dialogs and visual-only charts omit required keyboard/screen-reader behavior. | Reuse existing dialog primitives, add focus and table/text alternatives, labels and live errors; focused component tests. |
| UX-04 | 5 | settings, favorites, compare/types/TCG, destructive actions | Important controls must be discoverable; failures must not masquerade as empty; destructive operations need recovery. | Settings opener is absent, error paths appear empty, and deletes are immediate. | Add settings entry, retry states, and confirmation/undo for local destructive actions. |
| I18N-01 | 6 | web/core bundles, mobile keys, locale links | French and each supported locale must render localized controls and retain prefix on internal navigation. | Missing keys/default English strings and unprefixed links cause English leakage and redirects. | Fill affected eight-locale keys and move links to locale helpers; key-parity and href tests. |
| I18N-02 | 6 | mobile translation keys and detail labels | Switch mobile locale; visible text and labels must translate. | 27 of 39 static mobile keys are absent from every bundle; several controls are hard-coded English. | Map to canonical keys/add a tested mobile namespace across eight bundles. |
| MOBILE-04 | 7 | mobile search, cache, hydration, theme and type badges | Search unloaded Pikachu and relaunch offline after caching; persisted state must be stable. | Search only filters loaded pages, API cache is web-only, UI mutates before hydration, and type/text contrast fails. | Use name index, native cache adapter, app-shell hydration gate, semantic contrast tokens; unit tests plus device validation. |
| CI-01 | 8 | `.github/workflows/ci.yml`; root scripts and TypeScript config | A PR must validate web build, core, and mobile types. | CI omits build/core/mobile and root TS excludes those workspaces. | Add explicit aggregate scripts and CI jobs; run them under Node 22. |
| CI-02 | 8 | `vitest.config.ts`; web/core test imports | A web test must resolve the same module as production. | Alias redirects several `@/` imports to core copies. | Restore production aliases and test core through its package/own project; resolver regression test. |
| DOC-01 | 8 | legal bundles, READMEs, `ai.txt`, `llms*.txt`, OpenSearch | Published claims must describe implemented data use, locales, routes and CI. | Privacy/cookie claims and AI-discovery facts contradict code. | Correct factual text in all affected locales and add static consistency tests where practical. |

## Explicitly deferred or downgraded items

- A nonce-based CSP migration is not required to fix the demonstrated JSON-LD XSS and would affect Next's inline framework scripts. The batch keeps the strict existing host policy and removes the executable payload path. A nonce migration remains a separately scoped hardening project.
- Strong cryptographic proof of quiz gameplay cannot be implemented without a server-owned run/challenge authority and production secret lifecycle. Batch 1 prevents direct database forgery and constrains submissions; it does not claim tournament-grade anti-cheat.
- Private Realtime channel authorization and SQL policies require an isolated Supabase project or local Supabase test environment to prove runtime policy behavior. The migration will be additive and reviewed, but will not be deployed here.
- Full mobile parity (TCG, Nuzlocke, quiz, comparison, etc.) is outside this hardening scope because its absence is not a regression in the existing native application.

## Implementation batches and ownership

The coordinator owns `package.json`, lockfiles, TypeScript/Vitest/Next configuration, global providers, shared synchronization contracts, migrations, and global styles. Every delegated batch must receive exclusive file ownership and return a patch for coordinator review before integration.

1. **Security, privacy, authorization and immediate data loss** — safe JSON-LD, public-profile projection, poller fail-closed/endpoint validation, leaderboard and battle input/migration hardening, immediate sync preservation safeguards.
2. **Synchronization, persistence, import/export and account isolation** — shared envelope, backwards-compatible migration, unknown-field preservation, account buckets, conflict/cap rules, tests.
3. **Business logic and caches** — breeding, quiz, GraphQL, TCG loading/query identity, EV/IV.
4. **PWA routing** — worker/static bypass, update/offline validation.
5. **Accessibility, navigation and state feedback** — detail actions, semantic controls/dialogs, errors, recovery, contrast.
6. **Localization and locale-aware navigation** — eight-bundle completion and URL helpers.
7. **Mobile reliability/shared-core inconsistencies** — native-safe globals/auth/react/cache/hydration/search.
8. **Tests, CI, SEO, docs and low-risk performance** — production aliases, CI coverage, sitemap/structured data, factual docs, image/request improvements.

## Compatibility and migration rules

- Database migrations are additive, idempotent where possible, and never applied to a remote project in this task.
- Existing flat `user_state.data` is readable during the transition. New clients preserve unknown fields so older clients cannot erase newer fields.
- Persisted import is validated before replacing any current state. Invalid input reports an error and leaves the existing state untouched.
- Account transitions retain an anonymous bucket and never silently copy one authenticated account into another.
- Sync conflict behaviour is deterministic, field-scoped, capped for UI invariants, and covered with mixed-version tests.

## Validation gate

After each batch: targeted tests, affected typechecks, and a source review for unrelated changes. Final validation uses Node 22.23.1:

```bash
npm run lint
npm run typecheck
npm run test -- --run
npm run build
npx tsc --project packages/core/tsconfig.json --noEmit
npm run typecheck --workspace=@primedex/mobile
```

The final browser pass covers production worker headers/registration, English and French routes, light/dark themes, desktop/tablet/mobile, keyboard interaction, console/network errors, and no-Supabase local-first mode. Database-policy and native-device claims remain explicitly unverified if no isolated service/device is available.
