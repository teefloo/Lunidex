import { describe, expect, it } from 'vitest';
import {
  getTCGCardDetailCollectionPresentation,
  getTCGCardOwnershipTogglePresentation,
} from './tcg-card-ownership-actions';

describe('TCG card collection actions', () => {
  it('offers an explicit add action for a card that is not owned', () => {
    expect(getTCGCardOwnershipTogglePresentation(false)).toEqual({
      labelKey: 'tcg.collection_add_card',
      ariaLabelKey: 'tcg.activation.add_card_aria',
      pressed: false,
    });
  });

  it('exposes the owned state and removal action for an owned card', () => {
    expect(getTCGCardOwnershipTogglePresentation(true)).toEqual({
      labelKey: 'tcg.owned_short',
      ariaLabelKey: 'tcg.activation.remove_card_aria',
      pressed: true,
    });
  });

  it('adds missing cards directly from details and opens variants for owned cards', () => {
    expect(getTCGCardDetailCollectionPresentation(false)).toEqual({
      behavior: 'add',
      labelKey: 'tcg.collection_add_card',
      ariaLabelKey: 'tcg.activation.add_card_aria',
      pressed: false,
    });
    expect(getTCGCardDetailCollectionPresentation(true)).toEqual({
      behavior: 'manage-variants',
      labelKey: 'tcg.collection_owned_variants',
      ariaLabelKey: 'tcg.collection_manage_card_aria',
      pressed: true,
    });
  });
});
