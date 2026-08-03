'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell, BellOff, Trash2, Plus, X, TrendingDown, TrendingUp, Send } from 'lucide-react';
import { toast } from 'sonner';
import { getSupabaseClient } from '@/lib/supabase/client';
import { subscribeToPush, sendPushNotification, isPushSupported } from '@/lib/push-notifications';
import { cn } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PriceAlert {
  id: string;
  card_id: string;
  card_name: string;
  alert_type: 'below' | 'above';
  threshold_usd: number | null;
  threshold_eur: number | null;
  currency: 'USD' | 'EUR';
  is_active: boolean;
  last_triggered_at: string | null;
  created_at: string;
}

interface PriceAlertManagerProps {
  cardId: string;
  cardName: string;
}

// ---------------------------------------------------------------------------
// API helpers
// ---------------------------------------------------------------------------

async function getAuthHeader(): Promise<string | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token ? `Bearer ${session.access_token}` : null;
}

async function fetchAlerts(cardId: string): Promise<PriceAlert[]> {
  const auth = await getAuthHeader();
  if (!auth) return [];
  const res = await fetch('/api/tcg/price-alerts', {
    headers: { Authorization: auth },
  });
  if (!res.ok) throw new Error('Failed to fetch alerts');
  const data = (await res.json()) as { alerts?: PriceAlert[] };
  return (data.alerts ?? []).filter((a) => a.card_id === cardId);
}

async function createAlert(payload: {
  card_id: string;
  card_name: string;
  alert_type: 'below' | 'above';
  threshold_usd?: number;
  threshold_eur?: number;
  currency: 'USD' | 'EUR';
}): Promise<PriceAlert> {
  const auth = await getAuthHeader();
  if (!auth) throw new Error('Not authenticated');
  const res = await fetch('/api/tcg/price-alerts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: auth },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = (await res.json()) as { error?: string };
    throw new Error(err.error ?? 'Failed to create alert');
  }
  const data = (await res.json()) as { alert: PriceAlert };
  return data.alert;
}

async function deleteAlert(id: string): Promise<void> {
  const auth = await getAuthHeader();
  if (!auth) throw new Error('Not authenticated');
  const res = await fetch(`/api/tcg/price-alerts?id=${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: { Authorization: auth },
  });
  if (!res.ok) throw new Error('Failed to delete alert');
}

async function toggleAlert(id: string, is_active: boolean): Promise<void> {
  const auth = await getAuthHeader();
  if (!auth) throw new Error('Not authenticated');
  const res = await fetch('/api/tcg/price-alerts', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: auth },
    body: JSON.stringify({ id, is_active }),
  });
  if (!res.ok) throw new Error('Failed to update alert');
}

// ---------------------------------------------------------------------------
// Create-alert form
// ---------------------------------------------------------------------------

interface CreateFormProps {
  cardId: string;
  cardName: string;
  onSuccess: () => void;
  onCancel: () => void;
}

function CreateAlertForm({ cardId, cardName, onSuccess, onCancel }: CreateFormProps) {
  const [alertType, setAlertType] = useState<'below' | 'above'>('below');
  const [currency, setCurrency] = useState<'USD' | 'EUR'>('USD');
  const [threshold, setThreshold] = useState('');
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: () => {
      const value = parseFloat(threshold);
      if (isNaN(value) || value <= 0) throw new Error('Enter a valid price');
      return createAlert({
        card_id: cardId,
        card_name: cardName,
        alert_type: alertType,
        threshold_usd: currency === 'USD' ? value : undefined,
        threshold_eur: currency === 'EUR' ? value : undefined,
        currency,
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['price-alerts', cardId] });
      // Request push permission if not yet granted
      try { await subscribeToPush(); } catch { /* permission denied is OK */ }
      toast.success('Price alert created!');
      onSuccess();
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  return (
    <div className="rounded-xl border border-foreground/10 bg-foreground/5 p-4 space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-black uppercase tracking-widest text-foreground/50">
          New Alert
        </span>
        <button type="button" onClick={onCancel} aria-label="Cancel" className="text-foreground/40 hover:text-foreground/80">
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Alert type */}
      <div className="flex gap-2">
        {(['below', 'above'] as const).map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => setAlertType(type)}
            className={cn(
              'flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-bold transition-colors',
              alertType === type
                ? 'bg-primary text-white'
                : 'bg-foreground/10 text-foreground/60 hover:bg-foreground/15',
            )}
          >
            {type === 'below' ? <TrendingDown className="h-3.5 w-3.5" /> : <TrendingUp className="h-3.5 w-3.5" />}
            {type === 'below' ? 'Below' : 'Above'}
          </button>
        ))}
      </div>

      {/* Currency */}
      <div className="flex gap-2">
        {(['USD', 'EUR'] as const).map((cur) => (
          <button
            key={cur}
            type="button"
            onClick={() => setCurrency(cur)}
            className={cn(
              'flex-1 rounded-lg py-2 text-xs font-bold transition-colors',
              currency === cur
                ? 'bg-primary/20 text-primary ring-1 ring-primary/40'
                : 'bg-foreground/10 text-foreground/60 hover:bg-foreground/15',
            )}
          >
            {cur === 'USD' ? '$ USD' : '€ EUR'}
          </button>
        ))}
      </div>

      {/* Threshold */}
      <div className="flex gap-2">
        <input
          type="number"
          min="0.01"
          step="0.01"
          value={threshold}
          onChange={(e) => setThreshold(e.target.value)}
          placeholder={`Price in ${currency}`}
          className="flex-1 rounded-lg border border-foreground/15 bg-foreground/5 px-3 py-2 text-sm placeholder:text-foreground/30 focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/30"
        />
        <button
          type="button"
          onClick={() => mutation.mutate()}
          disabled={mutation.isPending || !threshold}
          className="glass-control px-4 py-2 text-xs font-black uppercase tracking-wider disabled:opacity-40"
        >
          {mutation.isPending ? '…' : 'Save'}
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Alert row
// ---------------------------------------------------------------------------

interface AlertRowProps {
  alert: PriceAlert;
  cardId: string;
}

function AlertRow({ alert, cardId }: AlertRowProps) {
  const queryClient = useQueryClient();
  const symbol = alert.currency === 'EUR' ? '€' : '$';
  const threshold = alert.currency === 'EUR' ? alert.threshold_eur : alert.threshold_usd;

  const deleteMutation = useMutation({
    mutationFn: () => deleteAlert(alert.id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['price-alerts', cardId] });
      toast.success('Alert removed');
    },
    onError: () => toast.error('Failed to remove alert'),
  });

  const toggleMutation = useMutation({
    mutationFn: () => toggleAlert(alert.id, !alert.is_active),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['price-alerts', cardId] });
    },
    onError: () => toast.error('Failed to update alert'),
  });

  const testMutation = useMutation({
    mutationFn: async () => {
      if (!isPushSupported()) throw new Error('Push not supported in this browser');
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (!subscription) throw new Error('No active push subscription — enable notifications first');
      const symbolLocal = alert.currency === 'EUR' ? '€' : '$';
      const ok = await sendPushNotification(subscription, {
        title: `Lunidex — ${alert.card_name}`,
        body: `Test alert: ${alert.alert_type} ${symbolLocal}${threshold?.toFixed(2) ?? '?'}`,
        url: `/tcg/cards/${alert.card_id}`,
      });
      if (!ok) throw new Error('Send failed');
    },
    onSuccess: () => toast.success('Test notification sent!'),
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded-xl border px-4 py-3 transition-opacity',
        alert.is_active
          ? 'border-foreground/10 bg-foreground/[0.03]'
          : 'border-foreground/5 bg-foreground/[0.015] opacity-60',
      )}
    >
      {/* Icon */}
      <div
        className={cn(
          'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
          alert.alert_type === 'below'
            ? 'bg-green-500/15 text-green-500'
            : 'bg-orange-500/15 text-orange-400',
        )}
      >
        {alert.alert_type === 'below' ? (
          <TrendingDown className="h-4 w-4" />
        ) : (
          <TrendingUp className="h-4 w-4" />
        )}
      </div>

      {/* Description */}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-bold text-foreground/80">
          {alert.alert_type === 'below' ? 'Below' : 'Above'}{' '}
          {symbol}{threshold?.toFixed(2) ?? '—'}
          <span className="ml-1 text-foreground/40 font-normal">{alert.currency}</span>
        </p>
        {alert.last_triggered_at && (
          <p className="text-[11px] text-foreground/35">
            Last triggered{' '}
            {new Date(alert.last_triggered_at).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
            })}
          </p>
        )}
      </div>

      {/* Actions */}
      <button
        type="button"
        onClick={() => testMutation.mutate()}
        disabled={testMutation.isPending}
        aria-label="Send test notification"
        title="Send test notification"
        className="text-foreground/40 hover:text-primary transition-colors disabled:opacity-40"
      >
        <Send className="h-4 w-4" />
      </button>

      <button
        type="button"
        onClick={() => toggleMutation.mutate()}
        disabled={toggleMutation.isPending}
        aria-label={alert.is_active ? 'Disable alert' : 'Enable alert'}
        className="text-foreground/40 hover:text-primary transition-colors disabled:opacity-40"
      >
        {alert.is_active ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
      </button>

      <button
        type="button"
        onClick={() => deleteMutation.mutate()}
        disabled={deleteMutation.isPending}
        aria-label="Delete alert"
        className="text-foreground/40 hover:text-red-400 transition-colors disabled:opacity-40"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function PriceAlertManager({ cardId, cardName }: PriceAlertManagerProps) {
  const [showForm, setShowForm] = useState(false);
  const supabase = getSupabaseClient();

  const { data: alerts, isPending } = useQuery({
    queryKey: ['price-alerts', cardId],
    queryFn: () => fetchAlerts(cardId),
    staleTime: 60 * 1000,
    enabled: Boolean(supabase),
  });

  // Don't render if Supabase isn't configured (unauthenticated mode)
  if (!supabase) return null;

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-black uppercase tracking-widest text-foreground/50">
          Price Alerts
        </span>
        {!showForm && (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="glass-control flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold"
          >
            <Plus className="h-3.5 w-3.5" />
            Add alert
          </button>
        )}
      </div>

      {/* Create form */}
      {showForm && (
        <CreateAlertForm
          cardId={cardId}
          cardName={cardName}
          onSuccess={() => setShowForm(false)}
          onCancel={() => setShowForm(false)}
        />
      )}

      {/* Alert list */}
      {isPending ? (
        <div className="space-y-2">
          {[1, 2].map((i) => (
            <div key={i} className="h-14 animate-pulse rounded-xl bg-foreground/5" />
          ))}
        </div>
      ) : (alerts ?? []).length === 0 ? (
        <p className="rounded-xl border border-dashed border-foreground/10 px-5 py-4 text-center text-xs text-foreground/35">
          No alerts yet. Add one to get notified when the price moves.
        </p>
      ) : (
        <div className="space-y-2">
          {(alerts ?? []).map((alert) => (
            <AlertRow key={alert.id} alert={alert} cardId={cardId} />
          ))}
        </div>
      )}
    </div>
  );
}
