import { flushSentryEvents, reportHttpFailure, reportSentryException } from '@/lib/sentry-observability';
import { capturePostHogServerException } from '@/lib/posthog-server';

export function withObservedRouteHandler<F extends (...args: never[]) => Response | Promise<Response>>(
  route: string,
  feature: string,
  handler: F,
): (...args: Parameters<F>) => Promise<Awaited<ReturnType<F>>> {
  return async (...args: Parameters<F>): Promise<Awaited<ReturnType<F>>> => {
    const requestCandidate = args[0] as unknown;
    const request = requestCandidate && typeof requestCandidate === 'object' && 'method' in requestCandidate
      && typeof requestCandidate.method === 'string'
      ? requestCandidate as { method: string; url?: string; headers?: Headers | Record<string, string | string[] | undefined> }
      : undefined;
    try {
      const response = await handler(...args);
      if (response.status >= 500) {
        reportHttpFailure(new Error('Route handler returned a server failure'), {
          feature,
          route,
          method: request?.method,
          status: response.status,
          operation: 'route-handler',
        });
        await capturePostHogServerException(new Error('Route handler returned a server failure'), {
          feature,
          route,
          method: request?.method,
          status: response.status,
          operation: 'route-handler',
          request,
        });
        await flushSentryEvents();
      }
      return response as Awaited<ReturnType<F>>;
    } catch (error) {
      reportSentryException(error, {
        feature,
        route,
        method: request?.method,
        operation: 'route-handler',
      });
      await capturePostHogServerException(error, {
        feature,
        route,
        method: request?.method,
        operation: 'route-handler',
        request,
      });
      await flushSentryEvents();
      throw error;
    }
  };
}
