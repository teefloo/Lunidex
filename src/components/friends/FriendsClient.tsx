'use client';

import { useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, Clock3, Loader2, Search, UserMinus, UserPlus, X } from 'lucide-react';
import { toast } from '@/lib/toast';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/neon/AuthProvider';
import { useLocaleHref } from '@/hooks/useLocaleHref';
import { useTranslation } from '@/lib/i18n';
import {
  deleteFriendship,
  getFriendRelations,
  respondToFriendRequest,
  sendFriendRequest,
} from '@/lib/friends';
import type { FriendRelation } from '@/types/friends';
import { RecoverableError } from '@/components/ui/RecoverableError';

const FRIENDS_QUERY_KEY = ['friends', 'relations'];
const EMPTY_RELATIONS: FriendRelation[] = [];

function RelationRow({ relation, userId }: { relation: FriendRelation; userId: string }) {
  const { t } = useTranslation();
  const localeHref = useLocaleHref();
  const queryClient = useQueryClient();
  const otherUser = relation.otherUser;
  const isIncoming = relation.addresseeId === userId;
  const actionGuard = useRef(false);
  const actionMutation = useMutation({
    mutationKey: ['friends'],
    mutationFn: async (action: 'accept' | 'decline' | 'delete') => {
      if (action === 'delete') return deleteFriendship(relation.id);
      return respondToFriendRequest(relation.id, action);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: FRIENDS_QUERY_KEY });
    },
    onSettled: () => { actionGuard.current = false; },
  });
  const runAction = (action: 'accept' | 'decline' | 'delete') => {
    if (actionGuard.current) return;
    actionGuard.current = true;
    actionMutation.mutate(action);
  };

  if (!otherUser) return null;

  return (
    <div className="flex flex-col gap-3 rounded-sm border border-border/30 bg-card/30 p-4 sm:flex-row sm:items-center sm:justify-between">
      <Link href={localeHref(`/friends/${otherUser.userId}`)} className="min-w-0 rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-primary/60">
        <p className="truncate text-sm font-black text-foreground/85 hover:text-primary">{otherUser.displayName}</p>
        <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-foreground/40">
          {otherUser.handle ? `@${otherUser.handle}` : t('friends.no_handle', { defaultValue: 'No public handle' })}
        </p>
      </Link>

      <div className="flex flex-wrap items-center gap-2">
        {relation.status === 'pending' && isIncoming ? (
          <>
            <Button size="sm" onClick={() => runAction('accept')} disabled={actionMutation.isPending} aria-busy={actionMutation.isPending}>
              {actionMutation.isPending ? <Loader2 className="h-4 w-4 motion-safe:animate-spin" aria-hidden="true" /> : <Check className="h-3.5 w-3.5" />}
              {t('friends.actions.accept', { defaultValue: 'Accept' })}
            </Button>
            <Button size="sm" variant="outline" onClick={() => runAction('decline')} disabled={actionMutation.isPending} aria-busy={actionMutation.isPending}>
              <X className="h-3.5 w-3.5" />
              {t('friends.actions.decline', { defaultValue: 'Decline' })}
            </Button>
          </>
        ) : relation.status === 'pending' ? (
          <Button size="sm" variant="outline" onClick={() => runAction('delete')} disabled={actionMutation.isPending} aria-busy={actionMutation.isPending}>
            <X className="h-3.5 w-3.5" />
            {t('friends.actions.cancel', { defaultValue: 'Cancel' })}
          </Button>
        ) : relation.status === 'accepted' ? (
          <>
            <Link href={localeHref(`/friends/${otherUser.userId}`)} className="inline-flex h-10 items-center justify-center rounded-sm border border-border bg-card px-3.5 text-sm font-semibold text-foreground shadow-[var(--shadow-pixel-sm)] hover:-translate-x-px hover:-translate-y-px hover:border-primary">
              {t('friends.actions.view', { defaultValue: 'View' })}
            </Link>
            <Button size="sm" variant="destructive" onClick={() => runAction('delete')} disabled={actionMutation.isPending} aria-busy={actionMutation.isPending}>
              <UserMinus className="h-3.5 w-3.5" />
              {t('friends.actions.remove', { defaultValue: 'Remove' })}
            </Button>
          </>
        ) : null}
      </div>
      {actionMutation.isError ? (
        <RecoverableError
          title={t('friends.errors.action', { defaultValue: 'Could not update friendship.' })}
          description={t('common.error_unknown', { defaultValue: 'Something went wrong. Please try again.' })}
          error={actionMutation.error}
          onRetry={() => actionMutation.variables && runAction(actionMutation.variables)}
          retrying={actionMutation.isPending}
          retryLabel={t('common.retry')}
          retryingLabel={t('common.loading')}
          compact
        />
      ) : null}
    </div>
  );
}

export default function FriendsClient() {
  const { enabled, user } = useAuth();
  const { t } = useTranslation();
  const localeHref = useLocaleHref();
  const queryClient = useQueryClient();
  const [handle, setHandle] = useState('');
  const sendGuard = useRef(false);
  const relationsQuery = useQuery({
    queryKey: FRIENDS_QUERY_KEY,
    queryFn: () => getFriendRelations(user!.id),
    enabled: enabled && Boolean(user),
    staleTime: 30 * 1000,
  });
  const sendMutation = useMutation({
    mutationKey: ['friends'],
    mutationFn: () => sendFriendRequest(handle),
    onSuccess: () => {
      setHandle('');
      void queryClient.invalidateQueries({ queryKey: FRIENDS_QUERY_KEY });
      toast.success(t('friends.success.sent', { defaultValue: 'Friend request sent.' }));
    },
    onSettled: () => { sendGuard.current = false; },
  });
  const sendRequest = () => {
    if (sendGuard.current || !handle.trim()) return;
    sendGuard.current = true;
    sendMutation.mutate();
  };

  const relations = relationsQuery.data ?? EMPTY_RELATIONS;
  const incoming = useMemo(() => relations.filter((relation) => relation.status === 'pending' && relation.addresseeId === user?.id), [relations, user?.id]);
  const outgoing = useMemo(() => relations.filter((relation) => relation.status === 'pending' && relation.requesterId === user?.id), [relations, user?.id]);
  const friends = useMemo(() => relations.filter((relation) => relation.status === 'accepted'), [relations]);

  if (!enabled) {
    return <EmptyPanel title={t('friends.auth.required', { defaultValue: 'Sign in to use friends.' })} />;
  }

  if (!user) {
    return <EmptyPanel title={t('friends.auth.signin', { defaultValue: 'Sign in to manage your friends and shared collections.' })} />;
  }

  return (
    <div className="space-y-8">
      <section className="page-surface space-y-4 p-5 md:p-6">
        <div className="mb-4 flex items-center gap-2">
          <UserPlus className="h-4 w-4 text-primary" />
          <h2 className="text-xs font-black uppercase tracking-[0.16em] text-foreground/65">
            {t('friends.add.title', { defaultValue: 'Add a friend' })}
          </h2>
        </div>
        <form
          className="flex flex-col gap-2 sm:flex-row"
          onSubmit={(event) => {
            event.preventDefault();
            sendRequest();
          }}
        >
          <div className="flex min-h-11 flex-1 items-center gap-2 rounded-sm border border-border/40 bg-card/40 px-3 focus-within:border-primary/40">
            <Search className="h-4 w-4 shrink-0 text-foreground/35" aria-hidden="true" />
            <input
              value={handle}
              onChange={(event) => setHandle(event.target.value.toLowerCase())}
              placeholder={t('friends.add.placeholder', { defaultValue: 'Enter a handle...' })}
              aria-label={t('friends.add.placeholder', { defaultValue: 'Enter a handle...' })}
              className="min-w-0 flex-1 bg-transparent text-sm font-bold text-foreground outline-none placeholder:text-foreground/35"
            />
          </div>
          <Button type="submit" disabled={sendMutation.isPending || !handle.trim()}>
            {sendMutation.isPending ? <Loader2 className="h-4 w-4 motion-safe:animate-spin" aria-hidden="true" /> : <UserPlus className="h-4 w-4" />}
            {sendMutation.isPending ? t('common.loading') : t('friends.add.button', { defaultValue: 'Send request' })}
          </Button>
        </form>
        {sendMutation.isError ? <RecoverableError title={t('friends.errors.send', { defaultValue: 'Could not send friend request.' })} description={t('common.error_unknown', { defaultValue: 'Something went wrong. Please try again.' })} error={sendMutation.error} onRetry={sendRequest} retrying={sendMutation.isPending} retryLabel={t('common.retry')} retryingLabel={t('common.loading')} compact /> : null}
      </section>

      {relationsQuery.isError && !relationsQuery.data ? (
        <RecoverableError
          title={t('friends.errors.load', { defaultValue: 'Could not load your friendships.' })}
          description={t('common.load_failed')}
          error={relationsQuery.error}
          onRetry={() => void relationsQuery.refetch()}
          retrying={relationsQuery.isFetching}
          retryLabel={t('common.retry')}
          retryingLabel={t('common.loading')}
        />
      ) : <>
      <RelationSection title={t('friends.sections.incoming', { defaultValue: 'Incoming requests' })} icon={<Clock3 className="h-4 w-4 text-primary" />} empty={t('friends.empty.incoming', { defaultValue: 'No incoming requests.' })}>
        {relationsQuery.isLoading ? <LoadingRows /> : incoming.map((relation) => <RelationRow key={relation.id} relation={relation} userId={user.id} />)}
      </RelationSection>
      <RelationSection title={t('friends.sections.outgoing', { defaultValue: 'Sent requests' })} icon={<Clock3 className="h-4 w-4 text-foreground/40" />} empty={t('friends.empty.outgoing', { defaultValue: 'No pending sent requests.' })}>
        {relationsQuery.isLoading ? <LoadingRows /> : outgoing.map((relation) => <RelationRow key={relation.id} relation={relation} userId={user.id} />)}
      </RelationSection>
      <RelationSection title={t('friends.sections.friends', { defaultValue: 'My friends' })} icon={<Check className="h-4 w-4 text-emerald-400" />} empty={t('friends.empty.friends', { defaultValue: 'Your accepted friends will appear here.' })}>
        {relationsQuery.isLoading ? <LoadingRows /> : friends.map((relation) => <RelationRow key={relation.id} relation={relation} userId={user.id} />)}
      </RelationSection>

      {relationsQuery.isError ? <RecoverableError title={t('friends.errors.load', { defaultValue: 'Could not refresh your friendships.' })} description={t('common.load_failed')} error={relationsQuery.error} onRetry={() => void relationsQuery.refetch()} retrying={relationsQuery.isFetching} retryLabel={t('common.retry')} retryingLabel={t('common.loading')} compact /> : null}
      </>}

      <Link href={localeHref('/dashboard')} className="inline-flex text-xs font-black uppercase tracking-[0.12em] text-primary hover:underline">
        {t('friends.back_dashboard', { defaultValue: 'Back to dashboard' })}
      </Link>
    </div>
  );
}

function RelationSection({ title, icon, empty, children }: { title: string; icon: React.ReactNode; empty: string; children: React.ReactNode }) {
  const hasChildren = Array.isArray(children) ? children.length > 0 : Boolean(children);
  return (
    <section className="space-y-3" aria-labelledby={`friends-section-${title}`}>
      <div className="flex items-center gap-2">
        {icon}
        <h2 id={`friends-section-${title}`} className="text-xs font-black uppercase tracking-[0.16em] text-foreground/65">{title}</h2>
      </div>
      {hasChildren ? children : <p className="rounded-sm border border-dashed border-border/30 bg-card/20 p-4 text-xs font-bold text-foreground/40">{empty}</p>}
    </section>
  );
}

function LoadingRows() {
  return <div className="h-16 motion-safe:animate-pulse rounded-sm border border-border/20 bg-card/25" aria-busy="true" />;
}

function EmptyPanel({ title }: { title: string }) {
  return <div className="page-surface p-8 text-center text-sm font-bold text-foreground/55">{title}</div>;
}
