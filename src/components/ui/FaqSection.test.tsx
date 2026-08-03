import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import FaqSection from './FaqSection';

describe('FaqSection accessibility', () => {
  it('references an existing heading from each expanded answer region', () => {
    render(
      <FaqSection
        categories={[{
          id: 'general',
          title: 'General',
          intro: 'Intro',
          entries: [{ q: 'What is Lunidex?', a: 'A Pokédex.' }],
        }]}
        allLabel="All"
        searchPlaceholder="Search"
        tocLabel="Categories"
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'What is Lunidex?' }));
    const region = document.querySelector('[role="region"][aria-labelledby^="general-"]');
    expect(region).toBeInTheDocument();
    if (!region) throw new Error('Expanded answer region not found');
    const headingId = region.getAttribute('aria-labelledby');

    expect(headingId).toBeTruthy();
    expect(document.getElementById(headingId ?? '')).toBeInTheDocument();
  });
});
