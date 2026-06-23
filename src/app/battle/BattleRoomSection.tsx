'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Wifi, Plus, LogIn } from 'lucide-react';
import BattleRoom from '@/components/battle/BattleRoom';
import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';

export default function BattleRoomSection() {
  const searchParams = useSearchParams();
  const urlRoomId = searchParams.get('room');

  const [userId, setUserId] = useState<string | null>(null);
  const [roomId, setRoomId] = useState<string | null>(urlRoomId);
  const [joinInput, setJoinInput] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Resolve the current user
  useEffect(() => {
    if (!isSupabaseConfigured) return;
    const supabase = getSupabaseClient();
    if (!supabase) return;

    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setUserId(data.user.id);
      } else {
        // Generate anonymous id stored in sessionStorage
        const key = 'primedex-anon-id';
        let id = sessionStorage.getItem(key);
        if (!id) {
          id = crypto.randomUUID();
          sessionStorage.setItem(key, id);
        }
        setUserId(id);
      }
    });
  }, []);

  // Generate anon id if Supabase is off
  useEffect(() => {
    if (isSupabaseConfigured) return;
    const key = 'primedex-anon-id';
    let id = sessionStorage.getItem(key);
    if (!id) {
      id = crypto.randomUUID();
      sessionStorage.setItem(key, id);
    }
    setUserId(id);
  }, []);

  const createRoom = async () => {
    setCreating(true);
    setError(null);
    try {
      const res = await fetch('/api/battle/room', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      if (!res.ok) {
        const body = await res.json() as { error?: string };
        throw new Error(body.error ?? 'Failed to create room');
      }
      const data = await res.json() as { roomId: string };
      setRoomId(data.roomId);
      // Update URL without reload
      const url = new URL(window.location.href);
      url.searchParams.set('room', data.roomId);
      window.history.pushState({}, '', url.toString());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
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

  if (!userId) {
    return (
      <div className="flex h-20 items-center justify-center">
        <span className="font-mono text-[10px] text-muted-foreground animate-pulse">Initialising…</span>
      </div>
    );
  }

  if (roomId) {
    return (
      <BattleRoom
        roomId={roomId}
        userId={userId}
        playerName="Player"
      />
    );
  }

  return (
    <div className="flex flex-col gap-4 rounded-sm border border-border/60 bg-card p-6">
      <div className="flex items-center gap-2">
        <Wifi className="h-4 w-4 text-muted-foreground" />
        <p className="font-mono text-xs text-muted-foreground">
          Create or join a battle room to play against a friend in real-time
        </p>
      </div>

      {error && (
        <p className="rounded-sm border border-destructive/30 bg-destructive/10 px-3 py-2 font-mono text-xs text-destructive">
          {error}
        </p>
      )}

      <div className="flex flex-col gap-3 sm:flex-row">
        {/* Create */}
        <button
          type="button"
          onClick={createRoom}
          disabled={creating}
          className={cn(
            'flex flex-1 items-center justify-center gap-2 rounded-sm border border-primary bg-primary/10 px-4 py-3 font-mono text-[11px] font-bold uppercase tracking-wider text-primary transition-all hover:bg-primary/20',
            'disabled:cursor-not-allowed disabled:opacity-50'
          )}
        >
          <Plus className="h-3.5 w-3.5" />
          {creating ? 'Creating…' : 'Create Room'}
        </button>

        {/* Join */}
        <div className="flex flex-1 gap-2">
          <input
            type="text"
            value={joinInput}
            onChange={e => setJoinInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && joinRoom()}
            placeholder="Room ID or link..."
            className="h-11 flex-1 min-w-0 rounded-sm border border-border/70 bg-background/50 px-3 font-mono text-[10px] placeholder:text-muted-foreground/40 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
          <button
            type="button"
            onClick={joinRoom}
            disabled={!joinInput.trim()}
            className="flex h-11 items-center gap-2 rounded-sm border border-border/70 px-3 font-mono text-[10px] font-bold uppercase tracking-wider text-muted-foreground transition-all hover:border-border hover:bg-muted/40 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <LogIn className="h-3.5 w-3.5" />
            Join
          </button>
        </div>
      </div>
    </div>
  );
}
