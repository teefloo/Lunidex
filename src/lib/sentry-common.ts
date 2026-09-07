type SentryRequest = {
  url?: string;
  query_string?: unknown;
  cookies?: unknown;
  data?: unknown;
  headers?: unknown;
};

type SentryBreadcrumb = {
  data?: Record<string, unknown>;
};

type SentryEvent = {
  request?: SentryRequest;
  user?: unknown;
  breadcrumbs?: SentryBreadcrumb[];
};

const URL_KEYS = ['url', 'to', 'from', 'http.url', 'url.full'] as const;

function redactUrl(value: string): string {
  try {
    const parsed = new URL(value, 'https://lunidex.app');
    parsed.search = '';
    parsed.hash = '';

    if (value.startsWith('/')) {
      return `${parsed.pathname}${parsed.search}${parsed.hash}`;
    }

    return parsed.toString();
  } catch {
    return value.split(/[?#]/, 1)[0] ?? value;
  }
}

/**
 * Keep Sentry useful for debugging while removing request material that may
 * contain credentials, form values, or identifying query parameters.
 */
export function scrubSentryEvent<T extends SentryEvent>(event: T): T {
  if (event.request) {
    if (event.request.url) {
      event.request.url = redactUrl(event.request.url);
    }
    delete event.request.query_string;
    delete event.request.cookies;
    delete event.request.data;
    delete event.request.headers;
  }

  delete event.user;

  if (event.breadcrumbs) {
    event.breadcrumbs = event.breadcrumbs.map((breadcrumb) => {
      if (!breadcrumb.data) return breadcrumb;

      const data = { ...breadcrumb.data };
      for (const key of URL_KEYS) {
        if (typeof data[key] === 'string') {
          data[key] = redactUrl(data[key]);
        }
      }

      delete data.body;
      delete data.request;
      delete data.response;
      return { ...breadcrumb, data };
    });
  }

  return event;
}
