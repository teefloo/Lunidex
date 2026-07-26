export type FriendRelationStatus = 'pending' | 'accepted' | 'declined';

export interface FriendPrivacySettings {
  allowFriendRequests: boolean;
  shareTcgCollection: boolean;
  shareTcgDecks: boolean;
}

export interface FriendDirectoryEntry extends FriendPrivacySettings {
  userId: string;
  handle: string | null;
  displayName: string;
}

export interface FriendRelation {
  id: string;
  requesterId: string;
  addresseeId: string;
  status: FriendRelationStatus;
  createdAt: string;
  updatedAt: string;
  respondedAt: string | null;
  otherUser: FriendDirectoryEntry | null;
}

export interface FriendCollectionSummary {
  totalOwned: number;
  updatedAt: string | null;
}

export interface FriendCollectionPage {
  cardIds: string[];
  totalOwned: number;
  hasMore: boolean;
}

export interface FriendDeckCard {
  cardId: string;
  quantity: number;
}

export interface FriendDeck {
  id: string;
  name: string;
  cards: FriendDeckCard[];
  createdAt: string;
}

export interface FriendDeckResult {
  decks: FriendDeck[];
  updatedAt: string | null;
}
