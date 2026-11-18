# syntax=docker/dockerfile:1.7

FROM node:22.23.4-bookworm-slim AS base

WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

FROM base AS deps

COPY package.json package-lock.json ./
COPY packages/core/package.json packages/core/package.json
RUN npm ci

FROM base AS builder

ARG NEXT_DEPLOYMENT_ID
ARG NEXT_PUBLIC_NEON_AUTH_URL
ARG NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN
ARG NEXT_PUBLIC_POSTHOG_HOST
ARG NEXT_PUBLIC_POSTHOG_ENABLED=false
ARG NEXT_PUBLIC_POSTHOG_ENVIRONMENT
ARG NEXT_PUBLIC_APP_RELEASE
ARG NEXT_PUBLIC_POSTHOG_REPLAY_SAMPLE_RATE
ARG NEXT_PUBLIC_SENTRY_DSN
ARG NEXT_PUBLIC_SENTRY_ENVIRONMENT
ARG NEXT_PUBLIC_SENTRY_RELEASE
ARG NEXT_PUBLIC_GOOGLE_VERIFICATION
ARG NEXT_PUBLIC_VAPID_PUBLIC_KEY

ENV NEXT_DEPLOYMENT_ID=${NEXT_DEPLOYMENT_ID} \
    NEXT_PUBLIC_NEON_AUTH_URL=${NEXT_PUBLIC_NEON_AUTH_URL} \
    NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN=${NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN} \
    NEXT_PUBLIC_POSTHOG_HOST=${NEXT_PUBLIC_POSTHOG_HOST} \
    NEXT_PUBLIC_POSTHOG_ENABLED=${NEXT_PUBLIC_POSTHOG_ENABLED} \
    NEXT_PUBLIC_POSTHOG_ENVIRONMENT=${NEXT_PUBLIC_POSTHOG_ENVIRONMENT} \
    NEXT_PUBLIC_APP_RELEASE=${NEXT_PUBLIC_APP_RELEASE} \
    NEXT_PUBLIC_POSTHOG_REPLAY_SAMPLE_RATE=${NEXT_PUBLIC_POSTHOG_REPLAY_SAMPLE_RATE} \
    NEXT_PUBLIC_SENTRY_DSN=${NEXT_PUBLIC_SENTRY_DSN} \
    NEXT_PUBLIC_SENTRY_ENVIRONMENT=${NEXT_PUBLIC_SENTRY_ENVIRONMENT} \
    NEXT_PUBLIC_SENTRY_RELEASE=${NEXT_PUBLIC_SENTRY_RELEASE} \
    NEXT_PUBLIC_GOOGLE_VERIFICATION=${NEXT_PUBLIC_GOOGLE_VERIFICATION} \
    NEXT_PUBLIC_VAPID_PUBLIC_KEY=${NEXT_PUBLIC_VAPID_PUBLIC_KEY}

COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN --mount=type=secret,id=sentry_auth_token,required=false \
    if [ -s /run/secrets/sentry_auth_token ]; then \
      export SENTRY_AUTH_TOKEN="$(cat /run/secrets/sentry_auth_token)"; \
    fi \
    && npm run build

FROM node:22.23.4-bookworm-slim AS runner

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    HOSTNAME=0.0.0.0 \
    PORT=3000 \
    NODE_OPTIONS=--max-old-space-size=1024

WORKDIR /app

RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 --ingroup nodejs nextjs \
    && mkdir -p /app/.next/cache \
    && chown -R nextjs:nodejs /app/.next

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
# Next bundles this driver into route chunks but omits it from the standalone
# root module tree; the deployment's direct Node health check needs the ESM entry.
COPY --from=builder --chown=nextjs:nodejs \
    /app/node_modules/@neondatabase/serverless/package.json \
    /app/node_modules/@neondatabase/serverless/index.mjs \
    ./node_modules/@neondatabase/serverless/

USER nextjs
EXPOSE 3000

CMD ["node", "server.js"]
