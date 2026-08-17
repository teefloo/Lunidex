'use client';

import { useRouter } from 'next/navigation';
import { toast } from '@/lib/toast';
import { LogOut, LogIn, User as UserIcon, Globe, Copy, Check, ExternalLink, Download, Trash2 } from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { useAuth } from '@/lib/neon/AuthProvider';
import { fetchAppApi } from '@/lib/app-api';
import { useLocaleHref } from '@/hooks/useLocaleHref';
import { useTranslation } from '@/lib/i18n';
import AuthModal from '@/components/auth/AuthModal';
import { HANDLE_REGEX, HANDLE_MIN_LENGTH, HANDLE_MAX_LENGTH } from '@/types/dashboard';

/**
 * Account panel shown on the dashboard. Surfaces the signed-in identity and the
 * sign-out action (the avatar in the header now links here instead of opening a
 * popover). Renders nothing when Neon Auth is unconfigured.
 *
 * When the user is signed in, a "Public Profile" section is shown with:
 * - A handle input (3-30 lowercase alphanumeric + hyphens)
 * - A toggle to enable/disable public visibility
 * - A share link button
 */
export default function AccountCard() {
  const { enabled, user, signOut } = useAuth();
  const { t } = useTranslation();
  const localeHref = useLocaleHref();
  const router = useRouter();
  const [authOpen, setAuthOpen] = useState(false);

  // Public profile state
  const [publicHandle, setPublicHandle] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [handleError, setHandleError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [profileLoaded, setProfileLoaded] = useState(false);

  const tt = useCallback(
    (key: string, fallback: string) => {
      const value = t(key, { defaultValue: fallback });
      return value === key ? fallback : value;
    },
    [t],
  );

  // Load current profile settings
  useEffect(() => {
    if (!user || !enabled) return;

    const loadProfile = async () => {
      const response = await fetchAppApi('/api/profile', { cache: 'no-store' });
      if (response.ok) {
        const payload = (await response.json()) as {
          profile?: { public_handle?: string | null; is_public?: boolean } | null;
        };
        if (payload.profile) {
          setPublicHandle(payload.profile.public_handle ?? '');
          setIsPublic(payload.profile.is_public ?? false);
        }
      }
      setProfileLoaded(true);
    };

    void loadProfile();
  }, [user, enabled]);

  const validateHandle = useCallback(
    (value: string): boolean => {
      if (!value) {
        setHandleError(null);
        return true;
      }
      if (value.length < HANDLE_MIN_LENGTH || value.length > HANDLE_MAX_LENGTH) {
        setHandleError(
          tt('profile.handle_length_error', `Handle must be ${HANDLE_MIN_LENGTH}-${HANDLE_MAX_LENGTH} characters`),
        );
        return false;
      }
      if (!HANDLE_REGEX.test(value)) {
        setHandleError(
          tt('profile.handle_format_error', 'Only lowercase letters, numbers, and hyphens'),
        );
        return false;
      }
      setHandleError(null);
      return true;
    },
    [tt],
  );

  const saveProfile = async (handle: string, publicFlag: boolean) => {
    if (!user) return;

    setIsSaving(true);
    try {
      const response = await fetchAppApi('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ handle: handle || null, isPublic: publicFlag }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: unknown } | null;
        const errorMessage = typeof payload?.error === 'string' ? payload.error : 'Failed to update profile';
        if (errorMessage.includes('Handle already taken')) {
          setHandleError(tt('profile.handle_taken', 'This handle is already taken'));
        } else {
          toast.error(errorMessage);
        }
        return;
      }

      toast.success(
        publicFlag
          ? tt('profile.public_enabled', 'Your profile is now public!')
          : tt('profile.public_disabled', 'Your profile is now private.'),
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleTogglePublic = async (checked: boolean) => {
    if (checked && !publicHandle) {
      setHandleError(tt('profile.handle_required', 'Choose a handle first'));
      return;
    }
    setIsPublic(checked);
    await saveProfile(publicHandle, checked);
  };

  const handleSaveHandle = async () => {
    if (!validateHandle(publicHandle)) return;
    await saveProfile(publicHandle, isPublic);
  };

  const handleCopyLink = async () => {
    const url = `${window.location.origin}/u/${publicHandle}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success(tt('profile.link_copied', 'Profile link copied!'));
      setTimeout(() => setCopied(false), 2000);
    } catch { /* clipboard not available */ }
  };

  if (!enabled) return null;

  if (!user) {
    return (
      <>
        <div className="glass-card flex flex-col items-start gap-3 rounded-sm p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-full border border-border/50 bg-muted/50 text-foreground/40">
              <UserIcon className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-bold text-foreground">{tt('auth.guest', 'Guest')}</p>
              <p className="text-xs text-foreground/55">
                {tt('auth.signin_subtitle', 'Sign in to sync your Pokédex across devices.')}
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => setAuthOpen(true)}>
            <LogIn className="h-4 w-4" />
            {tt('auth.signin_cta', 'Sign in')}
          </Button>
        </div>
        <AuthModal open={authOpen} onOpenChange={setAuthOpen} />
      </>
    );
  }

  const email = user.email ?? '';
  const displayName =
    (typeof user.user_metadata?.name === 'string' && user.user_metadata.name.trim()) || '';
  const initial = (displayName || email).charAt(0).toUpperCase() || '?';

  const handleSignOut = async () => {
    await signOut();
    toast.success(tt('auth.signed_out', 'Signed out. Your synced data remains in your account.'));
    router.push(localeHref('/'));
  };

  const handleExport = async () => {
    const response = await fetchAppApi('/api/account/export', { cache: 'no-store' });
    if (!response.ok) {
      toast.error(tt('account.export_error', 'Your data could not be exported.'));
      return;
    }
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'lunidex-account-export.json';
    link.click();
    URL.revokeObjectURL(url);
    toast.success(tt('account.export_success', 'Your data export is ready.'));
  };

  const handleDeleteAccount = async () => {
    const confirmation = window.prompt(tt('account.delete_prompt', 'Type DELETE to permanently delete your account and synced data.'));
    if (confirmation !== 'DELETE') return;

    const response = await fetchAppApi('/api/account', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ confirmation }),
    });
    if (!response.ok) {
      toast.error(tt('account.delete_error', 'Your account could not be deleted.'));
      return;
    }
    try {
      window.localStorage.clear();
      window.sessionStorage.clear();
      document.cookie = 'primedex-lang=; path=/; max-age=0; samesite=lax';
    } catch {
      // Local storage may be unavailable; the server-side account deletion still completed.
    }
    try {
      await signOut();
    } catch {
      // The auth account may already be deleted; navigation still leaves the session area.
    }
    toast.success(tt('account.delete_success', 'Your account and synced data were deleted.'));
    router.push(localeHref('/'));
  };

  return (
    <div className="space-y-3">
      {/* Account info */}
      <div className="glass-card flex flex-col items-start gap-3 rounded-sm p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-11 w-11 flex-none items-center justify-center rounded-full bg-primary/15 text-base font-black text-primary">
            {initial}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-foreground">{displayName || email}</p>
            <p className="truncate text-xs text-foreground/55">
              {displayName ? email : tt('auth.signed_in_label', 'Signed in')}
            </p>
          </div>
        </div>
        <Button variant="destructive" size="sm" onClick={handleSignOut}>
          <LogOut className="h-4 w-4" />
          {tt('auth.signout_cta', 'Sign out')}
        </Button>
      </div>

      {/* Public profile settings */}
      {profileLoaded && (
        <div className="glass-card rounded-sm p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Globe className="h-4 w-4 text-foreground/50" />
            <h2 className="text-xs font-black uppercase tracking-[0.15em] text-foreground/60">
              {tt('profile.settings_title', 'Public Profile')}
            </h2>
          </div>

          {/* Handle input */}
          <div className="space-y-2">
            <label className="text-[11px] font-bold uppercase tracking-[0.12em] text-foreground/50">
              {tt('profile.handle_label', 'Handle')}
            </label>
            <div className="flex items-center gap-2">
              <div className="flex items-center rounded-sm border border-border/50 bg-muted/30 px-3 py-1.5">
                <span className="text-xs text-foreground/40 mr-1">/u/</span>
                <Input
                  value={publicHandle}
                  onChange={(e) => {
                    const val = e.target.value.toLowerCase();
                    setPublicHandle(val);
                    validateHandle(val);
                  }}
                  onBlur={() => publicHandle && validateHandle(publicHandle)}
                  placeholder={tt('profile.handle_placeholder', 'your-name')}
                  className="h-auto border-0 bg-transparent p-0 text-sm focus-visible:ring-0 focus-visible:ring-offset-0 w-36"
                  maxLength={HANDLE_MAX_LENGTH}
                  aria-label={tt('profile.handle_label', 'Handle')}
                />
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSaveHandle}
                disabled={isSaving || !!handleError || !publicHandle}
                className="shrink-0"
              >
                {isSaving ? '...' : tt('common.save', 'Save')}
              </Button>
            </div>
            {handleError && (
              <p className="text-xs text-destructive font-medium">{handleError}</p>
            )}
          </div>

          {/* Toggle + share */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Switch
                checked={isPublic}
                onCheckedChange={handleTogglePublic}
                disabled={!publicHandle || !!handleError || isSaving}
                aria-label={tt('profile.toggle_public', 'Make profile public')}
              />
              <span className="text-sm font-medium text-foreground/70">
                {isPublic
                  ? tt('profile.status_public', 'Public')
                  : tt('profile.status_private', 'Private')}
              </span>
            </div>

            {isPublic && publicHandle && (
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCopyLink}
                  className="h-8 gap-1.5 text-xs"
                >
                  {copied ? (
                    <Check className="h-3.5 w-3.5 text-green-500" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                  {copied
                    ? tt('profile.copied', 'Copied!')
                    : tt('profile.copy_link', 'Copy link')}
                </Button>
                <a
                  href={`/u/${publicHandle}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 rounded-sm px-2 py-1 text-xs font-medium text-foreground/50 hover:text-foreground/70 transition-colors"
                >
                  <ExternalLink className="h-3 w-3" />
                  {tt('profile.view', 'View')}
                </a>
              </div>
            )}
          </div>

          {isPublic && publicHandle && (
            <p className="text-xs text-foreground/40 font-medium">
              {tt('profile.public_hint', 'Your profile is visible at')}:{' '}
              <span className="text-foreground/60">/u/{publicHandle}</span>
            </p>
          )}
        </div>
      )}

      <div className="glass-card flex flex-col gap-3 rounded-sm p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-sm font-bold text-foreground">{tt('account.data_title', 'Your data')}</h2>
          <p className="mt-1 text-xs leading-relaxed text-foreground/55">
            {tt('account.data_description', 'Export or delete the data linked to this account.')}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => void handleExport()}>
            <Download className="h-4 w-4" />
            {tt('account.export', 'Export data')}
          </Button>
          <Button variant="destructive" size="sm" onClick={() => void handleDeleteAccount()}>
            <Trash2 className="h-4 w-4" />
            {tt('account.delete', 'Delete account')}
          </Button>
        </div>
      </div>
    </div>
  );
}
