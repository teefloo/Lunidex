import { describe, expect, it } from 'vitest';
import { config } from './proxy';

describe('locale proxy matcher', () => {
  it('leaves PWA workers and Workbox imports outside locale rewriting', () => {
    const matcher = config.matcher[0];

    expect(matcher).toContain('sw\\.js');
    expect(matcher).toContain('push-worker\\.js');
    expect(matcher).toContain('workbox-[^/]+\\.js');
  });
});
