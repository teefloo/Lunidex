# Types

## Files
- `pokemon.ts` shared Pokemon type system
- `tcg.ts` TCG-specific types

## Conventions
- Treat this folder as the source of truth for shared domain types.
- Prefer interfaces for object shapes and type aliases for unions.
- Avoid `any` and `Record<string, unknown>`.
- Reuse these types across app, components, and lib code.

## Commit Attribution
AI-authored commits MUST include:
`Co-authored-by: Gemini CLI <agent@gemini.google.com>`
