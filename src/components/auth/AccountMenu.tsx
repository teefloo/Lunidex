'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { LogIn, LogOut, User as UserIcon } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useAuth } from '@/lib/supabase/AuthProvider';
import { useTranslation } from '@/lib/i18n';
import AuthModal from './AuthModal';

export default function AccountMenu() {
  const { enabled, loading, user, signOut } = useAuth();
  const { t } = useTranslation();
  const [authOpen, setAuthOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);

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

  const handleSignOut = async () => {
    await signOut();
    setAccountOpen(false);
    toast.success(tt('auth.signed_out', 'Signed out. Your data stays on this device.'));
  };

  return (
    <>
      <Tooltip>
        <TooltipTrigger
          render={
            <button
              type="button"
              onClick={() => setAccountOpen(true)}
              className="glass-control flex h-10 w-10 items-center justify-center text-foreground/70 hover:border-primary/25 hover:bg-primary/10 hover:text-primary active:scale-95"
              aria-label={tt('auth.account', 'Account')}
            >
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/15 text-[11px] font-black text-primary">
                {initial}
              </span>
            </button>
          }
        />
        <TooltipContent side="bottom" className="text-xs font-bold">
          {email || tt('auth.account', 'Account')}
        </TooltipContent>
      </Tooltip>

      <Dialog open={accountOpen} onOpenChange={setAccountOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-black tracking-tight">
              <UserIcon className="h-5 w-5 text-primary" />
              {tt('auth.account', 'Account')}
            </DialogTitle>
            <DialogDescription>
              {tt('auth.synced_note', 'Your collection, team and progress are saved to your account and synced across devices.')}
            </DialogDescription>
          </DialogHeader>

          <div className="glass-card flex items-center gap-3 p-4">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/15 text-base font-black text-primary">
              {initial}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-foreground">{displayName || email}</p>
              <p className="truncate text-xs text-foreground/55">
                {displayName ? email : tt('auth.signed_in_label', 'Signed in')}
              </p>
            </div>
          </div>

          <Button variant="destructive" onClick={handleSignOut} className="w-full">
            <LogOut className="h-4 w-4" />
            {tt('auth.signout_cta', 'Sign out')}
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
}
