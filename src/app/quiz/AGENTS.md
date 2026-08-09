# Quiz route guide

This guide supplements the App Router guides for the client-heavy quiz route in `src/app/quiz/`.

## Behavior to preserve

- The route supports three challenges: `classic`, `silhouette`, and `stats`.
- It supports `marathon` (ends after five wrong answers), `survival` (three lives), and `time-attack` (30-second timer; correct answers score 10 instead of 1). Generation and type filters constrain the Pokémon pool.
- Daily mode uses the UTC date and seeded selection logic, displays a ten-question run, and submits the finished score through the existing authenticated leaderboard path when available. Preserve the seed inputs and server-side score validation when changing this flow.
- High scores, quiz history, badges, and activity use the web Zustand store. Do not persist remote Pokémon objects.

## Implementation rules

- Keep browser/game state in the client route or a dedicated local hook; use the centralized API façade and TanStack Query for Pokémon data.
- Keep answer transitions and loading/feedback states accessible. Preserve `AnimatePresence`, timer cleanup, and the current no-data/error behavior when changing animations or state transitions.
- Use `useTranslation` for all visible text and keep the eight locales, challenge labels, badge identifiers, and SEO metadata synchronized.
- Do not assume the online leaderboard exists when Neon is unconfigured; the local quiz must still work.

## Verification

From the repository root:

```bash
npm run test -- --run
npm run lint
npm run typecheck
```

Add focused coverage for changed quiz rules or helpers when a testable behavior changes.
