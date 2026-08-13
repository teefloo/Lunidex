'use client';

import { useEffect, useState } from 'react';
import { Eye, EyeOff, ShieldCheck, UserPlus } from 'lucide-react';
import { toast } from '@/lib/toast';
import { useAuth } from '@/lib/neon/AuthProvider';
import { useTranslation } from '@/lib/i18n';
import { getFriendPrivacySettings, updateFriendPrivacySettings } from '@/lib/friends';
import type { FriendPrivacySettings } from '@/types/friends';

function PrivacySwitch({
  checked,
  label,
  description,
  onChange,
}: {
  checked: boolean;
  label: string;
  description: string;
  onChange: (value: boolean) => void;
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
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-12 shrink-0 rounded-full transition-colors ${checked ? 'bg-primary' : 'bg-muted/70'}`}
      >
        <span className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-primary-foreground shadow-sm transition-transform ${checked ? 'translate-x-6' : ''}`} />
      </button>
    </div>
  );
}

export default function FriendPrivacyCard() {
  const { enabled, user } = useAuth();
  const { t } = useTranslation();
  const [settings, setSettings] = useState<FriendPrivacySettings | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!enabled || !user) return;
    void getFriendPrivacySettings(user.id)
      .then(setSettings)
      .catch(() => toast.error(t('friends.errors.load_settings', { defaultValue: 'Could not load friend settings.' })));
  }, [enabled, user, t]);

  if (!enabled || !user || !settings) return null;

  const update = async (next: FriendPrivacySettings) => {
    const previous = settings;
    setSettings(next);
    setSaving(true);
    try {
      await updateFriendPrivacySettings(user.id, next);
      toast.success(t('friends.settings.saved', { defaultValue: 'Friend privacy settings saved.' }));
    } catch {
      setSettings(previous);
      toast.error(t('friends.errors.save_settings', { defaultValue: 'Could not save friend settings.' }));
    } finally {
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

      <div className="space-y-2" aria-busy={saving}>
        <PrivacySwitch
          checked={settings.allowFriendRequests}
          label={t('friends.settings.requests', { defaultValue: 'Allow friend requests' })}
          description={t('friends.settings.requests_desc', { defaultValue: 'People can find your handle and send a request.' })}
          onChange={(value) => void update({ ...settings, allowFriendRequests: value })}
        />
        <PrivacySwitch
          checked={settings.shareTcgCollection}
          label={t('friends.settings.collection', { defaultValue: 'Share my collection' })}
          description={t('friends.settings.collection_desc', { defaultValue: 'Accepted friends can view owned cards and progress.' })}
          onChange={(value) => void update({ ...settings, shareTcgCollection: value })}
        />
        <PrivacySwitch
          checked={settings.shareTcgDecks}
          label={t('friends.settings.decks', { defaultValue: 'Share my decks' })}
          description={t('friends.settings.decks_desc', { defaultValue: 'Accepted friends can view your saved TCG decks.' })}
          onChange={(value) => void update({ ...settings, shareTcgDecks: value })}
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
