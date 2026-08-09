---
name: Lunidex
description: A localized Pokémon companion and TCG collection dashboard built around a warm Soft Pixel field-compendium language.
project_id: "N/A — local repository; no Stitch project is linked to this workspace"
source_of_truth:
  - src/app/globals.css
  - src/components/ui/button.tsx
  - src/components/ui/input.tsx
  - src/components/ui/badge.tsx
  - src/types/pokemon.ts
  - src/lib/generation-themes.ts
  - apps/mobile/src/theme/colors.ts
color_encoding: "Runtime web tokens are authored in OKLCH. Hex values below are sRGB rendering references; preserve the OKLCH token as canonical."
colors:
  light:
    background: "oklch(0.945 0.028 85) / #F5ECD8"
    foreground: "oklch(0.17 0.045 60) / #1D0900"
    card: "oklch(0.985 0.012 85) / #FEFAF1"
    primary: "oklch(0.72 0.110 45) / #DE8E69"
    accent: "oklch(0.80 0.050 240) / #A1C3DB"
    border: "oklch(0.74 0.060 75) / #C1A681"
  dark:
    background: "oklch(0.16 0.012 50) / #120C09"
    foreground: "oklch(1.0 0 0) / #FFFFFF"
    card: "oklch(0.22 0.015 55) / #201914"
    primary: "oklch(0.80 0.100 45) / #F4A988"
    accent: "oklch(0.87 0.040 235) / #BCD9EB"
    border: "oklch(0.40 0.030 60) / #544438"
typography:
  display: "Pixelify Sans, 400/500/600/700"
  body: "Nunito, 400/600/700"
  mono: "ui-monospace, SFMono-Regular, Menlo, Consolas, Liberation Mono"
geometry:
  radius: "0.125rem default; 0.25rem Tailwind large token"
  border: "3px for framed surfaces; 2px for compact controls"
  touch_target: "2.75rem minimum"
---

# Design System: Lunidex

**Project ID:** N/A — this file documents the local Lunidex repository; no Stitch project ID is available in the current workspace.

**Scope:** The canonical system below describes the Next.js web application. Expo mobile has a separate runtime theme and is documented at the end; do not mix its tokens into web screens.

**Audited:** 2026-08-09

## 1. Visual Theme & Atmosphere

### Creative north star: “The Soft Pixel Field Compendium”

Lunidex should feel like a collector’s field guide rebuilt as a focused digital instrument: warm, tactile, playful, and unusually deliberate. The interface combines the friendliness of a Pokémon companion with the density of a catalog or research desk. It is not generic SaaS glassmorphism and it is not a strict 8-bit recreation. The personality comes from near-square frames, offset pixel shadows, specimen metadata, Pixelify Sans headlines, and type-driven color.

The default web mood is a warm parchment workspace with terracotta actions and desaturated sky-blue support accents. Dark mode becomes a deep brown-black workspace with lifted, readable accents. Pokémon sprites, type colors, and TCG artwork provide the strongest moments of saturation; surrounding UI stays quiet so the content remains the subject.

The product is a functional dashboard first. Every decorative treatment must preserve scanability, collection progress, filtering, comparison, and localized reading. Use texture and motion as a light layer of character, never as a competing visual hierarchy.

### Visual principles

- **Warm, not sterile:** cream, paper, umber, terracotta, and muted blue replace a neutral gray SaaS palette.
- **Tactile, not soft:** global frames use crisp borders and zero-blur offset shadows; depth reads like a physical card or label.
- **Catalogued, not ornamental:** small uppercase metadata, catalog numbers, rules, and specimen tags make dense data feel intentional.
- **Content-led color:** Pokémon types, TCG rarity, and meaningful states carry color; the primary brand accent stays purposeful.
- **Playful, not childish:** Pixelify Sans, the Pokéball mark, and card motion add game character while the layout remains editorial and practical.

### Source precedence

When a future screen needs a design decision, use this order of authority:

1. CSS custom properties and component classes in `src/app/globals.css`.
2. Shared shadcn/Base UI primitives in `src/components/ui/`.
3. Shared Pokémon and generation data in `src/types/pokemon.ts` and `src/lib/generation-themes.ts`.
4. Feature-local styling in the relevant route or component. Local styling may add a semantic exception for a chart, TCG card, quiz state, or illustration, but it must not silently redefine the global palette.

## 2. Color Palette & Roles

The web system is authored in OKLCH. The hex values in parentheses are 8-bit sRGB references for visual communication; the OKLCH declaration is the value to preserve in CSS.

### Light-mode foundation

| Semantic role | Canonical token | sRGB reference | Use |
| --- | --- | --- | --- |
| Warm parchment canvas | `--background: oklch(0.945 0.028 85)` | `#F5ECD8` | Page background and quiet empty states. |
| Dark umber ink | `--foreground: oklch(0.17 0.045 60)` | `#1D0900` | Body text, headings, and high-priority content. |
| Paper card | `--card: oklch(0.985 0.012 85)` | `#FEFAF1` | Cards, toolbars, panels, popovers, and control surfaces. |
| Soft terracotta primary | `--primary: oklch(0.72 0.110 45)` | `#DE8E69` | Primary actions, active states, progress, focus, and selected navigation. |
| Primary ink | `--primary-foreground: oklch(0.22 0.060 45)` | `#300F01` | Text and icons on the filled primary color. |
| Desaturated sky accent | `--accent: oklch(0.80 0.050 240)` | `#A1C3DB` | Secondary information and compare-oriented accents. |
| Accent ink | `--accent-foreground: oklch(0.16 0.040 240)` | `#000F1C` | Text on accent surfaces. |
| Quiet secondary | `--secondary: oklch(0.92 0.020 85)` | `#EBE4D6` | Muted controls, segmented backgrounds, and secondary panels. |
| Muted copy | `--muted-foreground: oklch(0.17 0.060 70)` | `#1F0800` | Supporting text; opacity utilities usually soften it further. |
| Warm border | `--border: oklch(0.74 0.060 75)` | `#C1A681` | Default frame and control boundary. |
| Strong warm border | `--border-strong: oklch(0.68 0.055 75)` | `#AD9473` | Emphasis and stronger separators. |
| Destructive coral | `--destructive: oklch(0.70 0.090 20)` | `#D18887` | Delete, reset, error, and favorite action color when mapped through `--action-favorite`. |

The explicit metadata colors in `src/lib/site.ts` are a separate integration layer: `PRIMARY_COLOR` is `#E8916B`, `ACCENT_COLOR` is `#A8C5E0`, and `BACKGROUND_COLOR` is `#211A17`. Use those values for metadata, OG assets, and browser-facing integration where the source calls for them; do not treat them as replacements for the runtime CSS tokens above.

### Dark-mode foundation

The `.dark` class preserves the same roles while moving the canvas to warm brown-black and lifting the actionable colors for contrast.

| Semantic role | Canonical token | sRGB reference | Use |
| --- | --- | --- | --- |
| Brown-black canvas | `--background: oklch(0.16 0.012 50)` | `#120C09` | Dark page background. |
| White foreground | `--foreground: oklch(1.0 0 0)` | `#FFFFFF` | Main text and headings. |
| Raised brown card | `--card: oklch(0.22 0.015 55)` | `#201914` | Cards, popovers, and controls. |
| Lifted terracotta | `--primary: oklch(0.80 0.100 45)` | `#F4A988` | Primary actions and focus states. |
| Lifted sky | `--accent: oklch(0.87 0.040 235)` | `#BCD9EB` | Secondary accent and information. |
| Brown border | `--border: oklch(0.40 0.030 60)` | `#544438` | Frames and separators. |
| Dark pixel shadow | `--pixel-shadow: oklch(0.10 0.010 50)` | `#050302` | Offset depth on dark surfaces. |

Dark mode also lifts all type colors and action colors. The browser theme colors are explicitly `#F4EAD5` for light and `#211A17` for dark in `src/app/layout.tsx`.

### Semantic action accents

These are reserved for actions and status, not general decoration.

| Role | Light token | Dark token | Use |
| --- | --- | --- | --- |
| Favorite | `--action-favorite: oklch(0.70 0.090 20)` | `oklch(0.75 0.100 22)` | Favorite and remove-favorite states. |
| Compare | `--action-compare: oklch(0.68 0.090 250)` | `oklch(0.74 0.095 252)` | Compare controls and selected comparison items. |
| Team | `--action-team: oklch(0.72 0.090 162)` | `oklch(0.78 0.095 164)` | Add/remove from team. |
| Caught | `var(--primary)` | `var(--primary)` | Living-Dex completion and caught state. |
| Legendary | `--action-legendary: oklch(0.82 0.090 80)` | `oklch(0.87 0.090 80)` | Legendary and mythical specimen label. |

### Pokémon type palette

`TYPE_COLORS` in `src/types/pokemon.ts` is the shared, exact hex palette used by badges, filters, type bars, charts, battle views, and inline card gradients. It is intentionally more saturated than the neutral shell.

| Type | Hex | Type | Hex |
| --- | --- | --- | --- |
| Normal | `#A8A77A` | Fire | `#EE8130` |
| Water | `#6390F0` | Electric | `#F7D02C` |
| Grass | `#7AC74C` | Ice | `#96D9D6` |
| Fighting | `#C22E28` | Poison | `#A33EA1` |
| Ground | `#E2BF65` | Flying | `#A98FF3` |
| Psychic | `#F95587` | Bug | `#A6B91A` |
| Rock | `#B6A136` | Ghost | `#735797` |
| Dragon | `#6F35FC` | Dark | `#705746` |
| Steel | `#B7B7CE` | Fairy | `#D685AD` |

The `TypeBadge` and `type-accent` treatment uses the active type as `--type-color`: approximately 10–18% type color in the card fill, 45–55% in the border mix, and 80% in the text mix. Pokémon cards additionally use a 7%/5% type-tinted linear gradient and a hard `4px 4px` shadow at roughly 45% type opacity. Type charts and battle views may use the raw hex as a full-color swatch.

`src/app/globals.css` also declares lower-chroma `--type-*` OKLCH variables and lifted dark counterparts as a reserved semantic palette. Current web components generally pass the shared hex values through inline `--type-color`, so use `TYPE_COLORS` for actual Pokémon data and the `--type-*` variables only when a component explicitly opts into the CSS reserve.

### Generation themes

`GenThemeProvider` sets `data-gen="gen1"` through `data-gen="gen9"` on `<html>`. Each theme is a semantic recoloring of the same component geometry; it is not a new layout system.

| Theme | Primary | Accent | Canvas | Text | Notes |
| --- | --- | --- | --- | --- | --- |
| Default | `#C87941` | `#7AABCC` | `#FFF8E7` | `#5C4033` | Runtime base still comes from the Soft Pixel OKLCH root tokens; these values are used by the theme selector metadata. |
| Gen 1 / Kanto | `#E3350D` | `#003A8C` | `#FFF8E7` | `#1A1A1A` | Warm cream with red/blue game identity. |
| Gen 2 / Johto | `#FFD700` | `#C0C0C0` | `#1A3A1A` | `#F5F0D0` | Dark forest canvas; card and border are also overridden. |
| Gen 3 / Hoenn | `#9B2335` | `#0047AB` | `#006994` | `#FFFFFF` | Deep turquoise canvas; card and border are also overridden. |
| Gen 4 / Sinnoh | `#B0D4F1` | `#9966CC` | `#1A1A2E` | `#E8E0F0` | Night-blue canvas; card and border are also overridden. |
| Gen 5 / Unys | `#CC2222` | `#F5F5F5` | `#1C1C1C` | `#F5F5F5` | Near-black canvas; card and border are also overridden. |
| Gen 6 / Kalos | `#4169E1` | `#FF2400` | `#F0F4FF` | `#1A1A3A` | Light blue canvas; root card remains in use. |
| Gen 7 / Alola | `#FFB700` | `#6A0DAD` | `#E8F8F8` | `#1A2A3A` | Pale turquoise canvas; root card remains in use. |
| Gen 8 / Galar | `#CE1620` | `#0A4FA6` | `#F5F0F8` | `#1A0A2A` | Pale lavender canvas; root card remains in use. |
| Gen 9 / Paldea | `#FF2400` | `#8B00FF` | `#FFF0F0` | `#2A0A1A` | Pale rose canvas; root card remains in use. |

### Feature-local accents

TCG rarity, quiz answers, collection ownership, badges, and battle verdicts use local semantic colors such as emerald, red, amber, blue, violet, cyan, pink, and slate. These accents are intentionally allowed to be more vivid than the shell because they communicate card rarity or an immediate result. Keep their usage close to the data they label; do not promote a feature-local color to a global brand token without adding a documented role.

## 3. Typography Rules

### Typeface roles

- **Pixelify Sans** is the display voice. It is loaded through `next/font/google` at weights 400, 500, 600, and 700, then applied to all `h1`–`h6`, `.page-title`, hero headlines, modal titles, and specimen names.
- **Nunito** is the reading voice. It is loaded at weights 400, 600, and 700 and is the body stack for descriptions, controls, navigation copy, and localized content.
- **Monospace** (`ui-monospace`, SFMono-Regular, Menlo, Consolas, Liberation Mono) is reserved for catalog numbers, IDs, stats, technical values, chart labels, code, and compact field metadata.

Both web fonts use `font-display: optional` and metric-matched fallbacks. The body stack includes Hiragino Sans, Noto Sans CJK JP, and Microsoft YaHei so the eight supported locales do not break the hierarchy.

### Hierarchy

| Level | Implemented expression | Character |
| --- | --- | --- |
| Hero display | `clamp(2.75rem, 7vw, 6rem)` on the home hero; Pokédex hero uses `clamp(2.75rem, 9vw, 6.5rem)`, weight 800, line-height `.92` | Large, tightly cropped, immediate product promise. |
| Page title | `page-title`, display font, weight 700, line-height `1`, usually `text-3xl` → `text-6xl` across breakpoints | Editorial section anchor. |
| Section title | Usually `text-3xl` → `text-4xl`, weight 800/900, tight tracking | Strong but readable navigation through a dense page. |
| Card/specimen title | Display font, usually 1rem–1.25rem, semibold or black, tight tracking | Fast recognition of a Pokémon, set, tool, or card. |
| Body | 0.875rem–1rem, line-height 1.5–1.75, Nunito | Comfortable reading and localized copy. |
| Micro-label | 0.6875rem–0.75rem, bold/black, uppercase, `0.08em–0.22em` tracking | Filters, statuses, tabs, rarity, and actions. |
| Catalog metadata | 0.6rem–0.6875rem, monospace, uppercase, `0.12em–0.18em` tracking | Pokedex number, set code, stat, or accession-like detail. |

The display voice uses zero or slightly negative tracking for large headings. Wide tracking is reserved for short uppercase labels. Do not turn paragraphs into uppercase; it damages the multilingual reading rhythm. The legacy `gradient-text-*` helper classes intentionally resolve to `var(--foreground)` and must not be interpreted as permission to add gradient text.

## 4. Component Stylings

### Shapes, borders, and elevation

The default silhouette is nearly square: `--radius: 0.125rem`. Tailwind’s runtime mapping is `rounded-sm: 0`, `rounded-md: 0.125rem`, and `rounded-lg: 0.25rem` through `src/styles/shadcn-tailwind.css`. The canonical frame border is `3px`; compact controls generally use `2px` or a one-pixel utility border when they are intentionally quieter.

| Surface family | Geometry | Resting depth | Intended use |
| --- | --- | --- | --- |
| Framed surfaces | `var(--radius)`, 3px solid `--border` | `4px 4px 0 var(--pixel-shadow)` | `page-surface`, `section-frame`, `glass-panel`, `glass-surface`, `codex-frame`, main header, dialogs, and toasts. |
| Compact surfaces | `var(--radius)`, 2px solid `--border` | `2px 2px 0 var(--pixel-shadow)` | `glass-card`, `glass-control`, `glass-toolbar`, `type-accent`, tags, and small controls. |
| Plain content blocks | Small radius or no frame | Local border or no shadow | Editorial sections, table cells, filter rows, and feature-specific data panels. |

The core system is not flat at rest: its pixel offset is part of the identity. Hover normally moves an interactive element `-1px` on each axis and increases the offset; press moves it `2px` down/right and removes the shadow. Focus-visible uses a `2px` ring with a small offset, sourced from `--ring`. Soft blur shadows are permitted only for media, illustrations, charts, and feature-local overlays where the content needs atmospheric separation.

### Page shell and headers

- `.page-shell` centers content in `min(100%, 90rem)` with `1rem` horizontal padding, `1.5rem` from 640px, and `2rem` from 1024px. Many feature pages use a narrower `max-w-6xl` content column.
- `PageHeader` uses a framed panel, a small top gradient wash, a 56px icon tile, a `page-eyebrow`, a responsive `page-title`, muted description, and a 2px divider below.
- The home hero is intentionally more open than catalog screens: `max-w-6xl`, a one-column-to-two-column grid, `2rem` mobile gap / `3rem` desktop gap, and a masked 1.35rem primary-colored pixel grid with a restrained radial glow.
- The fixed header is a centered framed toolbar, positioned below the safe-area inset. It contains the Pokéball/Lunidex lockup, desktop navigation, search shortcut, favorites, locale selector, theme switch, settings, account, and a mobile sheet trigger.
- The logo combines a small Pokéball mark, “Luni” in bold display type, “dex” in an italic display treatment, and a compact `000 / 1025` progress readout with a 2px progress bar.

### Buttons and interactive controls

- Use the shared `Button` variants: filled primary, outline, secondary, ghost, glass, surface, destructive, and link. The filled primary is the strongest action; outline and glass controls are the default for supporting actions.
- Common sizes are 40–48px high; icon controls are 44px square. The `touch-target` utility guarantees a minimum `2.75rem` hit area even when the visible icon is smaller.
- Navigation, filters, tabs, rarity, and technical actions are often uppercase with tracked microcopy. Home CTAs and explanatory actions may remain sentence case. Case is semantic, not a universal button rule.
- Active states use primary or the action-specific color. Team, compare, favorite, caught, owned, and wishlist controls should keep their meaning visually stable across cards and detail views.
- Every icon-only action requires an accessible name. Visible text may be hidden only when an `aria-label` or equivalent accessible name is present.

### Cards and data surfaces

- Standard cards use a paper/brown card surface, a near-square corner, a visible border, and the small pixel shadow. Larger panels use the 3px frame and 4px offset.
- Padding scales with density: compact cards use `p-3`–`p-4`; content panels and dashboard modules use `p-5`–`p-8`; page headers use roughly `p-5` on mobile and `p-7`–`p-8` on desktop.
- Use `color-mix()` or an opacity utility for a quiet tint; do not fill an entire page with saturated accent color.
- The shared Base UI/shadcn primitives inherit the same variables. Do not create a parallel radius or shadow vocabulary inside a new component.

### Pokémon cards and catalog controls

- The Pokédex grid is dense and specimen-like: cards are approximately `18rem` tall, separated by `0.5rem` gaps, and expand from 1 to 2 columns at 360px, 3 at `md`, 4 at `lg`, and 5 at `xl`.
- Each Pokémon card uses a type-tinted gradient, a type-colored 4px hard shadow, a crisp small-radius border, a pixel-preserving or official sprite, and a soft sprite drop shadow. Hover raises the card by 1px and scales the sprite to roughly 105%.
- The top of the card carries a monospace catalog number and three 44px action chips for team, compare, and favorite. A fourth caught/Pokéball control sits at the lower right.
- Pokémon names use display type; the Latin-style name is italic display text; type labels are monospace, uppercase, and tracked. Legendary/mythical status uses the gold action accent.
- Type and region filters are horizontally scrollable on small screens, use scroll snap, hide the browser scrollbar, and become centered/wrapping rows at larger widths. Active type filters use the raw type hex; active region filters use primary.

### TCG cards and research desk

- The TCG catalog is a deliberate visual subsystem inside the same shell. Cards keep a physical trading-card ratio (`2.15 / 3`) and use a corner radius around `4.55% / 3.5%` rather than the square UI radius.
- Interactive holographic cards support pointer-driven tilt up to roughly 10 degrees, shine/glare layers, and a restrained holographic border sweep on hover. Do not use that treatment on ordinary Pokémon or dashboard cards.
- TCG research uses framed panels, compact uppercase filters, a prominent search field, tabs, set/rarity/category controls, and dense card metadata. The main search field intentionally uses a more generous `1.25rem` radius as a feature-local exception.
- Rarity badges use local tones for common, uncommon, rare, promo, hyper rare, secret, illustration, rainbow, holo, and related variants. Their purpose is classification; preserve their contrast and do not collapse them into the primary brand color.
- The compare trigger is a fixed 48px round action button with a count badge. The comparison surface is a right-side panel with a border, card background, pixel shadow, and responsive 1-to-4-card grid.

### Inputs, tabs, dialogs, and feedback

- Inputs and selects are generally `glass-control` surfaces, 44px high, with `--input`/`--border` strokes, card or transparent background, and a primary `2px` focus ring. Textareas use the same near-square radius and quieter card fill.
- Tabs sit in a `glass-toolbar`; the active tab gets a card fill, border, small pixel shadow, and primary indicator. TCG tabs may wrap to two columns on narrow screens.
- Dialogs and sheets use the framed surface language, safe-area-aware bottom padding, a muted overlay, and slide/zoom/fade entrance. The sheet uses the pixel shadow to separate from the page edge.
- Sonner toasts use a 3px frame, popover surface, foreground text, near-square radius, and the large pixel shadow.
- Loading states use muted fills and, where appropriate, the `codex-shimmer` primary sweep. Error and destructive states use coral/red semantic colors, not a new ad hoc brand color.

## 5. Layout Principles

### Composition and density

Lunidex alternates between generous editorial introductions and dense utility zones. Hero and page-header copy gets room to breathe; catalog grids, filter rails, comparison panels, and stat blocks are intentionally packed.

- Use a centered content column. The global ceiling is 90rem; most public and feature pages use 72rem (`max-w-6xl`).
- Start mobile-first. Use one column below 360px, two columns from 360px where the content supports it, then add 3/4/5-column grids at `md`/`lg`/`xl`.
- Use 0.5rem gaps for dense catalog grids, 1rem–1.5rem gaps for standard cards, and 2rem–3rem gaps for hero columns. Separate major sections with roughly 3rem on mobile and 4rem on desktop.
- Keep interactive rows horizontally scrollable rather than compressing labels into unreadable widths. Use `scroll-snap-x`, `scroll-snap-align-start`, `overscroll-behavior-x: contain`, and a hidden scrollbar for filter and card rails.
- Avoid horizontal overflow at 320px, 375px, 414px, and 768px. Long localized labels must wrap or scroll within their own control rather than expanding the viewport.

### Responsive framing

The fixed header and modal/sheet surfaces account for `env(safe-area-inset-top)` and `env(safe-area-inset-bottom)`. Main content reserves top space for the header (`pt-24` to `pt-32` in major routes). Footer content remains quiet and border-separated, with compact links and a readable disclaimer rather than another framed panel.

### Localization and accessibility

The web UI supports English, French, Spanish, German, Italian, Japanese, Korean, and Chinese. Leave room for longer translations, do not bake English widths into buttons, and keep the font fallback chain intact. Maintain WCAG-oriented 44px touch targets, visible keyboard focus, accessible names for icon controls, reduced-motion behavior, and sufficient contrast for muted metadata.

## 6. Motion, Texture, and Media

Motion should feel physical and brief:

- `fadeInUp`: 0.6s entrance with an 18px upward drift.
- `scaleIn`: 0.5s subtle content/sprite arrival from 96% scale.
- `float`: 8–12s decorative particle movement with small rotation; use only in playful hero or 404 scenes.
- `pulseSlow`: 4.5–8s opacity breathing for restrained loading or emphasis.
- `statFill`: 1s horizontal stat-bar reveal from zero.
- `codex-shimmer`: 2.4s skeleton sweep.
- `holographicShimmer`: 7s TCG border sweep, visible only on the holographic card interaction.
- Home preview cards use pointer-aware 3D tilt and a primary radial glow; touch and reduced-motion users do not receive the pointer effect.

The page background has a repeated 240px SVG fractal-noise layer: light mode uses multiply at `.18`, dark mode uses screen at `.10`, and reduced motion lowers it to `.06`. The home hero adds a radial-masked primary grid and a 12px-blurred radial glow. These are atmospheric backgrounds, not replacements for content surfaces.

Every global animation and transition must have a `prefers-reduced-motion: reduce` path. In reduced motion, entrance effects become immediately visible, particle/shimmer/tilt animations stop, and interaction transitions collapse to near-zero duration.

## 7. Platform Boundary

The Expo app shares domain logic but not the web surface system. Its source of truth is `apps/mobile/src/theme/colors.ts`:

- **Mobile light:** background `#F5F6FB`, surfaces/cards `#FFFFFF`, alternate surface `#EEF0F7`, border `#E3E6F0`, text `#11131C`, muted text `#5B6071`, primary indigo `#4F46E5`, accent pink `#EC4899`, danger `#E11D48`, success `#16A34A`.
- **Mobile dark:** background `#0B1020`, surfaces `#141A2E`, alternate surface `#1B2238`, card `#161D33`, border `#28304A`, text `#F3F5FC`, muted text `#A3ABC4`, primary `#7C83FF`, accent `#F472B6`, danger `#FB7185`, success `#4ADE80`.

Mobile components should remain native and responsive to their platform. Do not port the web’s pixel shadow, OKLCH shell, or web-specific `glass-*` classes into React Native unless a deliberate cross-platform design migration is planned.

## 8. Do’s and Don’ts

### Do

- Reuse the existing CSS variables and Base UI primitives.
- Use the warm parchment/umber shell with the terracotta primary as a deliberate signal.
- Keep frames near-square, visibly bordered, and physically offset where the component family calls for it.
- Use exact Pokémon type hex values for type data and `color-mix()` for quiet type-tinted surfaces.
- Preserve the distinction between primary brand actions, Pokémon type data, TCG rarity, and result/status colors.
- Use Pixelify Sans for headings and Nunito for reading copy; keep monospace for catalog and technical metadata.
- Design for localized text, 44px touch targets, keyboard focus, safe areas, and reduced motion.
- Treat TCG physical-card geometry, quiz feedback, charts, and illustration glows as documented feature exceptions.

### Don’t

- Do not replace the canonical OKLCH runtime tokens with arbitrary hex values just because a nearby integration uses a hex color.
- Do not add generic gray glassmorphism, blurred shadows, or gradients to standard dashboard surfaces.
- Do not use gradient text; the existing gradient-text helper is intentionally plain foreground text.
- Do not claim that every component is square or every shadow is hard: TCG cards, toggles, chart cells, status pills, sprite art, and feature-local overlays have explicit rounded/soft exceptions.
- Do not make all labels uppercase; reserve uppercase tracking for short metadata, filters, tabs, statuses, and technical actions.
- Do not use saturated type or rarity colors as decorative page backgrounds.
- Do not create a new radius, shadow, or semantic color family in a component file without updating the source-of-truth tokens.
- Do not remove accessible names from icon-only controls or reduce touch targets below 44px.

For Stitch-oriented prompts, keep the descriptions semantic and role-based while retaining the exact runtime values above. Reference the [Stitch Effective Prompting Guide](https://stitch.withgoogle.com/docs/learn/prompting/) when translating this system into new screens.
