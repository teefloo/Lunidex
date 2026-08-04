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
        clearSearchLabel="Clear search"
        filterLabel="Filter by category"
        resultsFoundOne="{{count}} question matches {{query}}"
        resultsFoundOther="{{count}} questions match {{query}}"
        noResultsTitle="No questions found"
        noResultsBody="Try another search."
        expandAnswerLabel="Expand answer"
        collapseAnswerLabel="Collapse answer"
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'What is Lunidex?' }));
    const region = document.querySelector('[role="region"][aria-labelledby^="faq-question-general-"]');
    expect(region).toBeInTheDocument();
    if (!region) throw new Error('Expanded answer region not found');
    const headingId = region.getAttribute('aria-labelledby');

    expect(headingId).toBeTruthy();
    expect(document.getElementById(headingId ?? '')).toBeInTheDocument();
  });

  it('filters questions by search text and category', () => {
    render(
      <FaqSection
        categories={[
          {
            id: 'general',
            title: 'General',
            intro: 'General intro',
            entries: [
              { q: 'What is Lunidex?', a: 'A Pokédex.' },
              { q: 'Is it free?', a: 'Yes, it is free.' },
            ],
          },
          {
            id: 'tools',
            title: 'Tools',
            intro: 'Tools intro',
            entries: [{ q: 'How does the team builder work?', a: 'It checks coverage.' }],
          },
        ]}
        allLabel="All"
        searchPlaceholder="Search"
        tocLabel="Categories"
        clearSearchLabel="Clear search"
        filterLabel="Filter by category"
        resultsFoundOne="{{count}} question matches {{query}}"
        resultsFoundOther="{{count}} questions match {{query}}"
        noResultsTitle="No questions found"
        noResultsBody="Try another search."
        expandAnswerLabel="Expand answer"
        collapseAnswerLabel="Collapse answer"
      />,
    );

    fireEvent.change(screen.getByRole('textbox', { name: 'Search' }), {
      target: { value: 'coverage' },
    });
    expect(screen.getByRole('button', { name: 'How does the team builder work?' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'What is Lunidex?' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('radio', { name: /General/ }));
    expect(screen.getByText('No questions found')).toBeInTheDocument();
  });
});
