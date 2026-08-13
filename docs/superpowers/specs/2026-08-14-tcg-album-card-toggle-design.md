# TCG album card ownership toggle

## Goal

Make the card artwork itself the add/remove control in a TCG set album. Keep a single action below the artwork for opening the card detail view.

## Interaction

- Clicking or keyboard-activating the artwork toggles the current card's ownership immediately.
- A missing card is added immediately; an owned card is removed immediately.
- The separate ownership button and its removal confirmation state are removed.
- The only button below the artwork is the localized “View card” action, which opens the existing detail modal and does not change ownership.

## Component and data flow

- `TCGAlbumCard` continues to receive `owned`, `onView`, and `onOwnershipChange` from `TCGAlbumPage`.
- The artwork button calls the existing `toggleTCGOwned` store action and reports the new state through `onOwnershipChange`.
- `TCGAlbumPage` keeps its existing progress calculations, activation tracking, filters, and detail modal behavior unchanged.
- The existing owned/missing visual treatment remains the passive state cue; the artwork control exposes the state through `aria-pressed` and a localized accessible name.

## Localization and accessibility

- Add localized labels for the artwork ownership toggle in all supported locales (`en`, `fr`, `es`, `de`, `it`, `ja`, `ko`, `zh`).
- The ownership control includes the card name and communicates whether activation will add or remove the card.
- Preserve visible focus rings, touch-sized controls, meaningful image alt text, and reduced-motion-safe existing hover behavior.

## Testing

- Verify that activating the artwork toggles ownership immediately and calls `onOwnershipChange` with the new state.
- Verify that the artwork does not open card details.
- Verify that the single “View card” button opens details without toggling ownership.
- Verify that the old removal-confirmation action is no longer rendered.
- Keep the album activation tests aligned with the new artwork control labels.
