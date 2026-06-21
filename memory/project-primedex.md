---
name: project-primedex
description: PrimeDex app stack — Next.js 16, Tailwind v4, RSC, TanStack Query, Zustand/IndexedDB, 9-language i18n
metadata:
  type: project
---

Next.js 16 app (webpack mode, not turbopack). Tailwind v4 (`@import "tailwindcss"` in globals.css, no tailwind.config.js). RSC throughout with TanStack Query for client data. Zustand + IndexedDB for persistent state (favorites, team, caught). i18n via i18next, 9 languages: en/fr/de/es/it/ja/ko/zh + x-default. Routes: `/[lang]/pokemon/[name]`, `/team`, `/compare`, `/tcg`, `/quiz`, `/types`, `/moves`, `/favorites`, `/dashboard`. `src/lib/site.ts` holds PRIMARY_COLOR, BACKGROUND_COLOR used in metadata.

**Why:** Needed to understand the constraints before any visual work — don't touch data/state/routing layers.
**How to apply:** Visual-only changes stay in CSS tokens and component styles. Never touch i18n, API routes, or data fetching.
