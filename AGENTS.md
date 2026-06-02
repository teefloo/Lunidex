# Agent Instructions

## Package Manager
Use **npm** (not yarn or pnpm):
```bash
npm install
npm run dev      # next dev --webpack (not turbopack)
npm run build
npm run lint     # eslint v9 with eslint-config-next
npm run test     # node ./node_modules/vitest/vitest.mjs (jsdom)
npm run typecheck
```

## File-Scoped Commands
| Task | Command |
|------|---------|
| Typecheck | `npx tsc --noEmit` |
| Lint | `npx eslint path/to/file.tsx` |
| Test | `npx vitest path/to/file.test.ts` |
| Test UI | `npx vitest --ui` |

## Subtree Instructions
Per-directory `AGENT.md` files override the root for their subtree. Read the closest one before editing:
- `src/AGENT.md`, `src/app/AGENT.md`, `src/components/AGENT.md`, `src/lib/AGENT.md`, `src/lib/api/AGENT.md`, `src/store/AGENT.md`, `src/types/AGENT.md`, `src/hooks/AGENT.md`
- Also under `src/components/`: `ui/`, `pokemon/`, `layout/`

## Repo-Specific Quirks
- **Dev uses webpack**, not turbopack — the `dev` script forces `--webpack`. The `next.config.ts` still declares a `turbopack.root`; leave it alone.
- **Agentation dev tool** runs on `http://localhost:4747` (CSP + `allowedDevOrigins` are pre-wired for it). Toggled via `NEXT_PUBLIC_ENABLE_AGENTATION=true` in `.env.local`. Don't add 4747 to CSP yourself.
- **Test setup is unwired**: `vitest.config.ts` points to `./src/test/setup.ts`, but the file does not exist. Create it before adding tests, or vitest will fail to start.
- **No CI yet** — there is no `.github/` directory. `vercel.json` only contains `{"name": "poke-app"}`; deploy config lives in the Vercel dashboard.
- **No project-level opencode config** — `.opencode/` is gitignored.

## Commit Attribution
AI-authored commits MUST include:
`Co-authored-by: Gemini CLI <agent@gemini.google.com>`

## Detailed Instructions
- [Architecture](docs/agent-instructions/architecture.md)
- [Code Conventions](docs/agent-instructions/conventions.md)
