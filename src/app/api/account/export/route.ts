import { NextRequest, NextResponse } from 'next/server';

import { ensureNeonUser, getNeonUserFromRequest } from '@/lib/neon/auth';
import { getNeonClient } from '@/lib/neon/server';

type ProfileRow = Record<string, unknown>;
type UserStateRow = { data: unknown; updated_at: string };

function unavailable(): NextResponse {
  return NextResponse.json({ error: 'Application database unavailable' }, { status: 503 });
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const sql = getNeonClient();
  if (!sql) return unavailable();

  const user = await getNeonUserFromRequest(request);
  if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

  if (await ensureNeonUser(sql, user) === false) {
    return NextResponse.json({ error: 'Account deletion is in progress' }, { status: 410, headers: { 'Cache-Control': 'private, no-store' } });
  }

  const [profiles, states, quizScores, priceAlerts, pushSubscriptions, friendDirectory, friendships, collectionSnapshots, deckSnapshots, battleRooms] = await Promise.all([
    sql`select id, name, email, public_handle, is_public, avatar_pokemon_id, caught_count, total_pokemon, unlocked_badges, team_ids, quiz_best_score, quiz_total_correct, member_since, quiz_best_streak, tcg_owned_count, caught_by_gen, allow_friend_requests, share_tcg_collection, share_tcg_decks, created_at, updated_at from public.profiles where id = ${user.id}::uuid`,
    sql`select data, updated_at from public.user_state where user_id = ${user.id}::uuid`,
    sql`select id, pseudo, mode, challenge, score, date, created_at from public.quiz_scores where user_id = ${user.id}::uuid order by created_at desc`,
    sql`select id, card_id, card_name, alert_type, threshold_usd, threshold_eur, currency, is_active, last_triggered_at, created_at from public.tcg_price_alerts where user_id = ${user.id}::uuid order by created_at desc`,
    sql`select id, subscription, created_at from public.user_push_subscriptions where user_id = ${user.id}::uuid order by created_at desc`,
    sql`select user_id, handle, display_name, allow_friend_requests, share_tcg_collection, share_tcg_decks, updated_at from public.friend_directory where user_id = ${user.id}::uuid`,
    sql`select id, requester_id, addressee_id, status, created_at, updated_at, responded_at from public.friendships where requester_id = ${user.id}::uuid or addressee_id = ${user.id}::uuid order by created_at desc`,
    sql`select user_id, card_ids, updated_at from public.friend_collection_snapshots where user_id = ${user.id}::uuid`,
    sql`select user_id, decks, updated_at from public.friend_deck_snapshots where user_id = ${user.id}::uuid`,
    sql`select id, player1_id, player2_id, player1_team, player2_team, state, status, created_at from public.battle_rooms where player1_id = ${user.id}::uuid or player2_id = ${user.id}::uuid order by created_at desc`,
  ]);

  const exportData = {
    exportedAt: new Date().toISOString(),
    account: { id: user.id, email: user.email, name: user.user_metadata.name ?? user.user_metadata.display_name ?? null },
    profile: (profiles as ProfileRow[])[0] ?? null,
    userState: (states as UserStateRow[])[0] ?? null,
    quizScores,
    priceAlerts,
    pushSubscriptions,
    friendDirectory,
    friendships,
    collectionSnapshots,
    deckSnapshots,
    battleRooms,
  };

  return NextResponse.json(exportData, {
    headers: {
      'Cache-Control': 'no-store',
      'Content-Disposition': 'attachment; filename="lunidex-account-export.json"',
    },
  });
}
