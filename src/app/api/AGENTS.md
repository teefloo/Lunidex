# Route Handler guide

This guide supplements the App Router guide for `src/app/api/`. These handlers are server-side boundaries for PokéAPI/TCGdex access, Neon-backed features, authentication, push notifications, and generated Open Graph images.

## Handler rules

- Keep handlers server-side. Never expose `DATABASE_URL`, `NEON_DATABASE_URL`, Neon Auth secrets, service-role keys, or VAPID private keys; never import a handler into a client component.
- The application runtime uses Neon Auth and Neon PostgreSQL. `src/lib/supabase` is a retained compatibility path, and `SUPABASE_SERVICE_ROLE_KEY` is not a web runtime credential.
- Use `NextRequest`/`NextResponse`, await promise-based `params`, validate and bound every path/query/body value, and return explicit status codes for invalid, unauthenticated, unavailable, upstream-failed, and successful cases.
- For authenticated handlers, derive the user from the request session/token with the established Neon helpers. Never trust a client-supplied `user_id`.
- Reuse `@/lib/api`, `@/lib/api/route-helpers`, `@/lib/rate-limit`, and the existing Neon server helpers. Apply rate limits to public or mutation-heavy endpoints and avoid logging personal data, tokens, emails, or credentials.

## Runtime and caching

- Use `runtime = 'edge'` only when all dependencies are Edge-compatible. The current `next/og` handlers with bundled fonts explicitly use Node.js because of their bundle/runtime constraints.
- Add `revalidate` or public `Cache-Control` only for responses that are safe to share. Never publicly cache personalized or authenticated responses.
- Preserve the established 503/unavailable behavior when Neon is unconfigured instead of throwing during module initialization.

## Verification

Add focused tests for parsing, validation, authentication/ownership, rate limits, status codes, caching, and failure responses when changing a handler. Run from the repository root:

```bash
npx vitest run src/app/api/tcg/price-alerts/route.test.ts
npm run test -- --run
npm run lint
npm run typecheck
```
