import { describe, expect, it } from 'vitest';
import nextConfig from './next.config';

describe('next redirects', () => {
  it('redirects legacy and non-canonical Pokemon index paths to the homepage', async () => {
    if (typeof nextConfig.redirects !== 'function') {
      throw new Error('Expected nextConfig.redirects to be defined');
    }

    const redirects = await nextConfig.redirects();

    expect(redirects).toEqual(expect.arrayContaining([
      expect.objectContaining({
        source: '/pokedex',
        destination: '/',
        permanent: true,
      }),
      expect.objectContaining({
        source: '/pokemon',
        destination: '/',
        permanent: true,
      }),
    ]));
  });
});
