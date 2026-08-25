import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import Anniversary30Tracker from './Anniversary30Tracker';

const labels = {
  progress: '{{count}}/{{total}} tracked',
  slot: 'Pikachu slot {{number}}',
  loading: 'Loading',
  reset: 'Reset',
  resetAria: 'Reset tracker',
  localNote: 'Saved locally',
};

describe('Anniversary30Tracker', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('hydrates local progress, toggles a slot, and resets it', async () => {
    window.localStorage.setItem(
      'primedex-anniversary-30-tracker-v1',
      JSON.stringify({ version: 1, checkedSlotIds: ['pikachu-rare-03'] }),
    );

    render(<Anniversary30Tracker labels={labels} />);

    const existing = await screen.findByRole('checkbox', { name: 'Pikachu slot 03' });
    await waitFor(() => expect(existing).toBeChecked());
    expect(screen.getByText('1/30 tracked')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('checkbox', { name: 'Pikachu slot 04' }));
    expect(screen.getByText('2/30 tracked')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Reset tracker' }));
    expect(screen.getByText('0/30 tracked')).toBeInTheDocument();
    expect(window.localStorage.getItem('primedex-anniversary-30-tracker-v1')).toContain('checkedSlotIds');
  }, 15000);
});
