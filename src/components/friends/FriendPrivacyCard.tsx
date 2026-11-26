'use client';

import { useRef, useState } from 'react';
import { Eye, EyeOff, Loader2, ShieldCheck, UserPlus } from 'lucide-react';
import { toast } from '@/lib/toast';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/neon/AuthProvider';
import { useTranslation } from '@/lib/i18n';
import { getFriendPrivacySettings, updateFriendPrivacySettings } from '@/lib/friends';
import type { FriendPrivacySettings } from '@/types/friends';
import { RecoverableError } from '@/components/ui/RecoverableError';

function PrivacySwitch({
  checked,
  label,
  description,
  onChange,
  disabled,
}: {
  checked: boolean;
  label: string;
  description: string;
  onChange: (value: boolean) => void;
  disabled: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-sm border border-border/40 bg-secondary/20 p-3">
      <div className="flex min-w-0 items-center gap-3">
        {checked ? <Eye className="h-4 w-4 shrink-0 text-primary" /> : <EyeOff className="h-4 w-4 shrink-0 text-foreground/35" />}
        <div className="min-w-0">
          <p className="text-sm font-bold text-foreground/80">{label}</p>
          <p className="text-xs text-foreground/45">{description}</p>
        </div>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-disabled={disabled}
        aria-label={label}
        onClick={() => onChange(!checked)}
        disabled={disabled}
        className="grid min-h-11 min-w-11 shrink-0 place-items-center rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        <span className={`relative h-6 w-12 rounded-full transition-colors ${checked ? 'bg-primary' : 'bg-muted/70'}`}>
          <span className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-primary-foreground shadow-sm transition-transform ${checked ? 'translate-x-6' : ''}`} />
        </span>
      </button>
    </div>
  );
}

export default function FriendPrivacyCard() {
  const { enabled, user } = useAuth();
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const userId = user?.id;
  const queryKey = ['friends', 'privacy-settings', userId];
  const settingsQuery = useQuery({
    queryKey,
    queryFn: () => getFriendPrivacySettings(userId!),
    enabled: enabled && Boolean(userId),
    staleTime: 30 * 1000,
  });
  const [optimisticSettings, setOptimisticSettings] = useState<{ userId: string; value: FriendPrivacySettings } | null>(null);
  const settings = optimisticSettings && optimisticSettings.userId === userId ? optimisticSettings.value : settingsQuery.data ?? null;
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<unknown>(null);
  const [failedUpdate, setFailedUpdate] = useState<FriendPrivacySettings | null>(null);
  const updateGuard = useRef(false);

  if (!enabled || !userId) return null;
  if (settingsQuery.isLoading) return <div className="glass-card flex min-h-28 items-center justify-center gap-2 rounded-sm p-5 text-sm text-foreground/60" role="status" aria-busy="true"><Loader2 className="h-4 w-4 motion-safe:animate-spin" aria-hidden="true" />{t('common.loading')}</div>;
  if (settingsQuery.isError && !settings) return <RecoverableError title={t('friends.errors.load_settings', { defaultValue: 'Could not load friend settings.' })} description={t('common.load_failed')} error={settingsQuery.error} onRetry={() => void settingsQuery.refetch()} retrying={settingsQuery.isFetching} retryLabel={t('common.retry')} retryingLabel={t('common.loading')} />;
  if (!settings) return null;

  const update = async (next: FriendPrivacySettings) => {
    if (updateGuard.current) return;
    updateGuard.current = true;
    const previous = settings;
    setOptimisticSettings({ userId, value: next });
    setSaving(true);
    setSaveError(null);
    setFailedUpdate(null);
    try {
      await updateFriendPrivacySettings(userId, next);
      queryClient.setQueryData<FriendPrivacySettings>(queryKey, next);
      setOptimisticSettings(null);
      toast.success(t('friends.settings.saved', { defaultValue: 'Friend privacy settings saved.' }));
    } catch (error) {
      setOptimisticSettings({ userId, value: previous });
      setSaveError(error);
      setFailedUpdate(next);
    } finally {
      updateGuard.current = false;
      setSaving(false);
    }
  };

  return (
    <section className="glass-card space-y-4 rounded-sm p-5" aria-labelledby="friend-privacy-title">
      <div className="flex items-center gap-3">
        <div className="rounded-sm border border-primary/20 bg-primary/10 p-2 text-primary">
          <ShieldCheck className="h-5 w-5" />
        </div>
        <div>
          <h2 id="friend-privacy-title" className="text-lg font-black text-foreground/90">
            {t('friends.settings.title', { defaultValue: 'Friend privacy' })}
          </h2>
          <p className="text-xs text-foreground/50">
            {t('friends.settings.subtitle', { defaultValue: 'Choose what accepted friends can see.' })}
          </p>
        </div>
      </div>

      {settingsQuery.isError ? <RecoverableError title={t('friends.errors.load_settings', { defaultValue: 'Could not refresh friend settings.' })} description={t('common.load_failed')} error={settingsQuery.error} onRetry={() => void settingsQuery.refetch()} retrying={settingsQuery.isFetching} retryLabel={t('common.retry')} retryingLabel={t('common.loading')} compact /> : null}
      {saveError ? <RecoverableError title={t('friends.errors.save_settings', { defaultValue: 'Could not save friend settings.' })} description={t('common.error_unknown', { defaultValue: 'Something went wrong. Please try again.' })} error={saveError} onRetry={() => { if (failedUpdate) void update(failedUpdate); }} retrying={saving} retryLabel={t('common.retry')} retryingLabel={t('common.loading')} compact /> : null}
      {saving ? <p className="text-xs text-foreground/55" role="status" aria-live="polite">{t('common.saving_changes')}</p> : null}
      <div className="space-y-2" aria-busy={saving}>
        <PrivacySwitch
          checked={settings.allowFriendRequests}
          label={t('friends.settings.requests', { defaultValue: 'Allow friend requests' })}
          description={t('friends.settings.requests_desc', { defaultValue: 'People can find your handle and send a request.' })}
          onChange={(value) => void update({ ...settings, allowFriendRequests: value })}
          disabled={saving}
        />
        <PrivacySwitch
          checked={settings.shareTcgCollection}
          label={t('friends.settings.collection', { defaultValue: 'Share my collection' })}
          description={t('friends.settings.collection_desc', { defaultValue: 'Accepted friends can view owned cards and progress.' })}
          onChange={(value) => void update({ ...settings, shareTcgCollection: value })}
          disabled={saving}
        />
        <PrivacySwitch
          checked={settings.shareTcgDecks}
          label={t('friends.settings.decks', { defaultValue: 'Share my decks' })}
          description={t('friends.settings.decks_desc', { defaultValue: 'Accepted friends can view your saved TCG decks.' })}
          onChange={(value) => void update({ ...settings, shareTcgDecks: value })}
          disabled={saving}
        />
      </div>

      {!settings.allowFriendRequests && (
        <p className="flex items-center gap-2 text-xs font-bold text-foreground/45">
          <UserPlus className="h-3.5 w-3.5" />
          {t('friends.settings.requests_disabled', { defaultValue: 'New friend requests are currently disabled.' })}
        </p>
      )}
    </section>
  );
}
