export const POSTHOG_EVENTS = {
  navigationStarted: 'navigation_started',
  pokemonSearchSubmitted: 'pokemon_search_submitted',
  pokemonFilterChanged: 'pokemon_filter_changed',
  pokemonDetailViewed: 'pokemon_detail_viewed',
  pokemonActionToggled: 'pokemon_action_toggled',
  pokemonQuizStarted: 'pokemon_quiz_started',
  authSignUp: 'auth_sign_up',
  authSignIn: 'auth_sign_in',
  authOauthStarted: 'auth_oauth_started',
  authPasswordResetRequested: 'auth_password_reset_requested',
  authPasswordUpdated: 'auth_password_updated',
  authSignedOut: 'auth_signed_out',
  tcgCardOwnershipToggled: 'tcg_card_ownership_toggled',
  tcgWishlistToggled: 'tcg_wishlist_toggled',
  tcgDeckCreated: 'tcg_deck_created',
  tcgDeckDeleted: 'tcg_deck_deleted',
  tcgDeckSearchUsed: 'tcg_deck_search_used',
  tcgDeckCardAdded: 'tcg_deck_card_added',
  tcgDeckCardRemoved: 'tcg_deck_card_removed',
  tcgStartOpened: 'tcg_start_opened',
  tcgSetSearchUsed: 'tcg_set_search_used',
  tcgSetSelected: 'tcg_set_selected',
  tcgAlbumOpened: 'tcg_album_opened',
  tcgFirstValueReached: 'tcg_first_value_reached',
  tcgActivationCompleted: 'tcg_activation_completed',
  tcgSyncPromptShown: 'tcg_sync_prompt_shown',
  tcgSyncPromptActioned: 'tcg_sync_prompt_actioned',
  tcgReturnedAfterActivation: 'tcg_returned_after_activation',
  tcgActivationError: 'tcg_activation_error',
  anniversary30FilterChanged: 'anniversary_30_filter_changed',
  anniversary30CardToggled: 'anniversary_30_card_toggled',
  anniversary30Migration: 'anniversary_30_migration',
  featureError: 'feature_error',
} as const;

export type PostHogEventName = typeof POSTHOG_EVENTS[keyof typeof POSTHOG_EVENTS];

export type PostHogProperty = string | number | boolean | null | undefined;
export type PostHogProperties = Record<string, PostHogProperty>;

const EVENT_NAMES = new Set<string>(Object.values(POSTHOG_EVENTS));

export function isPostHogEventName(value: string): value is PostHogEventName {
  return EVENT_NAMES.has(value);
}
