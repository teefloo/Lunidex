'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Send, Copy, Users, Wifi, WifiOff, MessageSquare, Loader2 } from 'lucide-react';
import { getNeonAccessToken, isNeonAuthConfigured } from '@/lib/neon/client';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/lib/i18n';
import { toast } from '@/lib/toast';
import { RecoverableError } from '@/components/ui/RecoverableError';

interface ChatMessage {
  id: string;
  userId: string;
  text: string;
  timestamp: number;
}

interface BattleRoomState {
  player1_id: string | null;
  player2_id: string | null;
  state: unknown;
}

interface BattleRoomProps {
  roomId: string;
  userId: string;
  playerName?: string;
}

function parseChatMessages(value: unknown): ChatMessage[] {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return [];
  const chat = (value as { chat?: unknown }).chat;
  if (!Array.isArray(chat)) return [];

  return chat.filter((message): message is ChatMessage => {
    if (typeof message !== 'object' || message === null || Array.isArray(message)) return false;
    const candidate = message as Partial<ChatMessage>;
    return typeof candidate.id === 'string'
      && typeof candidate.userId === 'string'
      && typeof candidate.text === 'string'
      && typeof candidate.timestamp === 'number';
  });
}

function requestError(status: number): Error & { status: number } {
  return Object.assign(new Error('Battle room request failed'), { status });
}

export default function BattleRoom({ roomId, userId }: BattleRoomProps) {
  const { t } = useTranslation();
  const [connected, setConnected] = useState(false);
  const [playersOnline, setPlayersOnline] = useState<string[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<unknown | null>(() => (
    isNeonAuthConfigured
      ? null
      : new Error('Battle room is unavailable in this environment')
  ));
  const [retrying, setRetrying] = useState(false);
  const [chatError, setChatError] = useState<unknown | null>(null);
  const [chatSending, setChatSending] = useState(false);
  const chatSendGuard = useRef(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const applyRoom = useCallback((room: BattleRoomState) => {
    const players = [room.player1_id, room.player2_id].filter(
      (player): player is string => Boolean(player),
    );
    setPlayersOnline(players);
    setChatMessages(parseChatMessages(room.state));
    setConnected(true);
    setError(null);
  }, []);

  const loadRoom = useCallback(async () => {
    const token = await getNeonAccessToken();
    if (!token) throw Object.assign(new Error('Session expired'), { status: 401 });

    const response = await fetch(`/api/battle/room?id=${encodeURIComponent(roomId)}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });
    if (!response.ok) throw requestError(response.status);
    applyRoom(await response.json() as BattleRoomState);
  }, [applyRoom, roomId]);

  const joinRoom = useCallback(async () => {
    const token = await getNeonAccessToken();
    if (!token) throw Object.assign(new Error('Session expired'), { status: 401 });

    const response = await fetch(`/api/battle/room?id=${encodeURIComponent(roomId)}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ action: 'join' }),
    });
    if (!response.ok) throw requestError(response.status);
    applyRoom(await response.json() as BattleRoomState);
  }, [applyRoom, roomId]);

  useEffect(() => {
    if (!isNeonAuthConfigured) return;
    let active = true;
    let interval: number | undefined;

    const start = async () => {
      try {
        await joinRoom();
        if (!active) return;
        let pollInFlight = false;
        interval = window.setInterval(() => {
          // Skip ticks when the tab is hidden or the previous poll has not
          // settled yet so slow responses cannot stack overlapping fetches.
          if (document.hidden || pollInFlight) return;
          pollInFlight = true;
          void loadRoom().catch((loadError: unknown) => {
            if (!active) return;
            setConnected(false);
            setError(loadError);
          }).finally(() => {
            pollInFlight = false;
          });
        }, 1500);
      } catch (joinError: unknown) {
        if (!active) return;
        setConnected(false);
        setError(joinError);
      }
    };

    void start();
    return () => {
      active = false;
      if (interval !== undefined) window.clearInterval(interval);
    };
  }, [joinRoom, loadRoom]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const sendChat = useCallback(async () => {
    const text = chatInput.trim();
    if (!text || !connected || chatSendGuard.current) return;
    chatSendGuard.current = true;
    setChatSending(true);
    try {
      const token = await getNeonAccessToken();
      if (!token) {
        setChatError(Object.assign(new Error('Session expired'), { status: 401 }));
        return;
      }
      setChatInput('');
      const response = await fetch(`/api/battle/room?id=${encodeURIComponent(roomId)}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'chat', text }),
      });
      if (!response.ok) {
        setChatError(requestError(response.status));
        setChatInput(text);
        return;
      }
      applyRoom(await response.json() as BattleRoomState);
      setChatError(null);
    } catch (sendError) {
      // Keep the typed message so a transient network failure does not lose it.
      setChatInput(text);
      setChatError(sendError);
    } finally {
      chatSendGuard.current = false;
      setChatSending(false);
    }
  }, [applyRoom, chatInput, connected, roomId]);

  const copyRoomLink = useCallback(() => {
    const url = `${window.location.origin}/battle?room=${roomId}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => toast.error(t('common.copy_failed')));
  }, [roomId, t]);

  const retryConnection = async () => {
    setRetrying(true);
    setError(null);
    try {
      await joinRoom();
    } catch (retryError) {
      setError(retryError);
    } finally {
      setRetrying(false);
    }
  };

  if (error) {
    return (
      <RecoverableError
        title={t('common.load_failed')}
        description={t('common.load_failed')}
        error={error}
        retryLabel={t('common.retry')}
        retryingLabel={t('common.loading')}
        retrying={retrying}
        onRetry={() => void retryConnection()}
      />
    );
  }

  return (
    <div className="flex flex-col gap-4 rounded-sm border border-border/60 bg-card p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {connected ? (
            <Wifi className="h-4 w-4 text-green-500" />
          ) : (
            <WifiOff className="h-4 w-4 motion-safe:animate-pulse text-muted-foreground" />
          )}
          <div>
            <p className="font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
              PvP Battle Room
            </p>
            <p className="font-mono text-[11px] text-muted-foreground/60">
              ID: {roomId.slice(0, 8)}...
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={copyRoomLink}
          className="flex min-h-11 items-center gap-1.5 rounded-sm border border-border/60 px-3 font-mono text-[11px] uppercase tracking-wider text-muted-foreground transition-all hover:border-border hover:bg-muted/40"
        >
          <Copy className="h-3 w-3" />
          {copied ? 'Copied!' : 'Copy link'}
        </button>
      </div>

      <div className="flex items-center gap-2 rounded-sm bg-muted/20 px-3 py-2">
        <Users className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="font-mono text-[11px] text-muted-foreground">
          {playersOnline.length} player{playersOnline.length !== 1 ? 's' : ''} in room
        </span>
        <div className="flex gap-1">
          {playersOnline.map((playerId) => (
            <span
              key={playerId}
              className={cn(
                'h-1.5 w-1.5 rounded-full',
                playerId === userId ? 'bg-green-500' : 'bg-blue-500',
              )}
            />
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-1.5">
          <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />
          <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground/70">
            Battle chat
          </p>
        </div>

        <div className="flex h-40 flex-col gap-1 overflow-y-auto rounded-sm bg-muted/20 p-2">
          {chatMessages.length === 0 ? (
            <p className="m-auto font-mono text-[11px] text-muted-foreground/40">
              No messages yet. Say hi!
            </p>
          ) : (
            chatMessages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  'rounded px-2 py-1 text-xs',
                  message.userId === userId
                    ? 'ml-auto max-w-[75%] bg-primary/15 text-primary'
                    : 'mr-auto max-w-[75%] bg-muted/50 text-foreground/85',
                )}
              >
                {message.userId !== userId && (
                  <span className="mb-0.5 block font-mono text-[11px] font-bold uppercase tracking-widest text-muted-foreground/60">
                    Opponent
                  </span>
                )}
                {message.text}
              </div>
            ))
          )}
          <div ref={chatEndRef} />
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            value={chatInput}
            onChange={(event) => { setChatInput(event.target.value); setChatError(null); }}
            onKeyDown={(event) => {
              if (event.key === 'Enter') void sendChat();
            }}
            placeholder="Type a message..."
            disabled={!connected || chatSending}
            className="h-11 flex-1 rounded-sm border border-border/70 bg-background/50 px-3 font-mono text-[11px] placeholder:text-muted-foreground/40 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
          />
          <button
            type="button"
            onClick={() => void sendChat()}
            disabled={!connected || !chatInput.trim() || chatSending}
            aria-busy={chatSending}
            aria-label="Send message"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-sm border border-primary bg-primary/10 text-primary transition-all hover:bg-primary/20 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {chatSending ? <Loader2 className="h-4 w-4 motion-safe:animate-spin" aria-hidden="true" /> : <Send className="h-3.5 w-3.5" />}
          </button>
        </div>
        {chatError ? <RecoverableError title={t('common.request_failed')} description={t('common.error_unknown')} error={chatError} retryLabel={t('common.retry')} retryingLabel={t('common.saving_changes')} retrying={chatSending} onRetry={() => void sendChat()} compact /> : null}
      </div>
    </div>
  );
}
