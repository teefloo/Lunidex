# PrimeDex Product Context

## Product

PrimeDex is a Pokémon companion web application. The TCG collection surface is a product tool/dashboard rather than a marketing page.

## Users and purpose

The primary users are Pokémon TCG collectors who want to monitor their personal collection across sets. On `/tcg/collection`, their main job is to understand their overall progress and quickly identify which cards or sets are still incomplete.

The page is used on mobile and desktop with equal importance. Users should be able to scan progress, search for a set, sort the set list, and open a set album without learning a complex interface.

## Brand personality

PrimeDex should feel playful, tactile, nostalgic, and energetic while remaining practical. The existing PrimeDex visual language—warm palette, pixel-style shadows, compact uppercase labels, card-inspired surfaces, and TCG imagery—is part of the product identity and must be preserved.

## Anti-references

Avoid turning the collection page into:

- a generic enterprise analytics dashboard;
- a spreadsheet-like dense data table;
- a marketplace interface dominated by prices;
- an animation-heavy game screen that hides the collection status.

## Product principles

1. Progress and missing cards are the primary information.
2. Preserve the current page structure and visual identity while improving responsive behavior.
3. Prefer readable wrapping and predictable stacking over cramped controls or hidden overflow.
4. Every action must work with pointer, touch, keyboard, and assistive technology.

## Accessibility and responsive requirements

- Target WCAG 2.2 AA.
- Keep visible interactive targets at least 44×44 CSS pixels.
- Support keyboard focus, visible focus states, semantic names, and reduced motion.
- Validate the page at 320, 375, 414, and 768 CSS pixels without horizontal document overflow.
- Preserve desktop behavior and styling while allowing fluid widths and stacked mobile layouts.
