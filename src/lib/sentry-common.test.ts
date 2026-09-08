import { describe, expect, it } from 'vitest';

import { scrubSentryEvent, scrubSentryFeedback } from './sentry-common';

describe('Sentry event scrubbing', () => {
  it('removes request material and sensitive exception values', () => {
    const event = scrubSentryEvent({
      request: {
        url: 'https://lunidex.app/fr/profile?email=user@example.com&token=secret',
        query_string: 'email=user@example.com',
        data: { token: 'secret' },
        headers: { authorization: 'Bearer secret' },
      },
      exception: {
        values: [{ type: 'Error', value: 'Request failed for user@example.com with Bearer secret and token=private' }],
      },
      breadcrumbs: [
        { data: { url: '/api/profile?email=user@example.com', body: { secret: 'private' } } },
      ],
      user: { email: 'user@example.com', username: 'Ash' },
    });

    expect(event.request?.url).toBe('https://lunidex.app/fr/profile');
    expect(event.request).not.toHaveProperty('query_string');
    expect(event.request).not.toHaveProperty('data');
    expect(event.request).not.toHaveProperty('headers');
    expect(event.user).toBeUndefined();
    expect(event.exception?.values?.[0]?.value).not.toContain('user@example.com');
    expect(event.exception?.values?.[0]?.value).not.toContain('secret');
    expect(event.exception?.values?.[0]?.value).not.toContain('private');
    expect(event.breadcrumbs?.[0]?.data?.url).toBe('/api/profile');
  });

  it('scrubs feedback contact fields and URL parameters', () => {
    const event = scrubSentryFeedback({
      contexts: {
        feedback: {
          contact_email: 'user@example.com',
          name: 'Ash',
          message: 'The page failed at /fr/profile?token=private',
          url: 'https://lunidex.app/fr/profile?email=user@example.com',
        },
      },
    });

    expect(event.contexts?.feedback).not.toHaveProperty('contact_email');
    expect(event.contexts?.feedback).not.toHaveProperty('name');
    expect(event.contexts?.feedback?.message).not.toContain('private');
    expect(event.contexts?.feedback?.url).toBe('https://lunidex.app/fr/profile');
  });
});
