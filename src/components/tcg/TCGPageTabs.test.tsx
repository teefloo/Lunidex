import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { TCGPageTabs } from './TCGPageTabs';

vi.mock('next/navigation', () => ({
  usePathname: () => '/fr/tcg',
}));

describe('TCGPageTabs mobile layout', () => {
  it('keeps the TCG and friends tabs touch-sized on mobile', async () => {
    window.history.pushState({}, '', '/fr/tcg');
    render(<TCGPageTabs />);
    const tabs = screen.getAllByRole('link');

    expect(tabs).toHaveLength(5);
    expect(tabs.every((tab) => tab.className.includes('min-h-11'))).toBe(true);
    await waitFor(() => {
      expect(tabs.map((tab) => tab.getAttribute('href'))).toEqual([
        '/fr/tcg',
        '/fr/tcg/collection',
        '/fr/tcg/wishlist',
        '/fr/tcg/deck-builder',
        '/fr/friends',
      ]);
    });
  });
});
