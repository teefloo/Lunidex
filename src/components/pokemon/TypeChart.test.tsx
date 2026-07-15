import { beforeAll, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import TypeChart from './TypeChart';

vi.mock('framer-motion', () => ({
  motion: { div: 'div' },
}));

beforeAll(() => {
  window.scrollTo = vi.fn();
});

describe('TypeChart touch and keyboard selection', () => {
  it('keeps a tapped cell selected and exposes its result live', () => {
    render(<TypeChart />);
    const cells = screen.getAllByRole('gridcell');

    fireEvent.click(cells[0]);

    expect(cells[0]).toHaveAttribute('aria-selected', 'true');
    expect(document.querySelector('[aria-live="polite"]')).toHaveTextContent('×');
  }, 30000);

  it('moves the roving selection with arrow keys', async () => {
    render(<TypeChart />);
    const cells = screen.getAllByRole('gridcell');

    act(() => {
      cells[0].focus();
      fireEvent.keyDown(cells[0], { key: 'ArrowRight' });
    });

    await waitFor(() => {
      expect(cells[1]).toHaveAttribute('aria-selected', 'true');
      expect(cells[1]).toHaveAttribute('tabindex', '0');
      expect(cells[0]).toHaveAttribute('tabindex', '-1');
    });
  }, 30000);
});
