---
name: Lunidex
description: A Pokémon companion dashboard and TCG collection tool with a warm, pixel-inspired visual language
colors:
  primary: "oklch(0.72 0.110 45)"
  primary-foreground: "oklch(0.22 0.060 45)"
  neutral-bg: "oklch(0.945 0.028 85)"
  neutral-fg: "oklch(0.17 0.045 60)"
  surface-card: "oklch(0.985 0.012 85)"
  muted-fg: "oklch(0.17 0.060 70)"
  accent: "oklch(0.80 0.050 240)"
  border: "oklch(0.74 0.060 75)"
  destructive: "oklch(0.70 0.090 20)"
  action-favorite: "oklch(0.70 0.090 20)"
  action-compare: "oklch(0.68 0.090 250)"
  action-team: "oklch(0.72 0.090 162)"
  action-legendary: "oklch(0.82 0.090 80)"
  action-caught: "var(--primary)"
  dark:
    background: "oklch(0.16 0.012 50)"
    foreground: "oklch(1.0 0 0)"
    card: "oklch(0.22 0.015 55)"
    primary: "oklch(0.80 0.100 45)"
    border: "oklch(0.40 0.030 60)"
    pixel-shadow: "oklch(0.10 0.010 50)"
  type-normal: "oklch(0.78 0.025 80)"
  type-fire: "oklch(0.78 0.090 40)"
  type-water: "oklch(0.80 0.060 235)"
  type-electric: "oklch(0.88 0.090 85)"
  type-grass: "oklch(0.80 0.075 148)"
  type-ice: "oklch(0.88 0.045 205)"
  type-fighting: "oklch(0.74 0.075 35)"
  type-poison: "oklch(0.76 0.080 320)"
  type-ground: "oklch(0.80 0.055 70)"
  type-flying: "oklch(0.84 0.045 285)"
  type-psychic: "oklch(0.80 0.085 355)"
  type-bug: "oklch(0.82 0.065 130)"
  type-rock: "oklch(0.75 0.040 75)"
  type-ghost: "oklch(0.70 0.065 305)"
  type-dragon: "oklch(0.74 0.070 270)"
  type-dark: "oklch(0.68 0.030 60)"
  type-steel: "oklch(0.82 0.018 245)"
  type-fairy: "oklch(0.88 0.055 355)"
typography:
  display:
    fontFamily: "'Pixelify Sans', 'Pixelify Sans Fallback', ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(2.75rem, 9vw, 6.5rem)"
    fontWeight: 700
    lineHeight: 0.92
    letterSpacing: 0
  headline:
    fontFamily: "'Pixelify Sans', 'Pixelify Sans Fallback', ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(1.5rem, 4vw, 2.5rem)"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: 0
  title:
    fontFamily: "'Pixelify Sans', 'Pixelify Sans Fallback', ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(1rem, 2.5vw, 1.5rem)"
    fontWeight: 600
    lineHeight: 1.1
    letterSpacing: 0
  body:
    fontFamily: "'Nunito', 'Nunito Fallback', 'Hiragino Sans', 'Noto Sans CJK JP', 'Microsoft YaHei', ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.72
    letterSpacing: 0
  label:
    fontFamily: "ui-monospace, 'SFMono-Regular', Menlo, Consolas, 'Liberation Mono', monospace"
    fontSize: "0.625rem"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: 0.22em
  cat-no:
    fontFamily: "ui-monospace, 'SFMono-Regular', Menlo, Consolas, 'Liberation Mono', monospace"
    fontSize: "0.65rem"
    fontWeight: 600
    lineHeight: 1
    letterSpacing: 0.18em
rounded:
  sm: "0.125rem"
  md: "0.25rem"
spacing:
  xs: "0.25rem"
  sm: "0.5rem"
  md: "1rem"
  lg: "1.5rem"
  xl: "2rem"
components:
  card-surface:
    backgroundColor: "{surface-card}"
    textColor: "{neutral-fg}"
    rounded: "{rounded.sm}"
    padding: "1rem 1.25rem"
  card-surface-hover:
    backgroundColor: "{surface-card}"
    textColor: "{neutral-fg}"
    rounded: "{rounded.sm}"
    padding: "1rem 1.25rem"
  button-primary:
    backgroundColor: "{surface-card}"
    textColor: "{neutral-fg}"
    rounded: "{rounded.sm}"
    padding: "0.5rem 1rem"
  button-primary-hover:
    backgroundColor: "{surface-card}"
    textColor: "{neutral-fg}"
    rounded: "{rounded.sm}"
    padding: "0.5rem 1rem"
  button-active:
    backgroundColor: "oklch(0.72 0.110 45)"
    textColor: "oklch(0.22 0.060 45)"
    rounded: "{rounded.sm}"
    padding: "0.5rem 1rem"
  tag:
    backgroundColor: "{surface-card}"
    textColor: "{neutral-fg}"
    rounded: "{rounded.sm}"
    padding: "0.25rem 0.625rem"
  input:
    backgroundColor: "{surface-card}"
    textColor: "{neutral-fg}"
    rounded: "{rounded.sm}"
    padding: "0.5rem 0.75rem"
---

# Design System: Lunidex

## Overview

**Creative North Star: "The Cozy Pokédex Workshop"**

Lunidex is a Pokémon companion dashboard that lives at the intersection of a collector's field journal and a warm, well-worn game cartridge from the early 2000s. The visual language draws on pixel-art charm without committing to strict retro: chunky hard shadows (no blur), tight tracking on uppercase labels, specimen-catalogue framing, and a warm cream-and-umber palette that feels like curling up with a notebook and a stack of cards. Every surface has presence — thick borders, pixel-offset shadows, subtle paper grain — but nothing competes with the Pokémon themselves. The design recedes just enough for the sprites, type colors, and TCG artwork to take center stage.

**Mode: Operate.** This is a functional dashboard for collectors and trainers. Scanability, consistency, and real usage patterns outrank decoration. Brand lives in precise details: the pixel shadow on a button, the catalog-number on a card, the tight uppercase tracking on a type badge.

### Key Characteristics
- Chunky pixel-style hard shadows with zero blur, offset by `2px` or `4px`
- Very small border radius (`0.125rem`) — corners are nearly square, contributing to a blocky pixel feel
- Thick borders (`2px–3px solid`) giving every surface physical weight
- Warm, desaturated OKLCH color space: cream backgrounds, umber text, amber primary
- Tight uppercase tracking (`0.14em–0.22em`) on labels, badges, and catalog numbers
- Dual-typeface system: Pixelify Sans for headings (playful pixel), Nunito for body text (warm readability)
- Fractal-noise SVG grain overlay adds tactile paper texture to backgrounds (multiply in light, screen in dark)
- Type colors used as semantic accents via CSS custom properties and `color-mix()`
- Every interactive element has a pixel-precise hover shift (`-1px -1px`) and a pressed state (`2px 2px`)
- Responsive grid layouts that adapt from 1 to 5 columns depending on viewport
- Per-generation color themes via `[data-gen]` attribute selectors that re-skin primary, accent, background, and ring
- Full dark-mode palette with lifted type colors and action accents for legibility on umber surfaces
- Motion is brief, decorative, and disabled entirely under `prefers-reduced-motion`
- Scroll-snap utilities (`scroll-snap-x`, `scroll-snap-align-start`) and a 8px square scrollbar for TCG/markets horizontal rails

## Colors

The palette is warm, desaturated, and cozy — like reading a field guide by lamplight. The primary amber anchors call-to-action elements; everything else stays in the warm neutral family. Type colors are the only saturated element and provide the page's full color expression.

### Primary
- **Warm Amber** (`oklch(0.72 0.110 45)`): The single accent. Used on active buttons, focus rings, selected states, link hover, and progress indicators. Its rarity on the page is the point — when amber appears, it means something is interactive or important.

### Neutral
- **Warm Cream** (`oklch(0.945 0.028 85)`): Page background. Rests behind all content.
- **Dark Umber** (`oklch(0.17 0.045 60)`): Body text and primary headings. High contrast on cream.
- **Soft Card** (`oklch(0.985 0.012 85)`): Surface background for cards, panels, toolbars.
- **Warm Muted** (`oklch(0.17 0.060 70)`): Secondary text, metadata, helper labels.
- **Muted Neutral** (`oklch(0.92 0.020 85)`): Secondary surfaces, hover fills.
- **Warm Border** (`oklch(0.74 0.060 75)`): Default border color for all surfaces.
- **Deep Border** (`oklch(0.68 0.055 75)`): Stronger border for emphasis.

### Secondary
- **Sky Blue** (`oklch(0.80 0.050 240)`): Secondary accent; used sparingly in compare actions and info badges.
- **Coral Red** (`oklch(0.70 0.090 20)`): Destructive actions, error states, favorites.

### Semantic Action Accents
- **Favorite Red** (`oklch(0.70 0.090 20)`)
- **Compare Blue** (`oklch(0.68 0.090 250)`)
- **Team Green** (`oklch(0.72 0.090 162)`)
- **Legendary Gold** (`oklch(0.82 0.090 80)`)
- **Caught** (`var(--primary)`): completion/capture state; intentionally reuses the primary amber so "caught" reads as the system's positive state.

### Dark Mode

The `.dark` class flips the whole system onto a warm umber canvas rather than a neutral gray-black:

- **Background** (`oklch(0.16 0.012 50)`), **Foreground** (`oklch(1 0 0)`): deep warm brown-black with pure-white text.
- **Card** (`oklch(0.22 0.015 55)`), **Popover** (same): elevated surfaces lift the card color.
- **Primary** (`oklch(0.80 0.100 45)`): amber lifted for contrast; `--ring` mirrors it.
- **Accent** (`oklch(0.87 0.040 235)`): sky lifted to stay visible.
- **Secondary / Muted** (`oklch(0.32 0.018 55)`), **Muted Foreground** (`oklch(0.85 0.060 65)`).
- **Destructive** (`oklch(0.70 0.090 20)`): unchanged.
- **Border** (`oklch(0.40 0.030 60)`), **Deep Border** (`oklch(0.50 0.035 60)`).
- **Type colors are lifted** (e.g. fire `oklch(0.82 0.095 42)`, water `oklch(0.82 0.065 238)`) so badges keep their hue on dark cards.
- **Action accents are lifted** for legibility (favorite `oklch(0.75 0.100 22)`, compare `oklch(0.74 0.095 252)`, team `oklch(0.78 0.095 164)`, legendary `oklch(0.87 0.090 80)`).
- **Pixel shadow** (`oklch(0.10 0.010 50)`): the dark shadow darkens into the background.
- **Grain**: `mix-blend-mode: screen` at `0.10` opacity (light uses `multiply` at `0.18`).
- `theme-color` meta mirrors the two schemes: `#F4EAD5` light, `#211A17` dark.

### Generation Themes

Nine attribute-scoped themes (`[data-gen="gen1"]` … `[data-gen="gen9"]`) re-skin the app per Pokémon generation by overriding `--primary`, `--primary-foreground`, `--accent`, `--accent-foreground`, `--background`, `--foreground`, `--card`, `--border`, and `--ring`:

- **gen1** — Kanto red/blue on cream
- **gen2** — Gold/silver on deep forest green (dark card surfaces)
- **gen3** — Ruby/sapphire on turquoise (dark card surfaces)
- **gen4** — Glacier blue/lilac on night blue (dark card surfaces)
- **gen5** — Blood red/white on near-black (dark card surfaces)
- **gen6** — Royal blue/scarlet on pale blue
- **gen7** — Sun yellow/moon purple on pale turquoise
- **gen8** — Shield red/sword blue on pale lavender
- **gen9** — Scarlet/violet on pale rose

Components are never modified per theme — the overrides cascade through the existing custom properties, so a themed page is identical structurally.

### Named Rules

**The One Voice Rule.** The amber primary accent is applied to ≤10% of any given screen. It is reserved for the primary interactive element and focus states. When everything is amber, nothing is.

**The Type Color Rule.** Type badges use `color-mix(in oklab, var(--type-color) 15%, var(--card))` for backgrounds and `color-mix(in oklab, var(--type-color) 80%, var(--foreground))` for text. The mix keeps badges readable while carrying the type's hue. These are the only saturated colors on the page.

## Typography

**Display Font:** Pixelify Sans (with Pixelify Sans Fallback → Arial → system-ui)
**Body Font:** Nunito (with Nunito Fallback → Hiragino Sans → Noto Sans CJK JP → Microsoft YaHei → system-ui)
**Label Font:** System monospace stack (`--font-mono`)

**Character:** The pairing is deliberate contrast — Pixelify Sans brings playfulness and pixel-era warmth to headings, while Nunito provides clean, rounded readability for body copy. Monospace is reserved for specimen metadata (catalog numbers, type labels, stats), creating a field-journal authenticity.

Pixelify Sans is loaded at `400`, `500`, `600`, `700`; Nunito at `400`, `600`, `700`. Both use `font-display: optional` with preload and per-font metric-matching fallbacks (`@font-face` `size-adjust`/overscope) to prevent CLS. The body stack extends into CJK fallbacks (Hiragino Sans, Noto Sans CJK JP, Microsoft YaHei) so the eight supported locales render without font gaps.

### Editorial typography helpers
Beyond the six hierarchy levels, `.page-eyebrow`, `.page-title`, `.page-subtitle`, `.page-divider`, and `.editorial-ornament` compose editorial page headers; `.rule-line`, `.cat-no`, `.latin-name`, `.field-stamp`, and `.specimen-badge` handle specimen framing. All resolve through the same custom properties — no per-component token redefinition.

### Hierarchy
- **Display** (700, `clamp(2.75rem, 9vw, 6.5rem)`, `0.92`): Hero titles. Massive, tight-cropped, and deliberately oversized. `text-wrap: balance` prevents orphans.
- **Headline** (700, `clamp(1.5rem, 4vw, 2.5rem)`, `1`): Section titles. Still large and tight, but subordinate to hero. Used on page headings and feature panels.
- **Title** (600, `clamp(1rem, 2.5vw, 1.5rem)`, `1.1`): Card titles, Pokémon names, modal headings. Compact and bold.
- **Body** (400, `0.875rem`, `1.72`): All reading text. Max line length 65–75ch for readability. Nunito's rounded warmth keeps dense information approachable.
- **Label** (700, `0.625rem`, `1`, `0.22em`, uppercase): Microcopy — badge labels, field stamps, section dividers. Always uppercase with wide tracking. The small size and generous spacing signal "metadata" inherently.
- **Catalog Number** (600, `0.65rem`, `1`, `0.18em`, uppercase): Monospace specimen identifiers. Used for Pokédex numbers, set codes, and any item that reads like an accession number.

### Named Rules

**The Two-Step Tracking Rule.** Display text uses zero tracking; label text uses `0.14em–0.22em`. There is no intermediate tracking. The gap between the two extremes is what makes uppercase labels feel intentional rather than default.

## Layout

The layout model centers on a single-column mobile foundation that expands to multi-column grids on larger screens. The page shell (`.page-shell`) constrains content to `min(100%, 90rem)` with horizontal padding that increases at breakpoints: `1rem` at mobile, `1.5rem` at `640px`, `2rem` at `1024px`.

Card grids use CSS Grid with explicit column counts per breakpoint:
- Single column below 360px
- 2 columns at 360px
- 3 columns at `md` (768px)
- 4 columns at `lg` (1024px)
- 5 columns at `xl` (1280px)

Gutters are intentionally tight (`gap-2`) to create a dense, packed-grid feel — cards should feel like they're shelved together rather than floating apart. Section spacing is generous between different content blocks (`py-8` to `py-12`) to let each section breathe.

Interactive elements use `touch-target` utility (`min-width: 2.75rem`, `min-height: 2.75rem`) for WCAG-compliant tap targets.

## Elevation & Depth

Lunidex uses **hard pixel shadows exclusively** — there are no blurred, soft, or ambient shadows in the system. Depth is conveyed through:

- **Pixel shadow** (`4px 4px 0 var(--pixel-shadow)`): Primary surface elevation. Used on `.codex-frame`, `.page-surface`, `.section-frame`, `.glass-panel`, `.glass-surface`, `.cn-toast`. Creates a chunky, tangible offset. Tokenized as `--shadow-pixel` (offset driven by `--pixel-shadow-offset: 4px`).
- **Small pixel shadow** (`2px 2px 0 var(--pixel-shadow)`): Secondary elevation. Used on `.glass-card`, `.glass-toolbar`, `.glass-tag`, `.glass-btn`, `.glass-control`, `.type-accent`, `.page-eyebrow`, `.field-stamp`, `.specimen-badge`, `.editorial-pill`. Tokenized as `--shadow-pixel-sm`. Subtle lift for smaller elements.
- **Interactive elevation**: On hover, the offset increases by `2px` and the element translates `-1px -1px` up and left, simulating the element thickening. On active/press, it collapses to `translate(2px, 2px)` with no shadow — the button is "pressed down" to the surface. Cards (`--type-glow`) shift `-2px -2px` on hover with the enlarged offset.

The shadow color (`--pixel-shadow`) adapts to dark mode: `oklch(0.86 0.035 80)` in light, `oklch(0.10 0.010 50)` in dark.

### Named Rules

**The Flat-By-Default Rule.** Every surface is flat on load. Elevation is a state response — hover, active, and focus. No element is persistently elevated above another without user interaction.

## Motion

Motion is short, physical, and decorative — never a substitute for state, never continuous. All of it is disabled under `prefers-reduced-motion`.

### Entrances
- **`.animate-fade-in-up`**: Entry fade + upward drift (`0.5s`, `ease-out`), used on page headers and hero content.
- **`.animate-scale-in`**: Sprite/card pop-in (`0.3s` spring-like ease) for Pokémon art.
- **`.animate-pulse-slow`**: Gentle 3s foreground pulse, restricted to loading stubs.

### Ambient
- **`.float-particle`**: Drifting particles over hero/404 scenes — sine-waved translate with staggered delays (`-2s`/`-4s`), `16s` loop.
- **`.animate-pulse-glow`**: Text-level shimmer on special specimen accents.
- **`.stat-bar-fill`**: Metric bars scale from `0` to full in `0.6s` with a bounce ease on mount.

### Shimmer & Sweeps
- **`.codex-shimmer`**: Skeleton sweep (`shimmerSlide`, `2.4s`) described under Components → Loading.
- **`.holo-border`**: Holographic TCG border sweep (`holographicShimmer`, `7s`) fading in on hover.
- **Keyframes** live centrally in `globals.css` so every animation resolves through the same tokens.

## Shapes

The form language is almost aggressively square: `0.125rem` border radius is so small it barely rounds the corners. Tailwind v4 maps the radius scale down too (`--radius-sm: 0`, `--radius-md: var(--radius)` i.e. `0.125rem`, `--radius-lg: 0.25rem`), so `rounded-sm` is perfectly square — the default for components. This is intentional — it echoes pixel-art's visible corner steps and gives every panel, card, and badge a blocky, tactile silhouette.

Borders are always `2px` or `3px` solid, creating a clear boundary between surfaces. The canonical size is `--border-width: 3px`, used on the largest surfaces (`.page-surface`, `.section-frame`, `.glass-panel`, `.codex-frame`, `.glass-btn`, `.cn-toast`); small controls and tags use a hardcoded `2px`. The hard edge reinforces the pixel-art thesis and prevents the floating-card look.

Pills (fully rounded, `9999px`) are reserved for decorative elements and non-UI shapes — the Pokéball, cloud shapes, the sun in the 404 scene. No UI container uses a pill shape.

The only exception is the holographic TCG card border (`.holo-border`), which uses a multi-stop gradient mask for the shimmer effect (`holographicShimmer` 7s sweep, fading in on hover).

## Components

### Buttons (`.glass-btn`)
- **Shape**: Square corners (`0.125rem` radius), `2px` or `3px` solid border, `2px 2px 0` pixel shadow.
- **Primary**: Card background with default border. On hover, border shifts to primary amber, shadow deepens, and the button shifts `-1px -1px`.
- **Active**: Translates `2px 2px` with no shadow — pressed into the surface.
- **Focus-visible**: `2px solid var(--ring)` with `2px` offset.
- **Variants**: Active state (`.glass-btn-active`) fills with amber primary. The compact control (`.glass-control`) reuses the same frame but tints its border/fill toward `--hover-color` on hover (e.g. a delete control warming red).
- **Content**: Always uppercase with tracking on label elements. Never lowercase.

### Cards (`.glass-card`, `.glass-surface`, `.page-surface`, `.section-frame`, `.codex-frame`)
- **Corner style**: Square (`0.125rem` radius).
- **Background**: Card surface (`--card` or `--background` depending on nesting).
- **Shadow**: One of two pixel shadow sizes depending on hierarchy level (larger for page-level surfaces, smaller for nested cards).
- **Border**: `2px` or `3px` solid `--border`.
- **Internal Padding**: Scales with context — `p-3` to `p-8` depending on content density. Standard card padding is `p-4` to `p-6`.
- **Hover**: Translates `-1px -1px` with deepened shadow and primary-tinted border.

### Editorial Page Headers
- **`.page-eyebrow`**: Label-style kicker — `0.625rem`, 700, `0.22em`, uppercase, bordered card frame with small pixel shadow. Opens editorial pages alongside `.editorial-ornament` dividers and `.rule-line` separators.
- **`.page-title`**: Display-font headline, 700, zero tracking, `line-height: 1`, balanced wrapping.
- **`.page-subtitle`**: Muted body copy capped at `44rem`.
- **`.page-divider` / `.soft-divider`**: `2px` full-width rule in `--border`.
- **`.editorial-ornament`**: Centered ornament — a Pixelify glyph (`__glyph`) flanked by two capped rules, aligned on a display-font baseline.

### Specimen Framing
- **`.field-stamp`**: Museum-tag corner mark — `2px` primary border, primary `10%` fill, monospace uppercase `0.18em`, plus `2px 2px 0` pixel shadow.
- **`.cat-no`**: Monospace catalog number (`0.65rem`, `0.18em`, uppercase, muted); `.cat-no__num` tints the digits primary.
- **`.latin-name`**: Display-font italic secondary label.
- **`.rule-line`**: Flex rule with caps monospace label between two `2px` rules.
- **`.specimen-badge`**: Tiny monospace corner count on background surface (`2px` border, small pixel shadow).
- **`.editorial-pill`**: Monospace uppercase tag (`0.65rem`, `0.14em`) on background surface.

### Loading (`.codex-shimmer`)
- Skeleton surfaces use a static `6%` foreground fill with a repeating amber sweep (`codex-shimmer::after`, `20%` primary mix) animating over `2.4s` via `shimmerSlide`. Disabled under reduced motion.

### Type Badges (`.glass-tag`, `.type-accent`)
- **Shape**: Square with `.glass-tag` styling — `2px` border mixed with `--type-color`, background at `15%` opacity of type color, text at `80%` type color.
- **`.type-accent`**: Variant that mixes the type hue into the border at `45%` and the fill at `18%` over card, giving a slightly stronger color presence.
- **Sizes**: `sm` (`px-2 py-0.5 text-[11px]`), `md` (`px-3 py-1 text-[11px]`), `lg` (`px-4 py-1.5 text-xs`).
- **Text**: Always uppercase, semibold or bold, with `0.06em` tracking. Size controlled by variant.

### Inputs
- **Style**: Square corners, `2px` solid `--input` border, `--card` background. Uses shadcn/ui patterns with pixel border overrides.
- **Focus**: Ring uses `--ring` color (amber) at `2px` offset.
- **Error**: Inherits shadcn error styling with `--destructive` border.

### Navigation (Header)
- **Style**: Horizontal inline toolbar using `.glass-toolbar` + `.codex-frame` — the header is itself a pixel-framed surface, floating at the top of the viewport.
- **Safe-area aware**: Top position calculated from `env(safe-area-inset-top)`.
- **Responsive**: On mobile, extra controls collapse behind a hamburger menu. Desktop shows full horizontal navigation.
- **Typography**: Label-style text — small, uppercase, tracked.

### Pokémon Cards (`.group/specimen`, `.type-glow`)
- **Background**: Type-tinted linear gradient at `7%` opacity from the card's primary type color. The type's hue is perceptible as a subtle tint.
- **Hover**: Moves up `-2px -2px` with an enhanced pixel shadow (`type-glow`) and a radial glow behind the sprite.
- **Action chips**: Three small square buttons at the bottom of the card — team, compare, favorite — that adopt their respective action accent color on activation. Colors come from `--action-favorite`, `--action-compare`, `--action-team`.
- **Sprite**: Brightened with `drop-shadow` and scales to `105%` on card hover. Uses `image-rendering: pixelated` for the classic sprite look.

### Toast (`.cn-toast`)
- Sonner toasts adopt the pixel frame: `--radius` corners, `3px` border, popover surface, `4px 4px 0` pixel shadow.

### Home Hero & Preview Accents
- **`.home-hero-shell`**: Hero backdrop — a radial-masked pixel grid (`::before`, primary at `26%`, `1.35rem` cells, `0.58` opacity) plus a soft radial primary glow (`::after`, `18%`, blurred `12px`, top-right, `0.55`). In dark mode opacities drop to `0.38` / `0.35`.
- **`.home-card-preview`**: Preview card hover ring — a primary inset border (`58%` mix) that fades/scales in over `180ms` (`::after`), transition disabled under reduced motion.

## Do's and Don'ts

### Do:
- **Do** use the hard pixel shadow (`4px 4px 0` or `2px 2px 0`) on all elevated surfaces — never substitute a blurred box-shadow.
- **Do** keep the amber primary rare and purposeful. If more than 10% of a surface carries the primary color, it's overused.
- **Do** use Pixelify Sans for all headings and Nunito for all body text. The contrast between the two is a brand signal.
- **Do** apply `color-mix()` when tinting surfaces with type colors — the mix keeps the card background readable while carrying the type's hue.
- **Do** maintain the small border radius (`0.125rem`) everywhere. Rounding corners more aggressively breaks the pixel thesis.
- **Do** use `touch-target` utility for interactive elements to meet WCAG 2.2 tap target requirements.
- **Do** verify designs at 320px, 375px, 414px, and 768px without horizontal overflow.

### Don't:
- **Don't** use blurred shadows, soft ambient glow, or gradient drop-shadows. Every shadow in the system is hard and offset.
- **Don't** use gradient text — emphasis comes from weight, size, or standard foreground color.
- **Don't** invent new color roles beyond the existing palette. No new semantic colors without adding them to `globals.css` CSS custom properties first.
- **Don't** round cards or buttons beyond `0.125rem` — pills (fully rounded) are for decorative non-UI elements only.
- **Don't** use the pixel-shadow on elements that are not interactive. Surfaces are flat at rest.
- **Don't** use the grid-line background pattern (`.noise-overlay` radial dots) on non-canvas surfaces. The paper grain texture via `body::before` is sufficient for page backgrounds.
- **Don't** use uppercase body text — uppercase is reserved for labels, badges, and metadata. Body text stays in sentence case.
- **Don't** re-define CSS tokens in component files. All colors, shadows, and typography should reference the custom properties in `globals.css`.
- **Don't** use icon-only controls without text labels or ARIA labels. Every control needs an accessible name.
