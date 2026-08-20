import { describe, expect, it } from 'vitest';
import { isInactiveAccountError } from './errors';

describe('Neon lifecycle errors', () => {
  it('recognizes the database account lifecycle guard', () => {
    expect(isInactiveAccountError({ code: 'P0001' })).toBe(true);
    expect(isInactiveAccountError(new Error('Account is not active'))).toBe(true);
    expect(isInactiveAccountError({ code: '23505' })).toBe(false);
  });
});
