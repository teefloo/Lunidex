'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Send, Copy, Users, Wifi, WifiOff, MessageSquare } from 'lucide-react';
import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import type { RealtimeChannel } from '@supabase/supabase-js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ChatMessage {
  id: string;
  userId: string;
  text: string;
  timestamp: number;
}

interface BattlePayload {
  type: 'move' | 'chat' | 'join' | 'state';
  userId: string;
  data: Record<string, unknown>;
  timestamp: number;
}

interface BattleRoomProps {
  roomId: string;
  userId: string;
  playerName?: string;
}

// ---------------------------------------------------------------------------
// BattleRoom
// ---------------------------------------------------------------------------

export default function BattleRoom({ roomId, userId, playerName = 'Player' }: BattleRoomProps) {
  const [connected, setConnected] = useState(false);
  const [playersOnline, setPlayersOnline] = useState<string[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(() => {
    if (!isSupabaseConfigured) return 'Supabase is not configured — PvP mode requires a database connection.';
    if (!getSupabaseClient()) return 'Unable to connect to Supabase.';
    return null;
  });
  const channelRef = useRef<RealtimeChannel | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Scroll chat to bottom on new messages
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // Subscribe to Supabase Realtime channel
  useEffect(() => {
    if (error) return;

    const supabase = getSupabaseClient()!;
    const channelName = `battle:${roomId}`;
    const channel = supabase.channel(channelName, {
      config: { presence: { key: userId } },
    });

    // Presence: track who is online
    channel.on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState<{ name: string }>();
      setPlayersOnline(Object.keys(state));
    });

    // Broadcast: receive messages
    channel.on('broadcast', { event: 'battle' }, ({ payload }: { payload: BattlePayload }) => {
      if (payload.type === 'chat') {
        const chatData = payload.data as { text: string };
        setChatMessages(prev => [
          ...prev,
          {
            id: `${payload.userId}-${payload.timestamp}`,
            userId: payload.userId,
            text: chatData.text,
            timestamp: payload.timestamp,
          },
        ]);
      }
    });

    channel.subscribe(async (status: string) => {
      if (status === 'SUBSCRIBED') {
        setConnected(true);
        // Track presence
        await channel.track({ name: playerName, joinedAt: Date.now() });

        // Announce join
        await channel.send({
          type: 'broadcast',
          event: 'battle',
          payload: {
            type: 'join',
            userId,
            data: { name: playerName },
            timestamp: Date.now(),
          } satisfies BattlePayload,
        });
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        setConnected(false);
        setError('Connection to battle room lost. Please refresh.');
      }
    });

    channelRef.current = channel;

    return () => {
      channel.unsubscribe();
      channelRef.current = null;
    };
  }, [roomId, userId, playerName, error]);

  const sendChat = useCallback(async () => {
    const text = chatInput.trim();
    if (!text || !channelRef.current) return;

    setChatInput('');
    // Optimistic update
    setChatMessages(prev => [
      ...prev,
      {
        id: `${userId}-${Date.now()}`,
        userId,
        text,
        timestamp: Date.now(),
      },
    ]);

    await channelRef.current.send({
      type: 'broadcast',
      event: 'battle',
      payload: {
        type: 'chat',
        userId,
        data: { text },
        timestamp: Date.now(),
      } satisfies BattlePayload,
    });
  }, [chatInput, userId]);

  const copyRoomLink = useCallback(() => {
    const url = `${window.location.origin}/battle?room=${roomId}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {});
  }, [roomId]);

  if (error) {
    return (
      <div className="rounded-sm border border-destructive/30 bg-destructive/10 p-4">
        <p className="font-mono text-sm text-destructive">{error}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 rounded-sm border border-border/60 bg-card p-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {connected ? (
            <Wifi className="h-4 w-4 text-green-500" />
          ) : (
            <WifiOff className="h-4 w-4 animate-pulse text-muted-foreground" />
          )}
          <div>
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
              PvP Battle Room
            </p>
            <p className="font-mono text-[9px] text-muted-foreground/60">
              ID: {roomId.slice(0, 8)}...
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={copyRoomLink}
          className="flex items-center gap-1.5 rounded-sm border border-border/60 px-3 py-1.5 font-mono text-[9px] uppercase tracking-wider text-muted-foreground transition-all hover:border-border hover:bg-muted/40"
        >
          <Copy className="h-3 w-3" />
          {copied ? 'Copied!' : 'Copy link'}
        </button>
      </div>

      {/* Players online */}
      <div className="flex items-center gap-2 rounded-sm bg-muted/20 px-3 py-2">
        <Users className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="font-mono text-[10px] text-muted-foreground">
          {playersOnline.length} player{playersOnline.length !== 1 ? 's' : ''} online
        </span>
        <div className="flex gap-1">
          {playersOnline.map(id => (
            <span
              key={id}
              className={cn(
                'h-1.5 w-1.5 rounded-full',
                id === userId ? 'bg-green-500' : 'bg-blue-500'
              )}
            />
          ))}
        </div>
      </div>

      {/* Chat */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-1.5">
          <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />
          <p className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground/70">
            Battle chat
          </p>
        </div>

        <div className="flex h-40 flex-col gap-1 overflow-y-auto rounded-sm bg-muted/20 p-2">
          {chatMessages.length === 0 ? (
            <p className="m-auto font-mono text-[10px] text-muted-foreground/40">
              No messages yet. Say hi!
            </p>
          ) : (
            chatMessages.map(msg => (
              <div
                key={msg.id}
                className={cn(
                  'rounded px-2 py-1 text-xs',
                  msg.userId === userId
                    ? 'ml-auto max-w-[75%] bg-primary/15 text-primary'
                    : 'mr-auto max-w-[75%] bg-muted/50 text-foreground/85'
                )}
              >
                {msg.userId !== userId && (
                  <span className="mb-0.5 block font-mono text-[8px] font-bold uppercase tracking-widest text-muted-foreground/60">
                    Opponent
                  </span>
                )}
                {msg.text}
              </div>
            ))
          )}
          <div ref={chatEndRef} />
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            value={chatInput}
            onChange={e => setChatInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && sendChat()}
            placeholder="Type a message..."
            disabled={!connected}
            className="h-9 flex-1 rounded-sm border border-border/70 bg-background/50 px-3 font-mono text-[11px] placeholder:text-muted-foreground/40 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
          />
          <button
            type="button"
            onClick={sendChat}
            disabled={!connected || !chatInput.trim()}
            className="flex h-9 w-9 items-center justify-center rounded-sm border border-primary bg-primary/10 text-primary transition-all hover:bg-primary/20 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Send className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
