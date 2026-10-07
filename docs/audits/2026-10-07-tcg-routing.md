# TCG routing audit, 7 October 2026

## Confirmed defects

- Set pages caught every upstream set error as `null` and every card-list error as `[]`. Metadata then emitted `notFound()` or `noindex` for a temporarily unavailable resource.
- The short TCG failure caches stored only a boolean. A second call during an outage returned missing data, even when the first set call had correctly thrown. Next's persistent cache could store that missing result for an hour. Cards had the same outage/missing ambiguity, and set-card failures could persist an empty list.
- A query selected the TCG data language, but canonical, hreflang, OG URL and breadcrumbs discarded it. Production `/ja/tcg/sets/PMCG1?tcgLang=ja` returned 200/indexable and canonicalized to `/ja/tcg/sets/PMCG1`, which returned 404. The set ID is from the actual Japanese TCGdex listing.

The fix propagates unavailable errors, preserves stale/English fallbacks and genuine missing responses, invalidates old persistent snapshots, and retains non-English data languages in detail-page SEO URLs. The English default keeps its existing clean URL. No design or completeness/indexability policy was changed.

## Base Set incident versus verified behavior

The supplied observation was a query-free Base Set 404 and an explicit-English 200. On this audit, both returned 200 in the browser on deployment `5c17e22e7d756db4cee77272c093d817795a6190`. The query-free response was a Vercel CDN HIT. Both declare `/en/tcg/sets/base1` as canonical. Code resolves both queries to exactly the same English loader arguments, so there is no deterministic branch that rejects only the query-free URL.

The outage-to-404 behavior above is reproduced by failing regression tests before the fix. Separate CDN entries for clean/query URLs can explain divergent cached statuses. The precise upstream failure or cache event behind the supplied Base Set observation is **not confirmed** without its historical request logs. No blanket set-route outage is claimed; Jungle works.

## Historical evidence

Reviewed all refs from `2026-09-01T00:00:00+02:00` to `2026-09-11T00:00:00+02:00`, including routing, params, metadata, API/cache code, robots, sitemaps and Vercel config.

| Commit | Relevant behavior | Assessment |
| --- | --- | --- |
| `f1237d07`, Sep 1 | Separates UI locale from `tcgLang`; defaults set/card details to English but keeps query-free SEO targets | Introduces regional canonical mismatch; precedes the visibility break |
| `ed08aac8`, Sep 2 | Removes duplicate layout metadata; Pokémon page still owns localized canonical/metadata | No demonstrated lost metadata or invalid rewrite |
| `e1e0d78e`, Sep 7 | Replaces card noindex policy with public indexability | Does not demonstrate a new indexing block |
| `9b9ca1ac`, Sep 7 | Fixes `/pokemon` index redirect to localized Pokédex | Does not match Pokémon detail or set routes |
| `393e594c` / `03c6eb6b`, Sep 7–8 | Adds Sentry instrumentation | No demonstrated routing/indexability failure |
| `74248d1b`, Sep 8 | Reduces TCG timeout 30s → 10s and retries 3 → 1; caches resource probes | Can amplify existing upstream-failure behavior, but arrives after the Sep 7 drop |
| `dd1a7dc5`, Sep 18 | Adds boolean TCG failure cooldowns | Confirmed current bug, too late to cause the initial break |

The set-page broad catch existed in `cfdd1187` on Aug 25. No TCG `generateStaticParams`/`dynamicParams` restriction or sitemap/robots change that establishes the Sep 6–8 cause was found. Locale stripping rewrites remain in `next.config.ts`; proxy forwards the authoritative URL locale. Pricing/valuation changes on Sep 1–10 do not establish an SEO cause. Vercel returned production deployments for Sep 8–10, including `74248d1b`; that response cannot establish historical deployment timing for Sep 1–7.

GSC date rows confirm 8,068 impressions on Sep 6, 1,272 on Sep 7, 142 on Sep 8. Detailed page rows for Sep 1–6 total 54,798 impressions, of which only 2,482 are TCG; Sep 7–10 total 1,604, of which 149 are TCG. These page-grouped totals differ from property-grouped totals. The collapse includes Pokémon/moves and cannot be attributed solely to the TCG defects. Base Set is discovered/not indexed with no recorded crawl; Jungle is unknown to Google. Pikachu remains submitted/indexed, last crawl Sep 16. None proves the initial global cause.

## Verification

- Node 22.22.3; `npm run lint`, `npm run typecheck`, `npm run seo:check`, core TypeScript check and `npm run build`: passed.
- `npm test`: 116 files, 570 tests passed. Tests include live local HTTP fixtures for canonical-to-404, dropped data language and missing sitemap entries. No dedicated project E2E runner/config is present.
- `node scripts/tcg-route-audit.mjs --base http://localhost:3105 --catalog /tmp/lunidex-production-tcg-audit.json --skip-sitemaps --output /tmp/lunidex-local-tcg-audit.json`: 52 requests, 45 routes, zero failures. Base Set, Jungle, `30th`, French data variants and Japanese-only `PMCG1`; all eight UI locales through hreflang clusters. All checked canonicals returned 200; six sampled internal card links returned 200. The first real Japanese checklist link, `/ja/tcg/cards/PMCG1-001?tcgLang=ja`, also returned 200 with a self-canonical retaining `tcgLang=ja`. Every rendered TCG detail link was checked for locale/data-language consistency.
- All 17 actual TCGdex language listings were retrieved once; counts and identifiers are saved in the adjacent evidence JSON. Listing membership does not prove detail completeness. Production's eight English-data set sitemaps each contain 214 indexable entries, while the raw English catalog has 220. The existing completeness gate intentionally excludes incomplete sets.
- Browser production checks: Base Set clean/explicit English, Jungle EN/DE and Base Set FR all 200/indexable/self-canonical. Japanese `PMCG1?tcgLang=ja` is 200 with a 404 canonical on the unchanged deployment. `robots.txt` and all eight set sitemaps are 200; Base Set/Jungle are present in each. Canonical locale prefixes and default English data are coherent.
- CLI production audit stopped at the first Vercel 429 challenge, after catalog retrieval. Browser requests were accessible. This is a transport limitation; it does not prove that verified Googlebot is challenged.

## Remaining work

No push or deployment was authorized. Re-run the HTTP script after deployment without `--skip-sitemaps`, and verify the Japanese canonical and Base Set from the public domain. The script defaults to a bounded sample with a 100-request limit; `--all` and a larger explicit budget are available for a deliberate exhaustive run. Regional data variants keep their language query; the existing English-data sitemap policy is preserved. Review historical verified-Googlebot CDN/WAF logs, GSC coverage/manual actions and deployment records to establish the global visibility cause. Without usable stale/fallback data, an upstream outage now remains a server error rather than becoming a false missing page.
