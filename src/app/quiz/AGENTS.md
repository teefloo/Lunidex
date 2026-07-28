# PrimeDex Quiz Module (Trial Chambers)

This directory contains the implementation of the **Trial Chambers**, a gamified Pokémon knowledge testing suite within the PrimeDex application.

## 🌟 Overview

The Quiz module is a high-performance, interactive feature that challenges users to identify Pokémon based on various visual and technical criteria. It leverages the project's core stack (Next.js 16, React 19, Framer Motion) to deliver a "buttery-smooth" gaming experience with instant feedback and persistent progress tracking.

## 📂 Directory Structure

- `layout.tsx`: Defines the metadata, OpenGraph tags, and JSON-LD structured data for SEO and social sharing.
- `page.tsx`: The main entry point containing the game logic, state management, and UI for all quiz modes.

## 🕹️ Game Mechanics

### Game Modes
- **Marathon**: The default mode. Build a high score; the run ends after five wrong answers.
- **Time Attack**: A high-pressure mode where the player has 30 seconds to answer as many questions as possible. Each correct answer adds to the score.
- **Survival**: Players start with 3 lives. A single wrong answer loses a life; the game ends when all lives are gone.

### Challenge Types
- **Classic**: Players identify a Pokémon from its high-quality official artwork.
- **Silhouette**: A "Who's That Pokémon?" style challenge where the artwork is blacked out.
- **Stats**: A technical mode where players must identify a Pokémon based solely on its base stat distribution bars.

### Daily Challenge
A special seeded mode that provides the same 10-question sequence to all players on a given day. Results are tracked separately, use `seededRandom` for consistent cross-player experiences, and can be submitted to the authenticated online leaderboard when Supabase is configured.

## 🛠️ Technical Implementation

### State Management
- **Local State**: Manages immediate game flow (current Pokémon, options, timer, lives) using React `useState` and `useCallback`.
- **Global Store**: High scores, earned badges, quiz history, and activity are persisted through **Zustand** and the web store's IndexedDB adapter (`src/store/primedex.ts`).

### Data Fetching
- Uses **TanStack Query (React Query)** to fetch and cache Pokémon names and details from the PokéAPI.
- Implements custom filtering logic to allow users to target specific Generations (1-9) or Types, using the centralized API façade.

### Animations & UI
- **Framer Motion**: Handles all transitions, including the "mystery" reveal animations and glassmorphic UI effects.
- **Tailwind CSS 4**: Used for the "Gaming Interface" aesthetic, featuring glassmorphism, gradients, and responsive layouts.
- **Lucide React**: Provides the icon set for game actions and achievements.

## 🏆 Achievements (Badges)
The module tracks several milestones:
- `quiz-novice`: Reach a score of 10 in Marathon.
- `quiz-master`: Reach a score of 50 in Marathon.
- `speed-demon`: Reach a score of 100 in Time Attack.
- `eagle-eye`: Reach a score of 20 in Silhouette mode.
- `professor`: Reach a score of 20 in Stats mode.

## 🚀 Development Guidelines

- **Client-Side Logic**: As a highly interactive game, `page.tsx` is a `'use client'` component. Keep heavy game logic encapsulated within this file or dedicated hooks.
- **Animations**: Always use `AnimatePresence` for state-driven UI changes (e.g., loading states, answer feedback) to maintain the "Hyper-Fluid" feel.
- **i18n**: Use the project's `useTranslation` hook from `@/lib/i18n` for all user-facing text. The application supports English, French, Spanish, German, Italian, Japanese, Korean, and Chinese.
- **SEO**: Update `layout.tsx` metadata if new game modes or significant features are added.

## 🧪 Testing
Run the Vitest suite from the repository root:
```bash
npm run test -- --run
```
