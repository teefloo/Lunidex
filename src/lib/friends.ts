'use client';

import { fetchAppApi } from '@/lib/app-api';
import type {
  FriendCollectionPage,
  FriendCollectionSummary,
  FriendDeckResult,
  FriendDirectoryEntry,
  FriendPrivacySettings,
  FriendRelation,
} from '@/types/friends';

interface ErrorPayload {
  error?: unknown;
}

interface RelationsResponse {
  relations?: FriendRelation[];
}

interface PrivacyResponse {
  settings?: FriendPrivacySettings;
}

interface DirectoryResponse {
  entry?: FriendDirectoryEntry | null;
}

interface RelationResponse {
  relation?: FriendRelation;
}

interface SummaryResponse {
  summary?: FriendCollectionSummary | null;
}

interface CollectionPageResponse {
  page?: FriendCollectionPage;
}

interface DecksResponse {
  result?: FriendDeckResult | null;
}

function getErrorMessage(payload: unknown): string {
  if (typeof payload === 'object' && payload !== null && 'error' in payload) {
    const error = (payload as ErrorPayload).error;
    if (typeof error === 'string' && error) return error;
  }
  return 'Friend action failed';
}

async function callApi<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetchAppApi(path, init);
  const payload = await response.json().catch(() => null) as T | ErrorPayload | null;
  if (!response.ok) throw new Error(getErrorMessage(payload));
  return payload as T;
}

export async function getFriendPrivacySettings(userId: string): Promise<FriendPrivacySettings> {
  void userId;
  const payload = await callApi<PrivacyResponse>('/api/friends?action=privacy', { cache: 'no-store' });
  if (!payload.settings) throw new Error('Friend settings not found');
  return payload.settings;
}

export async function updateFriendPrivacySettings(
  userId: string,
  settings: FriendPrivacySettings,
): Promise<void> {
  void userId;
  await callApi('/api/friends', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'privacy', settings }),
  });
}

export async function getFriendRelations(userId: string): Promise<FriendRelation[]> {
  void userId;
  const payload = await callApi<RelationsResponse>('/api/friends?action=relations', { cache: 'no-store' });
  return payload.relations ?? [];
}

export async function getFriendDirectoryEntry(userId: string): Promise<FriendDirectoryEntry | null> {
  const payload = await callApi<DirectoryResponse>(`/api/friends?action=directory&userId=${encodeURIComponent(userId)}`, { cache: 'no-store' });
  return payload.entry ?? null;
}

export async function searchFriendByHandle(handle: string): Promise<FriendDirectoryEntry | null> {
  const payload = await callApi<DirectoryResponse>(`/api/friends?action=search&handle=${encodeURIComponent(handle)}`, { cache: 'no-store' });
  return payload.entry ?? null;
}

export async function sendFriendRequest(handle: string): Promise<FriendRelation> {
  const payload = await callApi<RelationResponse>('/api/friends', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'send', handle }),
  });
  if (!payload.relation) throw new Error('Friend request failed');
  return payload.relation;
}

export async function respondToFriendRequest(
  friendshipId: string,
  action: 'accept' | 'decline',
): Promise<FriendRelation> {
  const payload = await callApi<RelationResponse>('/api/friends', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'respond', friendshipId, response: action }),
  });
  if (!payload.relation) throw new Error('Friend request failed');
  return payload.relation;
}

export async function deleteFriendship(friendshipId: string): Promise<void> {
  await callApi(`/api/friends?id=${encodeURIComponent(friendshipId)}`, { method: 'DELETE' });
}

export async function getFriendCollectionSummary(friendId: string): Promise<FriendCollectionSummary | null> {
  const payload = await callApi<SummaryResponse>(`/api/friends?action=collection-summary&friendId=${encodeURIComponent(friendId)}`, { cache: 'no-store' });
  return payload.summary ?? null;
}

export async function getFriendCollectionPage(
  friendId: string,
  cursor: string | null,
  limit = 36,
): Promise<FriendCollectionPage> {
  const params = new URLSearchParams({ action: 'collection-page', friendId, limit: String(limit) });
  if (cursor) params.set('cursor', cursor);
  const payload = await callApi<CollectionPageResponse>(`/api/friends?${params.toString()}`, { cache: 'no-store' });
  if (!payload.page) throw new Error('Friend collection unavailable');
  return payload.page;
}

export async function getFriendDecks(friendId: string): Promise<FriendDeckResult | null> {
  const payload = await callApi<DecksResponse>(`/api/friends?action=decks&friendId=${encodeURIComponent(friendId)}`, { cache: 'no-store' });
  return payload.result ?? null;
}
