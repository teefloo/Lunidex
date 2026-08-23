'use client';

import { useState } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { LogIn, UserRound } from 'lucide-react';
import { useAuth } from '@/lib/neon/AuthProvider';
import { useLocaleHref } from '@/hooks/useLocaleHref';
import { useTranslation } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { AuthModalBoundary } from './AuthModalBoundary';
const AuthModal = dynamic(() => import('./AuthModal'), { ssr: false });

interface AccountMenuProps {
  className?: string;
  onInteraction?: () => void;
  onRequestAuth?: () => void;
  showLabel?: boolean;
}

export default function AccountMenu({ className, onInteraction, onRequestAuth, showLabel = false }: AccountMenuProps) {
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
        onClick={onInteraction}
        className={cn('site-header-action', className)}
      >
        <UserRound className="h-3.5 w-3.5" aria-hidden="true" />
        <span className={cn('site-header-account-label', !showLabel && 'hidden 2xl:inline')}>
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
          onClick={() => {
            if (onRequestAuth) {
              onRequestAuth();
              return;
            }
            onInteraction?.();
            setAuthOpen(true);
          }}
          disabled={loading}
          title={tt('auth.signin_cta', 'Sign in')}
          className={cn('site-header-action disabled:opacity-50', className)}
          aria-label={tt('auth.signin_cta', 'Sign in')}
        >
          <LogIn className="h-3.5 w-3.5" aria-hidden="true" />
          <span className={cn('site-header-account-label', !showLabel && 'hidden 2xl:inline')}>
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
      onClick={onInteraction}
      className={cn('site-header-action', className)}
    >
      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/15 text-[11px] font-black text-primary">
        {initial}
      </span>
    </Link>
  );
}
