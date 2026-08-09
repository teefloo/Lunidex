# Lunidex Archive Field — Design

## Intent

Replace the current Three.js background in the Archive Corridor landing page with a quieter, CSS-only “Archive Field”. The landing keeps its dark editorial Pokémon identity while the background becomes a supporting layer instead of a competing 3D scene.

## Design direction

The field uses four restrained visual primitives:

- a soft terracotta halo behind the active content area;
- two offset elliptical archive rings, drawn as fine strokes;
- a low-contrast perspective grid that fades toward the edges;
- small fixed index marks that echo the existing `01 / 05` chapter language.

The primitives stay abstract and static by default. A very slow opacity/position drift may be used only where it improves depth; `prefers-reduced-motion: reduce` disables it completely. There is no floating sphere, scan beam, particle system, WebGL canvas, or camera choreography.

## Component boundary

`src/components/home/LunidexWorld.tsx` remains the wrapper boundary so `HomeArchiveExperience` does not need a structural rewrite. It becomes a server-safe decorative wrapper that renders:

- an `aria-hidden` `.lunidex-world-backdrop` layer;
- semantic landing content in `.lunidex-world-content` above it.

The wrapper no longer imports Three.js, GSAP, ScrollTrigger, browser observers, or animation state. The background is purely presentational and cannot affect navigation, copy, or persisted collection state.

## CSS behavior

- The backdrop is fixed to the viewport, pointer-events disabled, and remains behind the page content.
- The grid and rings use the Archive Field palette already established on the landing: ink `#080d11`, terracotta `#e8916b`, cool archive line `#b8d4d1`.
- Opacity is intentionally low enough for headline and card-panel contrast.
- Desktop gets the full field; mobile gets fewer rings, lower opacity, and no expensive filters beyond a single radial gradient.
- Reduced motion removes all transitions and animations while keeping the static field visible.
- WebGL fallback state is removed because no WebGL path remains.

## Dependency and performance impact

Remove `three`, `@types/three`, and `gsap` from the web dependency graph if they are not used elsewhere. This removes dynamic module loading, renderer setup, GPU context risk, per-scroll camera work, and the `pending / ready / failed` loading state from the home page.

## Verification

- Desktop screenshot: field stays subordinate, hero CTAs remain visible, and no decorative element crosses readable copy with excessive contrast.
- Mobile screenshot at 390px: no horizontal overflow and no clipped menu or CTA.
- Reduced-motion browser check: static field remains, with no animated transitions.
- `npm run lint`, `npm run typecheck`, focused landing tests, full Vitest, and `npm run build`.
