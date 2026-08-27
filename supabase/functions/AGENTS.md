# Supabase Edge Function guide

This guide applies to the Deno function under `supabase/functions/poll-tcg-prices/`. It is separate from the Node.js/npm application and from the Neon runtime.

## Runtime and security

- Keep imports and APIs Deno-compatible. The function uses the Supabase JS client through a remote ESM import; do not add Node-only or npm-only assumptions.
- Required Supabase secrets are `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`, and `CRON_SECRET`. Keep them in the function environment and never expose/log them.
- The function is deployed with JWT verification disabled, so every scheduled `POST` must carry the exact `Authorization: Bearer <CRON_SECRET>` credential. Missing or invalid credentials must fail closed.
- Preserve the public-HTTPS push endpoint validation and DNS/private-network protections in `security.ts` before any outbound push request. Keep fetches bounded and avoid logging personal data.
- Handle partial TCGdex or push failures without turning one bad subscription/upstream response into an unbounded retry or a silent success.

## Verification and deployment

Deploying is external and requires explicit approval after secret and scheduler configuration have been reviewed:

```bash
supabase functions deploy poll-tcg-prices --no-verify-jwt
```
