# API Route Handler Guide

This directory contains Lunidex's server-side Next.js Route Handlers. They expose integrations for Pokémon, TCG, Neon-backed features, Open Graph images, push notifications, and other server-only workflows.

## Implementation rules

- Keep handlers server-side. Never import route handlers into client components and never expose service-role keys or other secrets.
- `DATABASE_URL` is the sensitive Neon connection string supplied by the Vercel
  integration; keep it server-only and never add it to `NEXT_PUBLIC_*`, logs,
  responses, tests, or mobile configuration. `SUPABASE_SERVICE_ROLE_KEY` is
  only for the archived migration tooling; it is not used by the application runtime.
- Use `NextRequest` and `NextResponse`, await the App Router `params` promise, and return explicit status codes for invalid, unauthenticated, unavailable, or upstream-failed requests.
- Validate and bound every query parameter, path parameter, JSON body, and user-controlled URL before using it or passing it to an upstream service.
- Reuse `@/lib/api` for PokéAPI, GraphQL, TCGdex, and related external data access. Reuse `@/lib/api/route-helpers`, `@/lib/rate-limit`, and the established Neon server helpers instead of creating parallel utilities.
- Authenticate from the request token/session and derive the user ID server-side. Do not trust a `user_id` supplied in a request body.
- Apply rate limits to public or mutation-heavy endpoints and avoid logging emails, tokens, subscriptions, or other personal data.

## Runtime and caching

- Choose `runtime = 'edge'` only when the handler and its dependencies are Edge-compatible. Open Graph handlers using `next/og` and the bundled fonts currently use Node.js because of the Edge bundle-size limit.
- Declare `revalidate` or `Cache-Control` only when the response is safe to cache. Do not cache personalized or authenticated responses publicly.
- Preserve graceful local-first behavior when Neon is not configured; return the route's established unavailable response rather than throwing during module initialization.

## Verification

Run from the repository root:

```bash
npm run lint
npm run typecheck
npm run test -- --run
```

Add focused tests for parsing, validation, authentication, rate limits, and failure responses when changing a handler.
