---
name: Lunidex
description: A localized Pokémon companion for Pokédex reference, team building, and Pokémon TCG collection tracking.
project_id: "N/A — local repository; no Stitch project is linked to this workspace"
audited: 2026-08-23
scope: "Next.js web application; the Expo mobile boundary is documented separately below"
source_of_truth:
  - src/app/globals.css
  - src/styles/shadcn-tailwind.css
  - src/app/layout.tsx
  - src/components/ui/button.tsx
  - src/components/ui/input.tsx
  - src/components/ui/badge.tsx
  - src/components/ui/card.tsx
  - src/components/layout/Header.tsx
  - src/components/layout/PageHeader.tsx
  - src/app/pokedex/page.tsx
  - src/components/home/HomeArchiveExperience.tsx
  - packages/core/src/types/pokemon.ts
  - src/lib/site.ts
---

# Design System: Lunidex

This document is the visual source of truth for new web screens and for prompts that need to extend the existing interface. It describes the effective current cascade, not the historical names of the project or retired visual experiments.

## 1. Visual theme and atmosphere

### Creative direction: “Cobalt Pokémon Field Console”

Lunidex is a focused reference instrument for players and collectors. Its core web experience is a calm cobalt-indigo console: cool, luminous, data-rich, and friendly without becoming toy-like. The Pokémon mark, official artwork, type colors, and card imagery provide the personality; the surrounding interface stays structured so search, comparison, collection progress, and localized text remain easy to scan.

The landing page is a more editorial expression of the same system. It uses the same light/dark theme pair, but gives the interface more room: a fixed frosted header, a large hero composition, collectible-card previews, a Pokédex specimen, team evidence, local-first messaging, and an accordion FAQ. It should feel like a polished field lab, not a generic SaaS dashboard.

### Visual principles

- **Cool, not clinical:** cobalt, periwinkle, lavender, and blue-white surfaces replace a neutral gray SaaS palette.
- **Soft depth with a tactile response:** resting surfaces use diffused shadows and thin borders; interactive controls lift by a pixel on hover and settle on press.
- **Content-led color:** the primary indigo/lavender signal is reserved for actions, selection, focus, and progress. Pokémon type and TCG rarity colors belong to the data they describe.
- **Editorial density:** display headings, uppercase micro-labels, monospace catalog data, and clear rules make large information sets feel intentional.
- **Playful restraint:** official sprites, the Lunidex mark, card tilt, glows, and small motion add game character without competing with the content.

### Effective visual layers

| Layer | Selector or route | Design role |
| --- | --- | --- |
| Shared web foundation | `:root`, `.dark`, `body` | Theme tokens, typography, noise layer, safe areas, focus, and motion defaults. |
| Generic application routes | `.app-page:not(.pokedex-redesign):not(.lunidex-home)` | Indigo/periwinkle page background, rounded data surfaces, framed page headers, and the shared header/footer. |
| Pokédex route | `.pokedex-redesign` | Dedicated cobalt field with star-like texture, luminous lavender controls, hero mark, search/filter console, and specimen cards. |
| Home route | `.lunidex-home` | Cobalt landing composition with hero artwork, bento previews, collection steps, local-first/open-source cards, and FAQ. |
| Mobile app | `apps/mobile/src/theme/colors.ts` | Native palette and geometry; it does not inherit web CSS or web glass classes. |

`src/app/globals.css` contains older compatibility selectors before the final route-scoped rules. When a selector appears more than once, use the effective route-specific definition near the end of the file and the tokens documented here. The former warm parchment landing experiment and per-generation theme system are not the current web design system.

### Source precedence

Use this order when making a new visual decision:

1. Effective custom properties and route-scoped selectors in `src/app/globals.css`.
2. Shared Base UI primitives in `src/components/ui/` and the variants in `src/styles/shadcn-tailwind.css`.
3. Shared domain color data in `packages/core/src/types/pokemon.ts`.
4. Feature-local styles in the route or component. A local exception is allowed for TCG rarity, quiz feedback, charts, illustrations, or a dedicated visual experiment, but it must not silently redefine the global shell.

## 2. Color palette and roles

The web foundation uses exact sRGB hex and RGBA values. `color-mix(in oklab, ...)` is used to derive restrained tints; do not replace the source tokens with approximate hex colors.

### Light foundation

| Token | Value | Role |
| --- | --- | --- |
| `--background` | `#F2F6FF` | Cool blue-white page canvas. |
| `--foreground` | `#14265D` | Primary ink, headings, and important data. |
| `--card` | `#FFFFFF` | Main cards, panels, toolbar surfaces, and popovers. |
| `--card-foreground` | `#14265D` | Text on cards. |
| `--popover` | `#FFFFFF` | Menus, dialogs, and floating surfaces. |
| `--popover-foreground` | `#14265D` | Text in floating surfaces. |
| `--primary` | `#5243B5` | Primary actions, active controls, progress, selected navigation, and focus. |
| `--primary-foreground` | `#FFFFFF` | Text and icons on primary surfaces. |
| `--accent` | `#DCE7FF` | Pale blue support surface and secondary emphasis. |
| `--accent-foreground` | `#173164` | Text on accent surfaces. |
| `--secondary` | `#E9EFFF` | Quiet secondary controls and grouped utility areas. |
| `--secondary-foreground` | `#173164` | Text on secondary surfaces. |
| `--muted` | `#EEF3FF` | Skeletons, quiet fills, and low-emphasis backgrounds. |
| `--muted-foreground` | `#53658E` | Supporting copy, metadata, and inactive controls. |
| `--destructive` | `#C94355` | Errors, reset, delete, and destructive feedback. |
| `--border` | `rgba(35, 62, 128, 0.16)` | Default boundary and separator. |
| `--border-strong` | `rgba(35, 62, 128, 0.30)` | Emphasized boundary. |
| `--input` | `rgba(35, 62, 128, 0.18)` | Input and control boundary. |
| `--ring` | `#5243B5` | Keyboard focus ring. |

### Dark foundation

| Token | Value | Role |
| --- | --- | --- |
| `--background` | `#07144F` | Deep ultramarine canvas. |
| `--foreground` | `#FFF8FC` | Warm white text and headings. |
| `--card` | `#123B86` | Raised cobalt cards and panels. |
| `--card-foreground` | `#FFF8FC` | Text on dark cards. |
| `--popover` | `#0B1D5B` | Dark floating surfaces and menus. |
| `--popover-foreground` | `#FFF8FC` | Text in dark floating surfaces. |
| `--primary` | `#C9B8FF` | Lifted lavender action and selection color. |
| `--primary-foreground` | `#10164F` | Dark ink on lavender primary surfaces. |
| `--accent` | `#8DB4FF` | Bright blue support accent and secondary emphasis. |
| `--accent-foreground` | `#08154A` | Dark text on accent surfaces. |
| `--secondary` | `#17356F` | Secondary cobalt surface. |
| `--secondary-foreground` | `#FFF8FC` | Text on secondary surfaces. |
| `--muted` | `#18366F` | Quiet dark fill and skeleton background. |
| `--muted-foreground` | `#A9B9E8` | Supporting copy and inactive controls. |
| `--destructive` | `#FF8D9B` | Lifted destructive feedback. |
| `--border` | `rgba(201, 184, 255, 0.24)` | Default lavender boundary. |
| `--border-strong` | `rgba(229, 222, 255, 0.46)` | High-emphasis boundary and separators. |
| `--input` | `rgba(201, 184, 255, 0.24)` | Input and control boundary. |
| `--ring` | `#C9B8FF` | Keyboard focus ring. |

### Depth tokens

| Token | Light value | Dark value | Use |
| --- | --- | --- | --- |
| `--pixel-shadow` | `rgba(35, 62, 128, 0.16)` | `rgba(2, 7, 38, 0.42)` | Main shadow color. |
| `--shadow-pixel` | `0 18px 48px var(--pixel-shadow)` | Same form | Large surfaces and toolbars. |
| `--shadow-pixel-sm` | `0 8px 22px rgba(35, 62, 128, 0.12)` | `0 8px 22px rgba(2, 7, 38, 0.28)` | Cards, buttons, and compact controls. |

The overall system is softly elevated rather than flat. Hard offset shadows are reserved for interaction states and selected landing CTAs, usually `3px 3px 0` to `5px 5px 0` in a color-mixed primary tone. Do not add large blurred shadows to every small control.

### Integration colors

`src/lib/site.ts` exposes the public integration values used by metadata and browser-facing assets:

- `PRIMARY_COLOR`: `#5243B5`
- `BACKGROUND_COLOR`: `#07144F`
- `ACCENT_COLOR`: `#8DB4FF`

The root viewport uses `#F2F6FF` in light mode and `#07144F` in dark mode. The home page declares `#F7F9FF` for its light viewport and keeps `#07144F` for dark mode. These integration values do not authorize a separate palette for new components.

### Semantic action accents

Use these only when the action has the corresponding meaning. They are not decorative brand colors.

| Role | Light token | Dark token |
| --- | --- | --- |
| Favorite | `oklch(0.70 0.090 20)` | `oklch(0.75 0.100 22)` |
| Compare | `oklch(0.68 0.090 250)` | `oklch(0.74 0.095 252)` |
| Team | `oklch(0.72 0.090 162)` | `oklch(0.78 0.095 164)` |
| Caught | `var(--primary)` | `var(--primary)` |
| Legendary/mythical | `oklch(0.82 0.090 80)` | `oklch(0.87 0.090 80)` |

### Pokémon type palette

`TYPE_COLORS` in `packages/core/src/types/pokemon.ts` is the canonical data palette. Use it for type badges, active type filters, type bars, charts, and type-driven card accents. Use a tint or `color-mix()` for surfaces; reserve the raw color for labels, swatches, or a clearly active state.

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

The `--type-*` variables in `globals.css` are lower-chroma OKLCH reserve tokens for components that explicitly consume them. They are not a replacement for `TYPE_COLORS`. Feature-local TCG rarity, quiz verdict, ownership, and chart colors may use vivid emerald, red, amber, violet, cyan, pink, or slate accents, but those colors must remain close to the data they explain.

## 3. Typography rules

### Typeface roles

- **Pixelify Sans** is the display voice, loaded through `next/font/google` at weights `400`, `500`, `600`, and `700`. It is used by headings, page titles, the wordmark, Pokémon names, and prominent feature labels.
- **Nunito** is the reading voice, loaded at weights `400`, `600`, and `700`. It is used for body copy, navigation, controls, descriptions, and localized content.
- **Monospace** is `ui-monospace, SFMono-Regular, Menlo, Consolas, Liberation Mono`. Use it for catalog numbers, IDs, stats, filters, compact labels, and technical metadata.

The CSS frequently requests `font-weight: 800` or `900` for high-emphasis display copy even though the downloaded display range stops at `700`; preserve the existing font setup and let the browser synthesize the heavier weight. Both Google fonts use `display: optional` and `preload: false`. The body fallback chain includes `Hiragino Sans`, `Noto Sans CJK JP`, and `Microsoft YaHei` for the supported Asian locales.

### Hierarchy

| Level | Current expression | Guidance |
| --- | --- | --- |
| Pokédex hero | `clamp(3.75rem, 9vw, 7rem)` on large screens; smaller mobile clamp | Short, high-impact title with tight `0.84` line-height. |
| Generic page title | `page-title`, display font, `clamp(1.75rem, 4vw, 3rem)` compact to `text-6xl` standard | Use as the page anchor; keep `text-wrap: balance`. |
| Home hero/section title | Display font, roughly `clamp(3.25rem, 4.7vw, 5rem)` desktop | Editorial, compact, and strongly tracked negative. |
| Card/specimen title | Display font, usually `1rem`–`2.75rem` depending on surface | Favor recognition and short names over ornamental styling. |
| Body | `0.9rem`–`1.18rem`, usually `1.6`–`1.72` line-height | Give localized text room to wrap. |
| Micro-label | `0.55rem`–`0.75rem`, bold, uppercase, `0.08em`–`0.18em` tracking | Use for status, tabs, filters, and controls. |
| Catalog metadata | Monospace, approximately `0.55rem`–`0.7rem`, uppercase | Use for IDs, numbers, stat labels, and technical context. |

Large headings use tight or negative tracking, while short uppercase labels use positive tracking. Never uppercase paragraphs or long localized copy. The legacy `gradient-text-*` helpers intentionally resolve to `var(--foreground)`; do not interpret their names as permission to add gradient text.

## 4. Geometry, depth, and component styling

### Geometry vocabulary

- Base `--radius`: `0.5rem`.
- Tailwind theme radii: `--radius-sm: 0.375rem`, `--radius-md: 0.5rem`, `--radius-lg: 0.75rem`.
- Base border width: `1px`.
- Minimum interactive target: `2.75rem` (`44px`) through the `touch-target` utility.
- The visual language is rounded and calm. “Pixel” describes the responsive lift/press behavior and data-console character, not universally square corners.

### Surface families

| Surface | Effective geometry | Use |
| --- | --- | --- |
| Generic framed panel | `1px` border, `1rem` radius, card/background mix, `--shadow-pixel` | Page headers, content panels, dialogs, and large modules. |
| Generic compact surface | `1px` border, `0.75rem` radius, card/background mix, `--shadow-pixel-sm` | Cards, controls, toolbars, and type-accent blocks. |
| Generic toolbar | `1.15rem` radius, translucent card mix, `18px` backdrop blur, inset highlight | Fixed global header and floating navigation. |
| Pokédex console | `1.35rem` controls, `1.05rem` search field, `0.85rem` action controls | Search, sort, filters, and result state. |
| Pokédex card | `1px` border, `1.25rem` radius, gradient cobalt surface | Specimen grid; `19.75rem` desktop height and `18.6rem` mobile height. |
| Home panel | `1px` border, `1.25rem` radius, translucent panel, `14px` blur, soft shadow | Collection preview, Pokédex specimen, team preview, and trust cards. |
| Home FAQ item | `1px` border, `1rem` radius, compact panel | Expandable questions and answers. |
| Pill/status | Use `rounded-full` only for true status dots, progress dials, and compact type/status chips | A pill communicates a compact semantic state, not a default container shape. |

When a component uses the historical `glass-*` class name, follow the effective surface family above. “Glass” is a compatibility name: use restrained translucency for toolbars and selected landing panels, not a blur-heavy treatment on every data card.

### Buttons and controls

The shared `Button` variants are `default`, `outline`, `secondary`, `ghost`, `glass`, `surface`, `destructive`, and `link`. Sizes are `xs` (`36px`), `sm` (`40px`), `default` (`44px`), `lg` (`48px`), `touch` (minimum `44px`), and icon sizes from `36px` to `48px`.

- The filled `default`/primary button is the strongest action and uses the primary token with a small shadow.
- Outline, secondary, glass, and surface variants support secondary actions; ghost is reserved for low-emphasis navigation or icon controls.
- Hover generally lifts by `-1px` on both axes and increases the offset shadow; press moves by roughly `2px` and removes the shadow.
- Icon-only controls must be named accessibly. Keep the `44px` hit area even if the icon is visually `14px`–`18px`.
- Navigation, filters, tabs, and technical actions commonly use uppercase monospace or bold microcopy. Explanatory CTAs may use sentence case when localization needs it.
- Preserve stable semantic colors for favorite, compare, team, caught, wishlist, destructive, and legendary states across list, detail, and dashboard views.

### Inputs, tabs, cards, and overlays

- `Input` is a `44px`-high `glass-control` with `1rem` horizontal padding, an input-colored border, and a `2px` ring on focus.
- `Badge` is approximately `24px` high, bold, uppercase, `11px`, with `0.12em` tracking. Use the shared variants instead of inventing badge geometry.
- `Card` uses `glass-card`, a compact gap, `1rem` horizontal content padding, and a border-top footer when needed. Keep the card hierarchy quiet so artwork or data carries the emphasis.
- Tabs use a framed `glass-toolbar` list; the active tab becomes a card-colored raised item with a primary indicator line.
- Dialogs use a centered `glass-surface`, a foreground-tinted overlay, safe-area-aware bottom padding, and short fade/zoom transitions. Sheets use the same surface language and must preserve mobile safe areas.
- Sonner toasts use `.cn-toast`: popover surface, border, `--shadow-pixel`, and the active foreground tokens.
- Skeletons use muted fills and `.codex-shimmer` when a sweep improves perceived loading; the sweep is `2.4s` and must stop under reduced motion.

### Header and page header

The shared header is fixed below the safe-area inset and centered inside a `glass-toolbar`/`codex-frame`. It contains the Lunidex mark, the `Luni`/italic `dex` wordmark, a `000 / 1025` progress readout, desktop primary navigation, a tools menu, command-palette search, favorites, language, theme, settings, account, and a mobile navigation trigger.

`PageHeader` is the standard route introduction: a responsive framed surface, a `56px` icon tile, a `page-eyebrow`, display-font title, muted description, optional badge, and a `2px` divider. Use `standard`, `hero`, or `compact` rather than creating a parallel heading shell.

### Pokédex visual subsystem

The Pokédex route intentionally becomes a dedicated dark/light field inside `.pokedex-redesign`:

- Dark canvas: deep ultramarine `#07144F`, blue middle gradient near `#09256F`, and deep edge `#050D38`, with small star-like radial marks.
- Dark raised surface: `#123B86` and `#17489C`; light mode maps the same structure to `#FFFFFF`, `#F2F6FF`, and `#EEF3FF`.
- Hero mark: luminous halo, orbit shapes, small stars, and the square Lunidex mark. The hero uses a two-column layout on larger screens and a compact mark in the upper-right on mobile.
- Search/filter console: translucent gradient panel, prominent `4.25rem` search field, `2.85rem` action controls, horizontally scrollable filter rails, and a visible result-status block.
- Specimen cards: approximately `19.75rem` tall on desktop, `18.6rem` on mobile, with a cobalt gradient, a `1.25rem` radius, type-derived glow, 44px action chips, official artwork, and a `translateY(-4px)` hover lift. Type colors tint the data; they do not recolor the whole route.

### TCG visual subsystem

TCG imagery uses a physical card ratio of `2.15 / 3` in catalogs, home previews, skeletons, and compare panels. The interactive `TCGHolographicCard` adds pointer-driven tilt through CSS variables, image shine, glare, rarity/type classes, and a semantic keyboard focus state. The holographic border sweep uses `7s` animation and must remain limited to TCG cards.

Use TCG rarity colors only for rarity labels and card feedback. Keep catalog metadata uppercase and compact, and keep ownership actions touch-sized. Do not apply the TCG shine, tilt, or physical card radius to ordinary dashboard cards.

## 5. Layout and responsive principles

### Composition

- The base `.page-shell` is centered at `min(100%, 90rem)` with `1rem` side padding, `1.5rem` from `640px`, and `2rem` from `1024px`. Generic application routes raise the effective ceiling to `92rem`; feature content commonly uses `max-w-6xl`.
- Use mobile-first layout. Dense Pokémon grids may use 2 columns from the smallest supported width, then 3/4/5 columns as available; never force a label to fit by shrinking it below a readable size.
- Use about `0.7rem`–`1.15rem` for dense Pokédex grids, `1rem` for standard/bento card gaps, and larger `2rem`–`6rem` gaps for hero compositions. Section padding should use `clamp()` where the screen is editorial.
- Keep filter rails and long control rows scrollable with `scroll-snap-x`, `scroll-snap-align-start`, hidden scrollbars, and `overscroll-behavior-x: contain` when wrapping would harm scanability.
- Reserve top space for the fixed header (`pt-28`/`pt-32` on the Pokédex and a safe-area-aware clamp on home). Do not allow content to sit underneath the header.

### Home composition

The home route is a clear, scrollable product introduction:

1. A fixed frosted header with navigation, language, theme, and a primary entry CTA.
2. A two-column hero (`0.92fr / 1.08fr`) with a large display title, concise promise, primary/secondary CTAs, a central Pokémon illustration, orbit lines, and three card previews.
3. A bento tools section: the collection preview spans two rows beside a Pokédex specimen and a team preview.
4. A collection-steps section with a heading column and ruled step list.
5. A two-card local-first/open-source section.
6. A centered FAQ accordion with a maximum reading width of `56rem`.

On screens below `768px`, the hero and bento become one column, CTAs stack to full width, and the team roster uses two columns. At very narrow widths, content padding can fall to `0.9rem`; localized copy must still wrap without horizontal overflow.

### Accessibility, localization, and platform behavior

The web supports `en`, `fr`, `es`, `de`, `it`, `ja`, `ko`, and `zh`, plus an `auto` preference. Use `useTranslation`/server translation helpers for all new copy, preserve the font fallback chain, and assume labels may become substantially longer in German or French. Maintain visible focus, named icon actions, `44px` touch targets, sufficient contrast for muted metadata, `next/image` with meaningful alt text, safe-area padding, and `prefers-reduced-motion` behavior.

## 6. Motion, texture, and media

Motion is brief, physical, and subordinate to the information hierarchy:

- Shared interaction transitions target `180ms` with the `cubic-bezier(0.22, 1, 0.36, 1)` ease; component primitives may use shorter `100ms` state changes.
- `fadeInUp`: `0.6s`, `18px` upward entrance.
- `scaleIn`: `0.5s`, starting at `96%` scale.
- `codex-shimmer`: `2.4s` skeleton sweep.
- `pulseSlow`: `4.5s` for emphasis or `8s` for ambient breathing.
- `statFill`: `1s` reveal from zero.
- `holographicShimmer`: `7s`, only for holographic TCG borders.
- Pokédex hero orb float: `7s`; home card previews respond to pointer with up to approximately `10°` tilt, never on touch.
- Home word reveals are word-aware through `Intl.Segmenter`, with an immediate accessible text fallback.

The body has a repeated `240px` SVG fractal-noise layer: light mode uses multiply at `0.18`, dark mode uses screen at `0.10`. Under reduced motion it drops to `0.06`. Home and Pokédex add restrained radial glows, grid/orbit marks, and artwork drop shadows; these remain backgrounds or media treatments, never text replacements.

Every animation needs a reduced-motion path. Under `prefers-reduced-motion: reduce`, transitions collapse to near-zero, entrance content is immediately visible, card tilt and holographic motion stop, the Pokédex orb stops, and no information depends on an animation completing.

## 7. Mobile platform boundary

The Expo companion shares domain data and the canonical Pokémon type hex values, but it has an independent native palette. Do not port web CSS classes, `color-mix()`, backdrop blur, or web shadow geometry into React Native.

| Token | Mobile light | Mobile dark |
| --- | --- | --- |
| Background | `#F5F6FB` | `#0B1020` |
| Surface | `#FFFFFF` | `#141A2E` |
| Alternate surface | `#EEF0F7` | `#1B2238` |
| Card | `#FFFFFF` | `#161D33` |
| Border | `#E3E6F0` | `#28304A` |
| Text | `#11131C` | `#F3F5FC` |
| Muted text | `#5B6071` | `#A3ABC4` |
| Faint text | `#9AA0B4` | `#6F7796` |
| Primary | `#4F46E5` | `#7C83FF` |
| Primary text | `#FFFFFF` | `#0B1020` |
| Accent | `#EC4899` | `#F472B6` |
| Danger | `#E11D48` | `#FB7185` |
| Success | `#16A34A` | `#4ADE80` |

Mobile overlays and shadows are native-specific. Keep the contract equivalent, but let each platform express its own surface, navigation, and touch conventions.

## 8. Do and don’t

### Do

- Reuse the web tokens, `cn()`, Base UI primitives, and established route shells.
- Use cobalt/periwinkle light mode and ultramarine/lavender dark mode for new web surfaces.
- Use thin borders, rounded panels, restrained translucency, and diffused depth; use hard offset shadows only as an interaction or selected CTA signal.
- Use exact `TYPE_COLORS` for Pokémon data and semantic action tokens for user actions.
- Keep Pixelify Sans for display, Nunito for reading, and monospace for compact data.
- Design for all eight locales, safe areas, keyboard focus, reduced motion, and 44px targets.
- Treat TCG physical-card geometry and holographic effects as a feature-local exception.

### Don’t

- Do not reintroduce the old warm parchment/terracotta shell as the default web palette.
- Do not refer to `src/lib/generation-themes.ts` or build new per-generation UI themes; that source is retired and does not exist in the current repository.
- Do not use saturated Pokémon types, TCG rarities, or chart colors as page backgrounds.
- Do not add a new radius, shadow, or color family inside a feature without documenting its semantic role.
- Do not apply heavy blur, holographic shine, pointer tilt, or physical TCG card geometry to ordinary dashboard surfaces.
- Do not use gradient text; the existing `gradient-text-*` classes intentionally render foreground text.
- Do not hard-code English copy, hide overflow to force a localized label into one line, or remove accessible names from icon-only controls.

## 9. Prompting vocabulary for new screens

Describe the system semantically: “cobalt-indigo Pokémon field console,” “blue-white periwinkle light canvas,” “deep ultramarine dark canvas,” “raised white/cobalt data cards,” “lavender primary action,” “thin translucent border,” “soft diffused elevation,” “Pixelify display headings,” “Nunito reading copy,” and “monospace catalog metadata.”

For a new screen, specify the light/dark role mapping and the functional hierarchy first. Add Pokémon type or TCG rarity color only where the data requires it. Preserve the exact runtime values above and keep new compositions compatible with the shared header, localization, safe areas, keyboard focus, and reduced-motion rules.
