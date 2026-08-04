import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { HomeToolCard } from './HomeToolCard';

describe('HomeToolCard', () => {
  it('keeps the localized destination and accessible content on the link', () => {
    render(
      <HomeToolCard
        href="/fr/pokedex"
        icon="book-open"
        title="Explorer le Pokédex"
        body="Retrouvez les Pokémon et leurs statistiques."
      />,
    );

    expect(screen.getByRole('link', { name: /Explorer le Pokédex/ })).toHaveAttribute('href', '/fr/pokedex');
    expect(screen.getByText('Retrouvez les Pokémon et leurs statistiques.')).toBeInTheDocument();
  });
});
