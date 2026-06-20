'use client';

import { useState } from 'react';
import Link from 'next/link';
import { LogIn } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useAuth } from '@/lib/supabase/AuthProvider';
import { useLocaleHref } from '@/hooks/useLocaleHref';
import { useTranslation } from '@/lib/i18n';
import AuthModal from './AuthModal';

export default function AccountMenu() {
  const { enabled, loading, user } = useAuth();
  const { t } = useTranslation();
  const localeHref = useLocaleHref();
  const [authOpen, setAuthOpen] = useState(false);

  const tt = (key: string, fallback: string) => {
    const value = t(key, { defaultValue: fallback });
    return value === key ? fallback : value;
  };

  // Supabase not configured → keep the app fully local, render nothing.
  if (!enabled) return null;

  if (!user) {
    return (
      <>
        <Tooltip>
          <TooltipTrigger
            render={
              <button
                type="button"
                onClick={() => setAuthOpen(true)}
                disabled={loading}
                className="glass-control flex h-10 items-center gap-1.5 px-2.5 text-foreground/70 hover:border-primary/25 hover:bg-primary/10 hover:text-primary active:scale-95 disabled:opacity-50"
                aria-label={tt('auth.signin_cta', 'Sign in')}
              >
                <LogIn className="h-3.5 w-3.5" />
                <span className="hidden text-[9px] font-black uppercase tracking-[0.15em] xl:inline">
                  {tt('auth.signin_cta', 'Sign in')}
                </span>
              </button>
            }
          />
          <TooltipContent side="bottom" className="text-xs font-bold">
            {tt('auth.signin_cta', 'Sign in')}
          </TooltipContent>
        </Tooltip>
        <AuthModal open={authOpen} onOpenChange={setAuthOpen} />
      </>
    );
  }

  const email = user.email ?? '';
  const displayName =
    (typeof user.user_metadata?.name === 'string' && user.user_metadata.name.trim()) || '';
  const initial = (displayName || email).charAt(0).toUpperCase() || '?';
  const tooltip = displayName || email || tt('dashboard.title', 'Dashboard');

  // Signed in → the avatar opens the user dashboard.
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Link
            href={localeHref('/dashboard')}
            aria-label={tt('dashboard.title', 'Dashboard')}
            className="glass-control flex h-10 w-10 items-center justify-center text-foreground/70 hover:border-primary/25 hover:bg-primary/10 hover:text-primary active:scale-95"
          >
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/15 text-[11px] font-black text-primary">
              {initial}
            </span>
          </Link>
        }
      />
      <TooltipContent side="bottom" className="text-xs font-bold">
        {tooltip}
      </TooltipContent>
    </Tooltip>
  );
}
