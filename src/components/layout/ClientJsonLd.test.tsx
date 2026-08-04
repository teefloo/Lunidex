import { render, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { ClientJsonLd } from './ClientJsonLd';

afterEach(() => {
  document.getElementById('client-jsonld-test')?.remove();
});

describe('ClientJsonLd', () => {
  it('adds structured data after the component has mounted', async () => {
    render(
      <ClientJsonLd
        id="client-jsonld-test"
        data={{ '@context': 'https://schema.org', '@type': 'WebSite', name: 'Lunidex' }}
      />,
    );

    await waitFor(() => {
      const script = document.getElementById('client-jsonld-test') as HTMLScriptElement | null;
      expect(script?.type).toBe('application/ld+json');
      expect(JSON.parse(script?.textContent ?? '')).toEqual({
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: 'Lunidex',
      });
    });
  });
});
