'use client';

import { useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Wifi, Plus, LogIn } from 'lucide-react';
import BattleRoom from '@/components/battle/BattleRoom';
import { getNeonAccessToken } from '@/lib/neon/client';
import { useAuth } from '@/lib/neon/AuthProvider';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/lib/i18n';
import { RecoverableError } from '@/components/ui/RecoverableError';

export default function BattleRoomSection() {
  const searchParams = useSearchParams();
  const urlRoomId = searchParams.get('room');
  const { enabled, loading, user } = useAuth();
  const { t } = useTranslation();

  const [roomId, setRoomId] = useState<string | null>(urlRoomId);
  const [joinInput, setJoinInput] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const createGuard = useRef(false);

  const createRoom = async () => {
    if (createGuard.current) return;
    createGuard.current = true;
    setCreating(true);
    setError(null);
    try {
      const token = await getNeonAccessToken();
      if (!token) throw Object.assign(new Error('Session expired'), { status: 401 });

      const res = await fetch('/api/battle/room', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });
      if (!res.ok) {
        throw Object.assign(new Error('Battle room request failed'), { status: res.status });
      }
      const data = await res.json() as { roomId: string };
      setRoomId(data.roomId);
      const url = new URL(window.location.href);
      url.searchParams.set('room', data.roomId);
      window.history.pushState({}, '', url.toString());
    } catch (createError: unknown) {
      setError(createError);
    } finally {
      createGuard.current = false;
      setCreating(false);
    }
  };

  const joinRoom = () => {
    const id = joinInput.trim();
    if (!id) return;
    setRoomId(id);
    const url = new URL(window.location.href);
    url.searchParams.set('room', id);
    window.history.pushState({}, '', url.toString());
  };

  if (loading) {
    return (
      <div className="flex h-20 items-center justify-center">
        <span className="motion-safe:animate-pulse font-mono text-[11px] text-muted-foreground" role="status">{t('common.loading')}</span>
      </div>
    );
  }

  if (!enabled || !user) {
    return (
      <div className="rounded-sm border border-border/60 bg-card p-6">
        <p className="font-mono text-xs text-muted-foreground">
          Sign in with Neon Auth to create or join a battle room.
        </p>
      </div>
    );
  }

  if (roomId) {
    return <BattleRoom roomId={roomId} userId={user.id} playerName="Player" />;
  }

  return (
    <div className="flex flex-col gap-4 rounded-sm border border-border/60 bg-card p-6">
      <div className="flex items-center gap-2">
        <Wifi className="h-4 w-4 text-muted-foreground" />
        <p className="font-mono text-xs text-muted-foreground">
          Create or join a battle room to play against a friend with Neon synchronization
        </p>
      </div>

      {error ? <RecoverableError title={t('common.request_failed')} description={t('common.error_unknown')} error={error} retryLabel={t('common.retry')} retryingLabel={t('common.loading')} retrying={creating} onRetry={() => void createRoom()} compact /> : null}

      <div className="flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          onClick={() => void createRoom()}
          disabled={creating}
          aria-busy={creating}
          className={cn(
            'flex flex-1 items-center justify-center gap-2 rounded-sm border border-primary bg-primary/10 px-4 py-3 font-mono text-[11px] font-bold uppercase tracking-wider text-primary transition-all hover:bg-primary/20',
            'disabled:cursor-not-allowed disabled:opacity-50',
          )}
        >
          {creating ? <Wifi className="h-4 w-4 motion-safe:animate-pulse" aria-hidden="true" /> : <Plus className="h-3.5 w-3.5" />}
          {creating ? t('common.loading') : 'Create Room'}
        </button>

        <div className="flex flex-1 gap-2">
          <input
            type="text"
            value={joinInput}
            onChange={(event) => setJoinInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') joinRoom();
            }}
            placeholder="Room ID or link..."
            className="h-11 min-w-0 flex-1 rounded-sm border border-border/70 bg-background/50 px-3 font-mono text-[11px] placeholder:text-muted-foreground/40 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
          <button
            type="button"
            onClick={joinRoom}
            disabled={!joinInput.trim()}
            className="flex h-11 items-center gap-2 rounded-sm border border-border/70 px-3 font-mono text-[11px] font-bold uppercase tracking-wider text-muted-foreground transition-all hover:border-border hover:bg-muted/40 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <LogIn className="h-3.5 w-3.5" />
            Join
          </button>
        </div>
      </div>
    </div>
  );
}
