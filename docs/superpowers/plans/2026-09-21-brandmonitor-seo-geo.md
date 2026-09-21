# BrandMonitor SEO/GEO implementation plan

## Required sub-skills

- `seo-geo` for search/entity/schema decisions.
- `pagespeed-insights` for the mobile LCP work.
- `test-driven-development` for registry, schema and performance boundary changes.
- `verification-before-completion` before reporting results.

## Global constraints

- Work in the current user-authorized checkout and leave changes uncommitted.
- Use Node.js 22 when available and the committed npm lockfile.
- Do not deploy, publish, post externally, create backlinks, add reviews, migrate data or rename historical `primedex` identifiers.
- Preserve the eight locale runtime and the existing English/French editorial indexing policy.

## Implementation tasks

1. Extend the editorial registry with Cardmarket, value-guide sources/evidence metadata, dates and expanded TCG comparison rows.
2. Add the value-guide rendering contract: evidence table, optional sources, four FAQs and source citations.
3. Add complete English/French value-guide and Cardmarket copy; extend all TCG comparison matrices with wishlist, Pokédex, team builder, open source and limits.
4. Enrich the localized collection pillar and retarget the generic Pokédex/team/account/TCG guide copy without unsupported scanner, store or valuation claims.
5. Strengthen entity JSON-LD, creator references, internal links, sitemap/AI assets and remove duplicate comparison breadcrumbs.
6. Defer non-critical client bridges, remove the root blocking loader and keep required providers synchronous.
7. Add the 28-prompt coverage report and the legitimate off-site authority roadmap.
8. Run focused tests, full tests, lint, type checks, build, SEO checks and local route/schema checks. Record any environment limitations.

## Review focus

- No unsupported feature or market claim is introduced.
- New indexable pages are useful, distinct and linked from existing hubs.
- No duplicate canonical, breadcrumb, main landmark or H1 is introduced.
- The idle boundary does not delay authentication, localization, navigation or local-first state.
- The final report distinguishes code-controlled coverage from external reputation gaps.
