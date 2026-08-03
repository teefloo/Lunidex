# Lunidex — Team Builder Module

This directory contains the core logic and UI for the Pokémon Team Builder feature of Lunidex. It allows users to create, analyze, export, import, and share custom Pokémon teams.

## Directory Overview

This module is implemented as a Next.js route (`/team`) within the App Router architecture. It provides a highly interactive interface for managing a team of up to 6 Pokémon, with real-time feedback on type coverage, stat balance, and synergy.

## Key Files

- **`layout.tsx`**: Configures server-side metadata and SEO for the Team Builder page, including dynamic titles, descriptions, and JSON-LD structured data for search engines.
- **`page.tsx`**: The primary client component that orchestrates the team-building experience. It handles state management, data fetching, and renders complex visualizations such as the stats radar chart and type analysis panels.
- **`share/page.tsx`** and **`share/RedirectToTeam.tsx`**: Build localized share metadata and redirect shared team codes back to the team builder.

## Technical Architecture

- **Framework:** Next.js (App Router)
- **State Management:** Integrated with the global `usePrimeDexStore` (Zustand) to persist team selections across the application.
- **Data Fetching:** Utilizes `@tanstack/react-query` (`useQueries`) to fetch detailed data for all Pokémon in the team and their respective type relations in parallel.
- **Animations:** Uses `framer-motion` for smooth transitions when adding/removing Pokémon or switching between analysis views.
- **Visualizations:** Employs `recharts` for the stat distribution Radar chart, providing a clear overview of the team's strengths and weaknesses.
- **Analysis Engine:** Leverages `@/lib/team-analysis` to calculate defensive/offensive coverage and the overall "Synergy Score."

## Main Features

1.  **Team Management:** Add, remove, or clear the entire team (limited to 6 slots).
2.  **Type Analysis:** Detailed breakdown of team-wide weaknesses, resistances, and offensive coverage.
3.  **Synergy Scoring:** A custom algorithm that evaluates how well the selected Pokémon complement each other.
4.  **Auto-Complete Suggestions:** Uses `@/lib/api` to suggest Pokémon that fill specific type gaps in the current team.
5.  **Team Sharing:** Supports sharing teams via a generated URL code (e.g., `?code=25-6-9`) and deep-linking to load shared teams automatically.
6.  **Stat Balance Radar:** A visual representation of the team's average base stats (HP, Attack, Defense, etc.).
7.  **Internationalization:** Uses the project's `useTranslation` hook backed by `i18next`, with support for English, French, Spanish, German, Italian, Japanese, Korean, and Chinese.
8.  **Import and export:** Supports Showdown team import and export of the current team.

## Development Conventions

- **Client-Side Interactivity:** The main page is a `'use client'` component due to its heavy reliance on state and browser APIs (URLSearchParams, navigator.share).
- **Component Pattern:** Follows a modular structure, delegating heavy logic to utility libraries in `@/lib`.
- **Responsive Design:** Uses Tailwind CSS with a mobile-first approach, featuring custom "glassmorphism" panels for the dashboard UI.
- **SEO & Accessibility:** Ensures proper ARIA labels and structured data are present for a high-quality user experience.

## Building and Running

This module is part of the Lunidex Next.js application. Keep the historical `usePrimeDexStore` identifier and related persistence keys unchanged.
- **Build:** `npm run build`
- **Develop:** `npm run dev`
- **Lint:** `npm run lint`
- **Type Check:** `npm run typecheck`
- **Focused analysis tests:** `npm run test -- --run src/lib/team-analysis.test.ts`
