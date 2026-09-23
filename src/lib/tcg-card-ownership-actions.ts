export type TCGCardOwnershipLabelKey = 'tcg.collection_add_card' | 'tcg.owned_short';
export type TCGCardOwnershipAriaLabelKey =
  | 'tcg.activation.add_card_aria'
  | 'tcg.activation.remove_card_aria';

export interface TCGCardOwnershipTogglePresentation {
  labelKey: TCGCardOwnershipLabelKey;
  ariaLabelKey: TCGCardOwnershipAriaLabelKey;
  pressed: boolean;
}

export function getTCGCardOwnershipTogglePresentation(
  owned: boolean,
): TCGCardOwnershipTogglePresentation {
  return owned
    ? {
        labelKey: 'tcg.owned_short',
        ariaLabelKey: 'tcg.activation.remove_card_aria',
        pressed: true,
      }
    : {
        labelKey: 'tcg.collection_add_card',
        ariaLabelKey: 'tcg.activation.add_card_aria',
        pressed: false,
      };
}

export interface TCGCardDetailCollectionPresentation {
  behavior: 'add' | 'manage-variants';
  labelKey: 'tcg.collection_add_card' | 'tcg.collection_owned_variants';
  ariaLabelKey: 'tcg.activation.add_card_aria' | 'tcg.collection_manage_card_aria';
  pressed: boolean;
}

export function getTCGCardDetailCollectionPresentation(
  owned: boolean,
): TCGCardDetailCollectionPresentation {
  return owned
    ? {
        behavior: 'manage-variants',
        labelKey: 'tcg.collection_owned_variants',
        ariaLabelKey: 'tcg.collection_manage_card_aria',
        pressed: true,
      }
    : {
        behavior: 'add',
        labelKey: 'tcg.collection_add_card',
        ariaLabelKey: 'tcg.activation.add_card_aria',
        pressed: false,
      };
}
