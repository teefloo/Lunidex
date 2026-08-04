'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Wifi, Plus, LogIn } from 'lucide-react';
import BattleRoom from '@/components/battle/BattleRoom';
import { getNeonAccessToken } from '@/lib/neon/client';
import { useAuth } from '@/lib/neon/AuthProvider';
import { cn } from '@/lib/utils';

export default function BattleRoomSection() {
  const searchParams = useSearchParams();
  const urlRoomId = searchParams.get('room');
  const { enabled, loading, user } = useAuth();

  const [roomId, setRoomId] = useState<string | null>(urlRoomId);
  const [joinInput, setJoinInput] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createRoom = async () => {
    setCreating(true);
    setError(null);
    try {
      const token = await getNeonAccessToken();
      if (!token) throw new Error('Please sign in before creating a battle room.');

      const res = await fetch('/api/battle/room', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });
      if (!res.ok) {
        const body = await res.json() as { error?: string };
        throw new Error(body.error ?? 'Failed to create room');
      }
      const data = await res.json() as { roomId: string };
      setRoomId(data.roomId);
      const url = new URL(window.location.href);
      url.searchParams.set('room', data.roomId);
      window.history.pushState({}, '', url.toString());
    } catch (createError: unknown) {
      setError(createError instanceof Error ? createError.message : 'Unknown error');
    } finally {
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
        <span className="animate-pulse font-mono text-[11px] text-muted-foreground">Initialising…</span>
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

      {error && (
        <p className="rounded-sm border border-destructive/30 bg-destructive/10 px-3 py-2 font-mono text-xs text-destructive">
          {error}
        </p>
      )}

      <div className="flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          onClick={() => void createRoom()}
          disabled={creating}
          className={cn(
            'flex flex-1 items-center justify-center gap-2 rounded-sm border border-primary bg-primary/10 px-4 py-3 font-mono text-[11px] font-bold uppercase tracking-wider text-primary transition-all hover:bg-primary/20',
            'disabled:cursor-not-allowed disabled:opacity-50',
          )}
        >
          <Plus className="h-3.5 w-3.5" />
          {creating ? 'Creating…' : 'Create Room'}
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
