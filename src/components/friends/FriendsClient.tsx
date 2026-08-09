'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, Clock3, Search, UserMinus, UserPlus, X } from 'lucide-react';
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

const FRIENDS_QUERY_KEY = ['friends', 'relations'];
const EMPTY_RELATIONS: FriendRelation[] = [];

function RelationRow({ relation, userId }: { relation: FriendRelation; userId: string }) {
  const { t } = useTranslation();
  const localeHref = useLocaleHref();
  const queryClient = useQueryClient();
  const otherUser = relation.otherUser;
  const isIncoming = relation.addresseeId === userId;
  const actionMutation = useMutation({
    mutationFn: async (action: 'accept' | 'decline' | 'delete') => {
      if (action === 'delete') return deleteFriendship(relation.id);
      return respondToFriendRequest(relation.id, action);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: FRIENDS_QUERY_KEY });
    },
    onError: () => toast.error(t('friends.errors.action', { defaultValue: 'Could not update friendship.' })),
  });

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
            <Button size="sm" onClick={() => actionMutation.mutate('accept')} disabled={actionMutation.isPending}>
              <Check className="h-3.5 w-3.5" />
              {t('friends.actions.accept', { defaultValue: 'Accept' })}
            </Button>
            <Button size="sm" variant="outline" onClick={() => actionMutation.mutate('decline')} disabled={actionMutation.isPending}>
              <X className="h-3.5 w-3.5" />
              {t('friends.actions.decline', { defaultValue: 'Decline' })}
            </Button>
          </>
        ) : relation.status === 'pending' ? (
          <Button size="sm" variant="outline" onClick={() => actionMutation.mutate('delete')} disabled={actionMutation.isPending}>
            <X className="h-3.5 w-3.5" />
            {t('friends.actions.cancel', { defaultValue: 'Cancel' })}
          </Button>
        ) : relation.status === 'accepted' ? (
          <>
            <Link href={localeHref(`/friends/${otherUser.userId}`)} className="inline-flex h-10 items-center justify-center rounded-sm border border-border bg-card px-3.5 text-sm font-semibold text-foreground shadow-[var(--shadow-pixel-sm)] hover:-translate-x-px hover:-translate-y-px hover:border-primary">
              {t('friends.actions.view', { defaultValue: 'View' })}
            </Link>
            <Button size="sm" variant="destructive" onClick={() => actionMutation.mutate('delete')} disabled={actionMutation.isPending}>
              <UserMinus className="h-3.5 w-3.5" />
              {t('friends.actions.remove', { defaultValue: 'Remove' })}
            </Button>
          </>
        ) : null}
      </div>
    </div>
  );
}

export default function FriendsClient() {
  const { enabled, user } = useAuth();
  const { t } = useTranslation();
  const localeHref = useLocaleHref();
  const queryClient = useQueryClient();
  const [handle, setHandle] = useState('');
  const relationsQuery = useQuery({
    queryKey: FRIENDS_QUERY_KEY,
    queryFn: () => getFriendRelations(user!.id),
    enabled: enabled && Boolean(user),
    staleTime: 30 * 1000,
  });
  const sendMutation = useMutation({
    mutationFn: () => sendFriendRequest(handle),
    onSuccess: () => {
      setHandle('');
      void queryClient.invalidateQueries({ queryKey: FRIENDS_QUERY_KEY });
      toast.success(t('friends.success.sent', { defaultValue: 'Friend request sent.' }));
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : t('friends.errors.send', { defaultValue: 'Could not send friend request.' })),
  });

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
      <section className="page-surface p-5 md:p-6">
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
            if (handle.trim()) sendMutation.mutate();
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
            <UserPlus className="h-4 w-4" />
            {t('friends.add.button', { defaultValue: 'Send request' })}
          </Button>
        </form>
      </section>

      <RelationSection title={t('friends.sections.incoming', { defaultValue: 'Incoming requests' })} icon={<Clock3 className="h-4 w-4 text-primary" />} empty={t('friends.empty.incoming', { defaultValue: 'No incoming requests.' })}>
        {relationsQuery.isLoading ? <LoadingRows /> : incoming.map((relation) => <RelationRow key={relation.id} relation={relation} userId={user.id} />)}
      </RelationSection>
      <RelationSection title={t('friends.sections.outgoing', { defaultValue: 'Sent requests' })} icon={<Clock3 className="h-4 w-4 text-foreground/40" />} empty={t('friends.empty.outgoing', { defaultValue: 'No pending sent requests.' })}>
        {relationsQuery.isLoading ? <LoadingRows /> : outgoing.map((relation) => <RelationRow key={relation.id} relation={relation} userId={user.id} />)}
      </RelationSection>
      <RelationSection title={t('friends.sections.friends', { defaultValue: 'My friends' })} icon={<Check className="h-4 w-4 text-emerald-400" />} empty={t('friends.empty.friends', { defaultValue: 'Your accepted friends will appear here.' })}>
        {relationsQuery.isLoading ? <LoadingRows /> : friends.map((relation) => <RelationRow key={relation.id} relation={relation} userId={user.id} />)}
      </RelationSection>

      {relationsQuery.isError && (
        <p className="text-sm font-bold text-destructive">{t('friends.errors.load', { defaultValue: 'Could not load your friendships.' })}</p>
      )}

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
  return <div className="h-16 animate-pulse rounded-sm border border-border/20 bg-card/25" aria-busy="true" />;
}

function EmptyPanel({ title }: { title: string }) {
  return <div className="page-surface p-8 text-center text-sm font-bold text-foreground/55">{title}</div>;
}
