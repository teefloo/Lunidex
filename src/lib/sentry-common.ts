type SentryRequest = {
  url?: string;
  query_string?: unknown;
  cookies?: unknown;
  data?: unknown;
  headers?: unknown;
};

type SentryBreadcrumb = {
  data?: Record<string, unknown>;
  message?: string;
};

type SentryExceptionValue = {
  type?: string;
  value?: string;
  stacktrace?: unknown;
};

type SentryEvent = {
  request?: SentryRequest;
  user?: unknown;
  breadcrumbs?: SentryBreadcrumb[];
  message?: string;
  exception?: { values?: SentryExceptionValue[] };
};

type SentryFeedbackEvent = {
  contexts?: {
    feedback?: {
      contact_email?: unknown;
      message?: unknown;
      name?: unknown;
      url?: unknown;
    };
  };
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

function redactText(value: string): string {
  return value
    .replace(/Bearer\s+[A-Za-z0-9._~-]+/gi, 'Bearer [redacted]')
    .replace(/[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g, '[redacted-email]')
    .replace(/([?&](?:token|access_token|refresh_token|code|email|password|secret)=)[^&\s]+/gi, '$1[redacted]')
    .replace(/\b((?:token|access_token|refresh_token|password|secret|authorization))\s*[:=]\s*[^\s,;]+/gi, '$1=[redacted]')
    .replace(/https?:\/\/[^\s)]+/gi, (url) => redactUrl(url))
    .replace(/(?:^|\s)(\/[^\s?]*\?[^\s)]+)/g, (match, url: string) => match.replace(url, redactUrl(url)))
    .slice(0, 4000);
}

function scrubStacktrace(value: unknown): unknown {
  if (typeof value === 'string') return redactText(value);
  if (!value || typeof value !== 'object') return value;

  const stacktrace = value as { frames?: unknown; [key: string]: unknown };
  if (!Array.isArray(stacktrace.frames)) return value;

  return {
    ...stacktrace,
    frames: stacktrace.frames.map((frame) => {
      if (!frame || typeof frame !== 'object') return frame;
      const safeFrame = { ...(frame as Record<string, unknown>) };
      delete safeFrame.vars;
      if (typeof safeFrame.filename === 'string') safeFrame.filename = redactUrl(safeFrame.filename);
      if (typeof safeFrame.context_line === 'string') safeFrame.context_line = redactText(safeFrame.context_line);
      return safeFrame;
    }),
  };
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

  if (typeof event.message === 'string') {
    event.message = redactText(event.message);
  }

  if (event.exception?.values) {
    event.exception.values = event.exception.values.map((exception) => ({
      ...exception,
      ...(typeof exception.value === 'string' ? { value: redactText(exception.value) } : {}),
      ...(exception.stacktrace ? { stacktrace: scrubStacktrace(exception.stacktrace) } : {}),
    }));
  }

  if (event.breadcrumbs) {
    event.breadcrumbs = event.breadcrumbs.map((breadcrumb) => {
      const data = breadcrumb.data ? { ...breadcrumb.data } : undefined;
      if (data) {
        for (const key of URL_KEYS) {
          if (typeof data[key] === 'string') {
            data[key] = redactUrl(data[key]);
          }
        }

        delete data.body;
        delete data.request;
        delete data.response;
      }
      return {
        ...breadcrumb,
        ...(typeof breadcrumb.message === 'string' ? { message: redactText(breadcrumb.message) } : {}),
        ...(data ? { data } : {}),
      };
    });
  }

  return event;
}

/** Feedback uses its own SDK hook and therefore needs a dedicated scrubber. */
export function scrubSentryFeedback<T extends SentryFeedbackEvent>(event: T): T {
  const feedback = event.contexts?.feedback;
  if (!feedback) return event;

  delete feedback.contact_email;
  delete feedback.name;
  if (typeof feedback.message === 'string') feedback.message = redactText(feedback.message);
  if (typeof feedback.url === 'string') feedback.url = redactUrl(feedback.url);

  return event;
}
