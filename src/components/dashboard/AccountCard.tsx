'use client';

import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { LogOut, LogIn, User as UserIcon } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/supabase/AuthProvider';
import { useLocaleHref } from '@/hooks/useLocaleHref';
import { useTranslation } from '@/lib/i18n';
import AuthModal from '@/components/auth/AuthModal';

/**
 * Account panel shown on the dashboard. Surfaces the signed-in identity and the
 * sign-out action (the avatar in the header now links here instead of opening a
 * popover). Renders nothing when Supabase is unconfigured.
 */
export default function AccountCard() {
  const { enabled, user, signOut } = useAuth();
  const { t } = useTranslation();
  const localeHref = useLocaleHref();
  const router = useRouter();
  const [authOpen, setAuthOpen] = useState(false);

  const tt = (key: string, fallback: string) => {
    const value = t(key, { defaultValue: fallback });
    return value === key ? fallback : value;
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
    toast.success(tt('auth.signed_out', 'Signed out. Your data stays on this device.'));
    router.push(localeHref('/'));
  };

  return (
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
  );
}
