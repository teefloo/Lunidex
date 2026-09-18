import * as Sentry from '@sentry/nextjs';
import { capturePostHogServerException } from '@/lib/posthog-server';

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('../sentry.server.config');
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('../sentry.edge.config');
  }
}

export async function onRequestError(...args: Parameters<typeof Sentry.captureRequestError>): Promise<void> {
  const [error, request, context] = args;
  Sentry.captureRequestError(...args);

  if (process.env.NEXT_RUNTIME !== 'nodejs') return;
  await capturePostHogServerException(error, {
    feature: 'next-request',
    route: context.routePath,
    operation: 'request-error',
    request,
    routerKind: context.routerKind,
    routeType: context.routeType,
  });
}
