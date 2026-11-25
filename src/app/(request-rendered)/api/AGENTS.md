# Route Handler guide

This guide supplements the App Router guide for `src/app/api/`. These handlers are server-side boundaries for PokéAPI/TCGdex access, Supabase-backed features, authentication, push notifications, and generated Open Graph images.

## Handler rules

- Keep handlers server-side. Never expose `SUPABASE_DATABASE_URL`, `SUPABASE_MIGRATION_DATABASE_URL`, Supabase Auth secrets, service-role keys, or VAPID private keys; never import a handler into a client component.
- The application runtime uses Supabase Auth and PostgreSQL. `SUPABASE_SERVICE_ROLE_KEY` is used only for the account deletion Admin API and is not browser-visible.
- Use `NextRequest`/`NextResponse`, await promise-based `params`, validate and bound every path/query/body value, and return explicit status codes for invalid, unauthenticated, unavailable, upstream-failed, and successful cases.
- For authenticated handlers, derive the user from the request session/token with the established Supabase helpers. Never trust a client-supplied `user_id`.
- The `postgres` connection bypasses RLS. Every server handler must retain explicit authentication, ownership checks, rate limits for public or mutation-heavy endpoints, and must avoid logging personal data, tokens, emails, or credentials.
- Reuse `@/lib/api`, `@/lib/api/route-helpers`, `@/lib/rate-limit`, and the server-only Supabase database/auth helpers.

## Runtime and caching

- Use `runtime = 'edge'` only when all dependencies are Edge-compatible. The current `next/og` handlers with bundled fonts explicitly use Node.js because of their bundle/runtime constraints.
- Add `revalidate` or public `Cache-Control` only for responses that are safe to share. Never publicly cache personalized or authenticated responses.
- Preserve the established 503/unavailable behavior when Supabase is unconfigured instead of throwing during module initialization.

## Verification

Run from the repository root after changing a handler:

```bash
npm run lint
npm run typecheck
```
