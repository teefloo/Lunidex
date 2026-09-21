# BrandMonitor SEO/GEO design

## Goal

Improve Lunidex visibility for non-branded Pokémon reference and TCG collection intents while keeping the product claims source-backed and avoiding a thin page cluster.

## Public information architecture

- Keep `/guides/pokemon-card-collection-tracker` as the localized collection pillar.
- Add `/guides/pokemon-card-collection-value` as the value and sealed-portfolio guide.
- Add `/compare/lunidex-vs-cardmarket` as the Cardmarket comparison.
- Keep generic editorial routes indexable only in English and French. Other requested locales render the English canonical fallback and remain `noindex`.
- Keep `/tcg/sealed` private and excluded from public sitemaps.

## Content truth boundaries

- Lunidex is free to use, open source, local-first, and installable as a PWA.
- Personal collection and sealed-portfolio state requires the configured account/sync service.
- Card prices and collection values are estimates derived from upstream fields and are not appraisals or guaranteed market valuations.
- The current product has no verified scanner, current App Store/Google Play listing, subscription or payment flow.
- Cardmarket is described as a marketplace and public product/price source, not as an all-in-one Pokédex or team workspace.

## Structured data and performance

- Retain Organization, WebSite and WebApplication entities.
- Add a verified creator Person node and reference it from Article schemas without inventing profiles.
- Emit exactly one breadcrumb graph per comparison page.
- Move low-priority client bridges behind an idle boundary and remove the global full-screen loading mask so streamed page content can become the LCP element.

## Acceptance

- Every BrandMonitor prompt has a first-party page target or an explicit external-authority dependency.
- New and changed pages have answer-first copy, visible sources, canonical/hreflang/robots metadata and valid JSON-LD.
- Existing local-first, privacy, persistence, API and historical `primedex` contracts remain unchanged.
