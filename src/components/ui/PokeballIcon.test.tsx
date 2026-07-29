import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PokeballIcon } from './PokeballIcon';

describe('PokeballIcon', () => {
  it('assigns distinct accessible title IDs to repeated icons', () => {
    render(<><PokeballIcon /><PokeballIcon /></>);

    const images = screen.getAllByRole('img', { name: 'Pokeball' });
    expect(images).toHaveLength(2);
    expect(images[0].getAttribute('aria-labelledby')).not.toBe(images[1].getAttribute('aria-labelledby'));
  });
});
