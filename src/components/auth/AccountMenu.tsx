'use client';

import { useState } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { LogIn, UserRound } from 'lucide-react';
import { useAuth } from '@/lib/neon/AuthProvider';
import { useLocaleHref } from '@/hooks/useLocaleHref';
import { useTranslation } from '@/lib/i18n';
import { AuthModalBoundary } from './AuthModalBoundary';
const AuthModal = dynamic(() => import('./AuthModal'), { ssr: false });

export default function AccountMenu() {
  const { enabled, loading, user } = useAuth();
  const { t } = useTranslation();
  const localeHref = useLocaleHref();
  const [authOpen, setAuthOpen] = useState(false);

  const tt = (key: string, fallback: string) => {
    const value = t(key, { defaultValue: fallback });
    return value === key ? fallback : value;
  };

  const dashboardLabel = tt('dashboard.title', 'Dashboard');

  // Keep the dashboard route discoverable even when cloud authentication is
  // not configured. When Auth is available, this same slot becomes the
  // sign-in action or the signed-in user's dashboard link below.
  if (!enabled) {
    return (
      <Link
        href={localeHref('/dashboard')}
        aria-label={dashboardLabel}
        title={dashboardLabel}
        className="glass-control touch-target flex min-h-11 items-center gap-1.5 px-2.5 text-foreground/70 hover:border-primary/25 hover:bg-primary/10 hover:text-primary active:scale-95"
      >
        <UserRound className="h-3.5 w-3.5" aria-hidden="true" />
        <span className="hidden text-[11px] font-black uppercase tracking-[0.15em] 2xl:inline">
          {dashboardLabel}
        </span>
      </Link>
    );
  }

  if (!user) {
    return (
      <>
        <button
                type="button"
                onClick={() => setAuthOpen(true)}
                disabled={loading}
                title={tt('auth.signin_cta', 'Sign in')}
                className="glass-control touch-target flex min-h-11 items-center gap-1.5 px-2.5 text-foreground/70 hover:border-primary/25 hover:bg-primary/10 hover:text-primary active:scale-95 disabled:opacity-50"
                aria-label={tt('auth.signin_cta', 'Sign in')}
              >
                <LogIn className="h-3.5 w-3.5" />
                <span className="hidden text-[11px] font-black uppercase tracking-[0.15em] 2xl:inline">
                  {tt('auth.signin_cta', 'Sign in')}
                </span>
        </button>
        {authOpen && (
          <AuthModalBoundary onClose={() => setAuthOpen(false)}>
            <AuthModal open onOpenChange={setAuthOpen} />
          </AuthModalBoundary>
        )}
      </>
    );
  }

  const email = user.email ?? '';
  const displayName =
    (typeof user.user_metadata?.name === 'string' && user.user_metadata.name.trim()) || '';
  const initial = (displayName || email).charAt(0).toUpperCase() || '?';
  const tooltip = displayName || email || dashboardLabel;

  // Signed in → the avatar links straight to the user dashboard.
  // A plain Next Link (not a Tooltip-wrapped trigger) guarantees the click
  // navigates on both desktop and touch.
  return (
    <Link
      href={localeHref('/dashboard')}
      aria-label={dashboardLabel}
      title={tooltip}
      className="glass-control touch-target flex h-11 w-11 items-center justify-center text-foreground/70 hover:border-primary/25 hover:bg-primary/10 hover:text-primary active:scale-95"
    >
      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/15 text-[11px] font-black text-primary">
        {initial}
      </span>
    </Link>
  );
}
