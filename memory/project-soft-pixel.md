---
name: project-soft-pixel
description: Soft Pixel design system — 8-bit cozy theme replacing Living Codex glassmorphism. Fonts, palette, tokens all changed.
metadata:
  type: project
---

Completed refonte from "Living Codex — Warm Parchment" to **Soft Pixel** (cozy 8-bit, warm pastel).

**Key files changed:**
- `src/app/globals.css` — full rewrite: new OKLCH palette, pixel tokens, removed all glass/mist tokens, pixel component grammar
- `src/app/layout.tsx` — fonts: Pixelify_Sans (display), Nunito (body), VT323 (mono)
- `src/lib/site.ts` — PRIMARY_COLOR `#E8916B`, BACKGROUND_COLOR `#211A17`, ACCENT_COLOR `#A8C5E0`

**Palette:** Light bg `oklch(0.945 0.028 85)` (warm cream), Dark bg `oklch(0.22 0.012 50)` (brun-encre). Primary peach `oklch(0.72 0.110 45)` light / `oklch(0.80 0.100 45)` dark.

**Pixel tokens:** `--radius: 0.125rem`, `--border-width: 3px`, `--shadow-pixel: 4px 4px 0 var(--pixel-shadow)`, `--shadow-pixel-sm: 2px 2px 0 var(--pixel-shadow)`.

**Surface aliases kept** (`--surface`, `--surface-strong`, `--surface-muted`, `--surface-border`) pointing to new card/border tokens for backwards compat with component files.

**Why:** User requested full visual refonte per detailed brief. Architecture/data/i18n left untouched.
**How to apply:** Any future UI work should follow pixel grammar: sharp corners, hard offset shadows, thick borders, no blur/glassmorphism.
