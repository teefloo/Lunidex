'use client';

import { getSupabaseClient } from '@/lib/supabase/client';
import type {
  FriendCollectionPage,
  FriendCollectionSummary,
  FriendDeck,
  FriendDeckCard,
  FriendDeckResult,
  FriendDirectoryEntry,
  FriendPrivacySettings,
  FriendRelation,
  FriendRelationStatus,
} from '@/types/friends';

interface FriendRelationRow {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: FriendRelationStatus;
  created_at: string;
  updated_at: string;
  responded_at: string | null;
}

interface FriendDirectoryRow {
  user_id: string;
  handle: string | null;
  display_name: string | null;
  allow_friend_requests: boolean;
  share_tcg_collection: boolean;
  share_tcg_decks: boolean;
}

interface CollectionPageRow {
  card_id: string;
  total_owned: number;
  has_more: boolean;
}

interface CollectionSummaryRow {
  total_owned: number;
  updated_at: string | null;
}

interface DeckSnapshotRow {
  decks: unknown;
  updated_at: string | null;
}

function requireSupabase() {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error('Supabase is not configured');
  return supabase;
}

function toDirectoryEntry(row: FriendDirectoryRow): FriendDirectoryEntry {
  return {
    userId: row.user_id,
    handle: row.handle,
    displayName: row.display_name?.trim() || 'Trainer',
    allowFriendRequests: row.allow_friend_requests,
    shareTcgCollection: row.share_tcg_collection,
    shareTcgDecks: row.share_tcg_decks,
  };
}

function toRelation(row: FriendRelationRow, directory: FriendDirectoryEntry | null): FriendRelation {
  return {
    id: row.id,
    requesterId: row.requester_id,
    addresseeId: row.addressee_id,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    respondedAt: row.responded_at,
    otherUser: directory,
  };
}

function isFriendDeckCard(value: unknown): value is FriendDeckCard {
  if (typeof value !== 'object' || value === null) return false;
  const card = value as Record<string, unknown>;
  return typeof card.cardId === 'string'
    && typeof card.quantity === 'number'
    && Number.isFinite(card.quantity)
    && card.quantity > 0;
}

function isFriendDeck(value: unknown): value is FriendDeck {
  if (typeof value !== 'object' || value === null) return false;
  const deck = value as Record<string, unknown>;
  return typeof deck.id === 'string'
    && typeof deck.name === 'string'
    && typeof deck.createdAt === 'string'
    && Array.isArray(deck.cards)
    && deck.cards.every(isFriendDeckCard);
}

function getErrorMessage(error: unknown): string {
  if (typeof error === 'object' && error !== null && 'message' in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === 'string') return message;
  }
  return 'Friend action failed';
}

export async function getFriendPrivacySettings(userId: string): Promise<FriendPrivacySettings> {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from('profiles')
    .select('allow_friend_requests, share_tcg_collection, share_tcg_decks')
    .eq('id', userId)
    .single();
  if (error || !data) throw new Error(getErrorMessage(error));

  return {
    allowFriendRequests: Boolean(data.allow_friend_requests),
    shareTcgCollection: Boolean(data.share_tcg_collection),
    shareTcgDecks: Boolean(data.share_tcg_decks),
  };
}

export async function updateFriendPrivacySettings(
  userId: string,
  settings: FriendPrivacySettings,
): Promise<void> {
  const supabase = requireSupabase();
  const { error } = await supabase
    .from('profiles')
    .update({
      allow_friend_requests: settings.allowFriendRequests,
      share_tcg_collection: settings.shareTcgCollection,
      share_tcg_decks: settings.shareTcgDecks,
    })
    .eq('id', userId);
  if (error) throw new Error(getErrorMessage(error));
}

export async function getFriendRelations(userId: string): Promise<FriendRelation[]> {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from('friendships')
    .select('id, requester_id, addressee_id, status, created_at, updated_at, responded_at')
    .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`)
    .order('updated_at', { ascending: false });
  if (error) throw new Error(getErrorMessage(error));

  const rows = (data ?? []) as FriendRelationRow[];
  const otherIds = Array.from(new Set(rows.map((row) => (
    row.requester_id === userId ? row.addressee_id : row.requester_id
  ))));

  if (otherIds.length === 0) return [];
  const { data: directories, error: directoryError } = await supabase
    .from('friend_directory')
    .select('user_id, handle, display_name, allow_friend_requests, share_tcg_collection, share_tcg_decks')
    .in('user_id', otherIds);
  if (directoryError) throw new Error(getErrorMessage(directoryError));

  const directoryById = new Map(
    ((directories ?? []) as FriendDirectoryRow[]).map((row) => [row.user_id, toDirectoryEntry(row)]),
  );

  return rows.map((row) => {
    const otherId = row.requester_id === userId ? row.addressee_id : row.requester_id;
    return toRelation(row, directoryById.get(otherId) ?? null);
  });
}

export async function getFriendDirectoryEntry(userId: string): Promise<FriendDirectoryEntry | null> {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from('friend_directory')
    .select('user_id, handle, display_name, allow_friend_requests, share_tcg_collection, share_tcg_decks')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw new Error(getErrorMessage(error));
  return data ? toDirectoryEntry(data as FriendDirectoryRow) : null;
}

export async function searchFriendByHandle(handle: string): Promise<FriendDirectoryEntry | null> {
  const supabase = requireSupabase();
  const normalized = handle.trim().toLowerCase();
  if (!normalized) return null;
  const { data, error } = await supabase
    .from('friend_directory')
    .select('user_id, handle, display_name, allow_friend_requests, share_tcg_collection, share_tcg_decks')
    .eq('handle', normalized)
    .eq('allow_friend_requests', true)
    .maybeSingle();
  if (error) throw new Error(getErrorMessage(error));
  return data ? toDirectoryEntry(data as FriendDirectoryRow) : null;
}

export async function sendFriendRequest(handle: string): Promise<FriendRelation> {
  const supabase = requireSupabase();
  const { data, error } = await supabase.rpc('send_friend_request', { p_handle: handle });
  if (error || !data) throw new Error(getErrorMessage(error));
  return toRelation(data as FriendRelationRow, null);
}

export async function respondToFriendRequest(
  friendshipId: string,
  action: 'accept' | 'decline',
): Promise<FriendRelation> {
  const supabase = requireSupabase();
  const { data, error } = await supabase.rpc('respond_to_friend_request', {
    p_friendship_id: friendshipId,
    p_action: action,
  });
  if (error || !data) throw new Error(getErrorMessage(error));
  return toRelation(data as FriendRelationRow, null);
}

export async function deleteFriendship(friendshipId: string): Promise<void> {
  const supabase = requireSupabase();
  const { error } = await supabase.from('friendships').delete().eq('id', friendshipId);
  if (error) throw new Error(getErrorMessage(error));
}

export async function getFriendCollectionSummary(friendId: string): Promise<FriendCollectionSummary | null> {
  const supabase = requireSupabase();
  const { data, error } = await supabase.rpc('get_friend_collection_summary', { p_friend_id: friendId });
  if (error) throw new Error(getErrorMessage(error));
  const row = Array.isArray(data) ? data[0] as CollectionSummaryRow | undefined : data as CollectionSummaryRow | null;
  return row
    ? { totalOwned: Number(row.total_owned ?? 0), updatedAt: row.updated_at ?? null }
    : null;
}

export async function getFriendCollectionPage(
  friendId: string,
  cursor: string | null,
  limit = 36,
): Promise<FriendCollectionPage> {
  const supabase = requireSupabase();
  const { data, error } = await supabase.rpc('get_friend_collection_page', {
    p_friend_id: friendId,
    p_cursor: cursor,
    p_limit: limit,
  });
  if (error) throw new Error(getErrorMessage(error));
  const rows = (data ?? []) as CollectionPageRow[];
  return {
    cardIds: rows.map((row) => row.card_id),
    totalOwned: Number(rows[0]?.total_owned ?? 0),
    hasMore: Boolean(rows[0]?.has_more),
  };
}

export async function getFriendDecks(friendId: string): Promise<FriendDeckResult | null> {
  const supabase = requireSupabase();
  const { data, error } = await supabase.rpc('get_friend_decks', { p_friend_id: friendId });
  if (error) throw new Error(getErrorMessage(error));
  const row = Array.isArray(data) ? data[0] as DeckSnapshotRow | undefined : data as DeckSnapshotRow | null;
  if (!row) return null;

  const decks = Array.isArray(row.decks) ? row.decks.filter(isFriendDeck) : [];
  return { decks, updatedAt: row.updated_at ?? null };
}
