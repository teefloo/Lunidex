# PrimeDex README refresh design

**Date:** 2026-07-20
**Status:** Approved for specification review

## Goal

Refresh the repository documentation so that the English README is an accurate,
concise entry point to the current PrimeDex monorepo and each of the eight
localized READMEs communicates the same product and setup information in its
own language.

## Scope

- Rewrite `README.md` and `README.{fr,es,de,it,ja,ko,zh,pt}.md`.
- Retain the existing PrimeDex icon and both repository screenshots in the
  English README header.
- Keep the README in GitHub-flavoured Markdown, with a compact navigation row,
  useful technology badges, tables, and GitHub admonitions where they clarify
  important setup behaviour.
- Describe the web app, the shared `@primedex/core` package, and the Expo
  mobile app as one npm-workspaces monorepo.
- Base all claims on the checked-in implementation and package manifests.

## Information architecture

Each README will have the following concise flow:

1. Centred project identity: icon, title, one-sentence value proposition,
   relevant badges, live-site link, and language switcher.
2. Product overview and a grouped feature table covering the Pokédex, trainer
   tools, TCG workspace, local-first features, PWA behaviour, and mobile app.
3. Local development: Node 20+, npm install, `npm run dev`, expected localhost
   URL, and the required locale-prefix behaviour.
4. Optional configuration: public environment variables, local-first fallback,
   and the Agentation development toggle.
5. Scripts and project layout, including the web, shared core, mobile, and
   Supabase migration directories.
6. Architecture and data sources: App Router, TanStack Query, Zustand with
   IndexedDB/AsyncStorage adapters, i18n, PokéAPI, and TCGdex.
7. Deployment and non-commercial fan-project trademark attribution.

The README will not add dedicated license, contributing, changelog, or contact
sections. Links to the existing license and issue tracker may remain in the
compact header or footer when helpful.

## Accuracy decisions

- State that the web app supports eight UI locales: English, French, Spanish,
  German, Italian, Japanese, Korean, and Simplified Chinese. Portuguese remains
  a translated repository README but is not presented as a supported web UI
  locale.
- Use the source-backed National Pokédex total of 1,025 Pokémon across nine
  generations.
- Include implemented routes and tools missing from the old README, such as
  abilities, items, Nuzlocke tracking, TCG deck building, price alerts, and
  the Expo mobile companion. Do not advertise unreleased mobile parity.
- Describe the application as local-first rather than claiming all data is
  server-fetched: UI state persists locally, while Pokémon and TCG catalog data
  are read through the API layer and cached.
- Present Supabase and web push as optional enhancements, never prerequisites
  for local development.

## Localization

The English README is the content source. The eight localized READMEs will
preserve the same section order, technical commands, paths, URLs, environment
variable names, badge targets, screenshots, and factual claims. Prose and table
labels will be idiomatic in each target language; code blocks will stay in
English and executable.

## Verification

- Inspect the diff to confirm that exactly the nine README files and this
  specification are changed by this task.
- Verify all local Markdown links and image paths resolve to tracked files.
- Check that the language switcher points to all eight localized documents.
- Search the final READMEs for outdated claims: nine web locales, Portuguese
  web routing, and missing route/tool coverage.
- No application build or test run is required because this change modifies
  documentation only.
