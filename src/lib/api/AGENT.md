# API

## Files
- `client.ts` Axios base instances (REST + GraphQL), interceptors, retry logic
- `rest.ts` PokeAPI REST endpoints
- `graphql.ts` PokeAPI GraphQL beta endpoints (raw string queries, no codegen)
- `tcg.ts` Pokemon TCGdex client
- `cache.ts` IndexedDB cache helpers with offline fallback
- `keys.ts` TanStack Query key factory

## Conventions
- Never call `fetch` or `axios` directly in components.
- Build query keys from `keys.ts`.
- Keep request and response types explicit.
- Keep API concerns centralized here.
- Store secrets only in environment variables.

## Endpoints
- REST: `https://pokeapi.co/api/v2`
- GraphQL: `https://beta.pokeapi.co/graphql/v1beta`
- TCG: `https://api.tcgdex.net`

## Commit Attribution
AI-authored commits MUST include:
`Co-authored-by: Gemini CLI <agent@gemini.google.com>`
