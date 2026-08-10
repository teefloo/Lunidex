# Lunidex Field Lab — Landing Design

## Status

Validated direction: luminous parchment field, DOM-first scroll world, no new 3D renderer.

This specification replaces the dark-only Archive Corridor treatment of the public landing while preserving the existing product routes, technical compatibility names, SEO surface, and local-first behavior.

## Intent

Present Lunidex as **the Pokémon universe in one place**: a complete Pokédex, a practical team and battle workspace, a personal Living Dex/progress layer, and a Pokémon TCG collection desk. The visitor should understand the product through a single continuous visual object that changes function as the page advances.

The visual idea is **Digital Pokémon Field Lab**: a contemporary field notebook and collector’s desk rebuilt as a warm digital instrument. The interface is tactile and lightly retro-futurist without becoming pixel-art, a game UI clone, or a generic SaaS dashboard.

## World sentence

Scroll through the Lunidex field lab as one research terminal turns a Pokémon specimen into a balanced team, a personal progress record, and a connected TCG collection.

## Interaction contract

Native document scroll is the source of truth for the journey. The scroll conductor derives exact and smoothed progress, updates one persistent sticky stage, and never hijacks the wheel, touch, keyboard, or browser history. Pointer interaction is additive: fine pointers may produce restrained card tilt and depth response, while keyboard and touch use the semantic DOM controls.

## Direction options considered

### Selected — DOM-first Field Lab

One persistent `position: sticky` stage contains the terminal, specimen sheets, team roster, progress dial, and card stack. Semantic chapter sections remain in the DOM as reading content and stable scroll anchors. CSS transforms, opacity, color-mix, and a single scroll conductor provide depth without a canvas dependency.

Benefits: strongest accessibility and SEO fallback, no WebGL failure mode, lower transfer and memory cost, easier i18n and responsive art direction, and direct reuse of existing sprite/card components.

### Not selected — OGL / WebGL hybrid

A persistent canvas could supply extra camera depth, but the requested landmark is made of real product UI, sprites, and cards. A canvas would add loading, fallback, context-loss, profiling, and DOM synchronization cost without adding product meaning.

### Not selected — independent editorial sections

Independent feature blocks would be reliable but would weaken the central transformation from specimen to team to progress to collection.

## Visual bible

### Foundation

- Canvas: warm parchment and off-white surfaces from the existing Lunidex token system.
- Ink: deep umber for headings and catalog metadata.
- Action: terracotta for primary action, active progress, and terminal highlights.
- Support: desaturated sky blue for compare/data surfaces and structural lines.
- Type colors: use exact existing type colors only beside the Pokémon or analysis that owns them; do not turn the page into a rainbow background.
- Dark surfaces: allowed for terminal interiors, data plots, card frames, and contrast blocks, never as the full page mood.

### Typography

- `Pixelify Sans` remains the display voice for the hero, chapter titles, specimen names, and large counters.
- `Nunito` remains the reading voice for body copy, navigation, and controls.
- The existing monospace stack labels specimen numbers, set IDs, stats, progress values, and small metadata.
- Large display copy uses restrained negative tracking; wide tracking is reserved for short metadata labels.

### Geometry and surface language

- Keep the existing near-square Lunidex frames, crisp borders, and small offset pixel shadows.
- TCG cards retain their physical `2.15 / 3` ratio and only use their documented rounded treatment.
- The Field Lab stage uses thin rules, registration marks, a low-contrast coordinate grid, clipped paper sheets, and a central terminal aperture.
- Avoid blobs, blanket glassmorphism, giant gradients, fake testimonials, device mockups, and decorative Pokémon clichés.

### Motion grammar

- Scroll-linked transforms expose continuity: layers separate, rotate by a few degrees, scale, and crossfade into their next semantic role.
- Headings reveal word by word once, with approximately 20px vertical offset, 0.8s duration, and 70ms stagger.
- Ambient motion is slow and sparse; no bouncing, large rotations, permanent cursor trails, or two-second button animations.
- `prefers-reduced-motion: reduce` shows the full story in a static, readable composition and disables scroll-scrubbed transforms, tilt, ambient drift, and stagger.

## Chapter ledger

Each chapter owns a distinct understanding, landmark, and state change. Chapter IDs remain stable for anchors and debugging.

| ID | Visitor understands | Persistent landmark | Transformation | DOM proof | Primary route |
| --- | --- | --- | --- | --- | --- |
| `threshold` | Lunidex unifies the Pokémon and TCG journey | Field terminal, specimen plate, three card planes | Empty terminal resolves into a research instrument | H1, short promise, two CTAs, local-first note | `/tcg/collection`, `/pokedex` |
| `specimen` | The Pokédex is a usable research tool, not just a list | Pikachu specimen sheet | Terminal aperture opens into a Pokémon record | Number, type, stats, evolution, real artwork | `/pokedex` |
| `team` | The record becomes a team decision | Six-slot roster and coverage strip | Specimen card docks into a six-Pokémon roster | Six real Pokémon, type chips, weaknesses/resistances, coverage | `/team` |
| `progress` | Lunidex remembers personal progress | Living Dex counter and progress dial | Roster compresses into personal state | `742 / 1025` sample, caught/favorites/badges, local note | `/dashboard`, `/favorites` |
| `cards` | The same workspace extends to TCG collection | Flipping card stack and set album | Specimen plate becomes a physical TCG card | Real card imagery, set progress, owned/missing/wishlist labels | `/tcg`, `/tcg/collection` |
| `connected` | All surfaces belong to one companion | Terminal with connected records | Cards, team, progress, and types orbit a common index | concise synthesis, GitHub link, no account explanation | `/en` equivalent localized root |

### Exact sample data policy

The landing may use curated, static examples to communicate existing capabilities. The progress number `742 / 1025` is explicitly labeled as a preview/example and is not presented as the visitor’s personal state. Where the browser store is already hydrated, the collection CTA continues to resolve through `resolveCollectionEntry`; the landing does not invent a new persisted state or fetch a full remote catalog.

## Page architecture

```text
Home (server component)
  HomeFieldLabExperience
    HomeHeader (fixed, light field, scrolled state)
    HomeFieldWorld (client boundary)
      sticky stage
        terminal shell
        specimen / team / progress / card visual layers
        background field and registration marks
      semantic chapter sections
        chapter copy, headings, links, proof lists
    HomeLocalFirst (server content)
    HomeOpenSource (server content)
    HomeFaqSection (existing SEO FAQ, visually quiet)
  SiteFooter (existing)
```

The route remains `src/app/page.tsx`. Existing home components may be replaced or simplified behind the `src/components/home/` boundary. No other route, store, package identifier, public domain, or mobile surface is renamed.

### Client boundaries

- The page and translated chapter copy remain server-rendered.
- The sticky stage and scroll conductor are client-only because they read layout, scroll, media queries, and pointer input.
- The scroll conductor owns one `requestAnimationFrame` loop at most, writes CSS custom properties on the stage, and cancels it on unmount, hidden tab, reduced motion, and offscreen state.
- `IntersectionObserver` updates the active chapter and pauses non-visible decorative animations.
- No component subscribes to the full Zustand store. Only the existing collection entry uses the narrow hydrated slices it already needs.

## Content and localization

The new visible strings use the existing `@/lib/i18n` system and are added to all supported bundles: `en`, `fr`, `es`, `de`, `it`, `ja`, `ko`, and `zh`. English is the source copy; all locales keep equivalent chapter meaning, action labels, and FAQ semantics. The i18n parity test remains green.

Visible feature claims are limited to behavior documented by the repository: complete Pokédex coverage, Pokémon detail data, team/type analysis, Living Dex and personal progress, TCG catalog/sets/collection/wishlist/decks, local-first use without an account, optional synchronization when available, PWA/mobile access, and open-source development.

All internal links use `localeHref` or the established locale-aware entry helper. GitHub uses the canonical `GITHUB_REPO_URL`; no stars, testimonials, partner logos, or social proof are invented.

## Navigation and conversion

The header begins as a transparent paper-field lockup and gains a thin surface/border after the first meaningful scroll. Desktop navigation exposes Pokédex, TCG, Tools, and GitHub plus `Open Lunidex`. Mobile uses a 44px menu trigger and keeps the CTA reachable.

Primary CTAs use the existing local collection-entry resolver so a returning collector sees a resume action. Secondary CTAs link directly to the Pokédex. The final CTA repeats the same entry behavior without duplicating business logic.

## Responsive composition

- `320px`, `375px`, and `414px`: one-column chapter reading order, terminal layers reduced to the focal specimen/card, no horizontal overflow, touch targets at least 44px.
- `768px`: tablet composition keeps the sticky stage but reduces depth and separates copy from dense visual overlays.
- `1024px` and wider: two-plane editorial layout with chapter copy and stage relationship visible at once; cards may use three depth layers.
- `1440px` and `1920px`: generous negative space, capped content width, stage landmark never touches the header or footer.
- Mobile removes optional pointer tilt and reduces decorative layers/blur before reducing content. All chapter headings, proof, and links remain in reading order even if the visual stage simplifies.

## Accessibility and fallback

- Use semantic `header`, `nav`, `main`, `section`, `article`, `figure`, headings, lists, and real links/buttons.
- Keep the full accessible heading text unsplit; decorative split words are `aria-hidden`.
- Decorative stage layers are `aria-hidden` and pointer-transparent; meaningful Pokémon/card content has alt text or a text equivalent in the chapter DOM.
- Preserve visible keyboard focus and skip-link behavior. Never make a CTA depend on the scroll animation completing.
- The no-JavaScript page is complete in its ordered chapter DOM; it loses only the sticky transformation.
- Under reduced motion, the story reads as sequential sections with static terminal states.
- Remote image failures keep the surrounding labels and links usable; card/sprite surfaces have a quiet placeholder or empty state consistent with existing components.

## Performance budget and safeguards

- No new renderer, shader, canvas, smooth-scroll library, or remote catalog preload.
- Critical first view contains the shell, hero copy, and only the minimum hero media; below-fold card and sprite media use existing optimized image behavior and lazy loading.
- CSS transforms and opacity are the only continuously updated properties. Avoid layout reads in the animation loop after measurement.
- One active scroll conductor; no nested RAF systems. Pause all decorative loops outside the viewport and when `document.hidden`.
- Limit blur and full-screen layers, cap any pointer response, and do not run effects under reduced motion.
- Re-measure anchors after fonts/layout settle and on width/orientation changes, not on noisy mobile URL-bar height changes.

## Verification plan

Before handoff, verify:

1. `git diff --check`, focused landing tests, lint, web typecheck, full Vitest, and production build.
2. Localized root routes for all eight languages preserve headings, internal links, metadata, and no missing translation keys.
3. Visual/interaction checks at 320, 375, 414, 768, 1024, 1440, and 1920 CSS px with no horizontal overflow.
4. Forward, reverse, fast-jump, anchor navigation, reload-at-depth, and resize preserve deterministic chapter state.
5. Keyboard traversal, visible focus, touch-sized controls, skip link, 200% zoom/reflow, and reduced-motion output.
6. Scroll conductor cleanup, hidden-tab pause, offscreen animation pause, and no stale listeners/RAF after route unmount.
7. Fresh-tab console and failed-request review; real asset provenance remains limited to project-approved PokéAPI/TCGdex and repository links.

## Out of scope

- New product capabilities, new account/sync behavior, new analytics, new API endpoints, or store schema changes.
- A full Three.js world, custom Pokémon models, generated Pokémon art, or Kage-derived assets/compositions.
- Changes to secondary route styling, mobile app styling, package names, storage keys, or public URLs.
- A new visual design system separate from `DESIGN.md` and `src/app/globals.css`.
