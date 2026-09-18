import { describe, expect, it } from 'vitest';

import { POSTHOG_EVENTS, isPostHogEventName } from './posthog-events';

describe('PostHog event taxonomy', () => {
  it('keeps the high-value event names centralized and stable', () => {
    expect(POSTHOG_EVENTS.authSignIn).toBe('auth_sign_in');
    expect(POSTHOG_EVENTS.pokemonActionToggled).toBe('pokemon_action_toggled');
    expect(POSTHOG_EVENTS.tcgDeckCardAdded).toBe('tcg_deck_card_added');
    expect(POSTHOG_EVENTS.featureError).toBe('feature_error');
  });

  it('recognizes only names in the shared taxonomy', () => {
    expect(isPostHogEventName('auth_sign_in')).toBe(true);
    expect(isPostHogEventName('event accidentally typed elsewhere')).toBe(false);
  });
});
