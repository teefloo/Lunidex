import { flushSentryEvents, reportHttpFailure, reportSentryException } from '@/lib/sentry-observability';

export function withObservedRouteHandler<F extends (...args: never[]) => Response | Promise<Response>>(
  route: string,
  feature: string,
  handler: F,
): (...args: Parameters<F>) => Promise<Awaited<ReturnType<F>>> {
  return async (...args: Parameters<F>): Promise<Awaited<ReturnType<F>>> => {
    const requestCandidate = args[0] as unknown;
    const request = requestCandidate && typeof requestCandidate === 'object' && 'method' in requestCandidate
      && typeof requestCandidate.method === 'string'
      ? { method: requestCandidate.method }
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
      await flushSentryEvents();
      throw error;
    }
  };
}
