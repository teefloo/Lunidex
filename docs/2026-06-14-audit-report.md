# PrimeDex — Full Project Audit & Finalization

**Date:** 2026-06-14
**Scope:** Ship-blockers, code quality, test coverage, security, performance & SEO
**Result:** Delivery-ready — build, typecheck, lint, and tests all green.

---

## Final State

| Check | Before | After |
|-------|--------|-------|
| `tsc --noEmit` | pass | **pass** |
| `eslint .` | 3 warnings | **0 problems** |
| `vitest` | 1 file / 25 tests | **10 files / 106 tests** |
| `next build` | pass (178 pages) | **pass (178 pages)** |
| `npm audit` (prod) | 0 vulnerabilities | **0 vulnerabilities** |
| Working tree | 5 uncommitted files | **clean** |

---

## Track 0 — Ship-blockers

- Removed 3 unused imports (`GITHUB_REPO_URL`, `TWITTER_URL`, `DISCORD_URL`) from
  `src/app/layout.tsx`, clearing all ESLint warnings. The URLs remain available
  via `SOCIAL_PROFILES` (used in JSON-LD `sameAs`), so nothing was lost.
- Verified the in-flight design-token refactor across 5 files: every referenced
  CSS variable (`--action-favorite/compare/team/caught/legendary`) and utility
  (`glass-panel`, `animate-fade-in-up`) exists. The refactor also unified an
  inconsistency where the detail page used amber for the "team" action while the
  grid card used emerald — both now resolve to `--action-team`.
- Committed the verified refactor + lint fix.

## Track 1 — Code quality & consistency

Convention adherence (per `AGENTS.md`) is excellent: **0 raw `<img>`, 0 `any`,
0 `console.log`, 0 direct `fetch`/`axios` in components, 0 TODO/FIXME/HACK**.
All `eslint-disable` lines carry justifying comments.

Two pieces of dead/legacy code were removed:

- **`src/lib/i18n-resources.ts` (5,515 lines)** — entirely unreferenced;
  superseded by the per-locale bundles in `src/lib/i18n/`. Deleted.
- **`src/app/tcg/head.tsx`** — used the unsupported App Router `head.tsx`
  convention (silently ignored since Next 13), so its preconnect/preload hints
  were dead. Migrated the hints into `src/app/tcg/layout.tsx`, where they render
  into `<head>`, and deleted the file.

Also untracked `.claude/` (local agent artifacts) and added it to `.gitignore`.

## Track 2 — Test coverage

Raised coverage from 1 test file to 10 (25 → 106 tests), all deterministic and
network-free, using the existing jsdom + React Testing Library setup:

- `lib/utils` — formatting helpers and `cn` tailwind-merge behavior
- `lib/languages` — locale maps, `resolveLanguage`, alternates, language IDs
- `lib/seo` — breadcrumb / web-page JSON-LD, hreflang, locale hrefs
- `lib/pokemon-utils` — type colors, gradients, simulated rarity thresholds
- `lib/badges` — unlock conditions, progress clamping, next-badge selection
- `lib/team-analysis` — synergy scoring + defensive/offensive type analysis
- `components/ui` — `TypeBadge`, `Badge`, `ShinyIcon` (render + accessibility)

## Track 3 — Security & best practices

**No fixes required.** The app is well-hardened:

- Strong security headers: HSTS (preload), `X-Frame-Options: DENY`,
  `nosniff`, scoped `Permissions-Policy` (FLoC opted out), and a real CSP with
  allowlisted `img-src`/`connect-src` hosts.
- API routes validate and clamp inputs (e.g. `limit` capped at 96), allowlist
  the `lang` param before any URL use (no SSRF/injection), safely parse JSON,
  and cap stored collection entries (no unbounded cookie growth).
- `.env*` is gitignored; no secrets in the repo; 0 production vulnerabilities.

**Recommendations (deferred — out of scope for a finalization pass):**

- CSP `script-src` relies on `'unsafe-inline' 'unsafe-eval'`. A nonce-based CSP
  would harden against XSS but requires middleware changes and carries breakage
  risk; treat as a dedicated future task.
- The TCG collection cookie is `httpOnly: false` by design (client reads it). It
  holds no auth/session data, so the exposure is benign.

## Track 4 — Performance & SEO

**No fixes required.**

- SEO infrastructure is complete and correct: dynamic `sitemap.ts` with per-URL
  hreflang alternates and image entries, `robots.ts` with AI-bot rules and a
  sitemap pointer, full metadata + JSON-LD (WebSite, Organization, WebApplication,
  Speakable). Every advertised public asset exists (icons, `opensearch.xml`,
  `llms.txt`, `ai.txt`, screenshots) — no dangling references.
- Performance is well-architected: heavy components (`EvolutionChain`,
  `AdvancedInfo`, chart pages, etc.) are code-split via `next/dynamic`;
  `recharts` is confined to 3 lazy-loaded pages.

**Recommendation (deferred):**

- `framer-motion` is imported directly in 24 files, inflating client bundles.
  Consider lazy-loading motion or migrating simple animations to CSS. This is a
  broad, behavior-affecting change best handled as its own task.

---

## Commits in this audit

1. `refactor(ui): unify action accents via CSS vars + add focus rings`
2. `chore(cleanup): remove dead i18n-resources + migrate tcg head.tsx hints`
3. `chore: untrack .claude/ local agent artifacts`
4. `test: add coverage for core logic and key UI components`
5. `docs: add full audit & finalization report`
