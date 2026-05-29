# Agent Instructions

## Package Manager
Use **npm** (not yarn or pnpm):
```bash
npm install
npm run dev      # next dev --webpack (not turbopack)
npm run build
npm run lint     # eslint v9 with eslint-config-next
npm run test     # vitest with jsdom
npm run typecheck
```

## File-Scoped Commands
| Task | Command |
|------|---------|
| Typecheck | `npx tsc --noEmit` |
| Lint | `npx eslint path/to/file.tsx` |
| Test | `npx vitest path/to/file.test.ts` |
| Test UI | `npx vitest --ui` |

## Commit Attribution
AI-authored commits MUST include:
`Co-authored-by: Gemini CLI <agent@gemini.google.com>`

## Detailed Instructions
- [Architecture](docs/agent-instructions/architecture.md)
- [Code Conventions](docs/agent-instructions/conventions.md)
