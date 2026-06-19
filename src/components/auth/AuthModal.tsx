'use client';

import { useState, type FormEvent } from 'react';
import { toast } from 'sonner';
import { Loader2, Mail, Lock, User } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/lib/supabase/AuthProvider';
import { useTranslation } from '@/lib/i18n';

type Mode = 'signin' | 'signup';

export default function AuthModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useTranslation();
  const { signIn, signUp, resetPassword } = useAuth();
  const [mode, setMode] = useState<Mode>('signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  const tt = (key: string, fallback: string) => {
    const value = t(key, { defaultValue: fallback });
    return value === key ? fallback : value;
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (busy) return;
    setBusy(true);

    try {
      if (mode === 'signup') {
        const { error } = await signUp(email, password, name);
        if (error) {
          toast.error(error.message);
          return;
        }
        toast.success(tt('auth.check_email', 'Account created — check your inbox to confirm your email.'));
        onOpenChange(false);
      } else {
        const { error } = await signIn(email, password);
        if (error) {
          toast.error(error.message);
          return;
        }
        toast.success(tt('auth.signed_in', 'Signed in. Syncing your collection…'));
        onOpenChange(false);
      }
    } finally {
      setBusy(false);
    }
  };

  const handleReset = async () => {
    if (!email) {
      toast.error(tt('auth.enter_email', 'Enter your email first.'));
      return;
    }
    const { error } = await resetPassword(email);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(tt('auth.reset_sent', 'Password reset email sent.'));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-black tracking-tight">
            {mode === 'signin'
              ? tt('auth.signin_title', 'Welcome back')
              : tt('auth.signup_title', 'Create your account')}
          </DialogTitle>
          <DialogDescription>
            {mode === 'signin'
              ? tt('auth.signin_subtitle', 'Sign in to sync your Pokédex across devices.')
              : tt('auth.signup_subtitle', 'Save your collection, team and progress to the cloud.')}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          {mode === 'signup' && (
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-bold uppercase tracking-[0.14em] text-foreground/60">
                {tt('auth.name', 'Name')}
              </span>
              <div className="relative">
                <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/40" />
                <Input
                  type="text"
                  required
                  autoComplete="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Sacha"
                  className="pl-9"
                />
              </div>
            </label>
          )}

          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-bold uppercase tracking-[0.14em] text-foreground/60">
              {tt('auth.email', 'Email')}
            </span>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/40" />
              <Input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ash@pallet.town"
                className="pl-9"
              />
            </div>
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-bold uppercase tracking-[0.14em] text-foreground/60">
              {tt('auth.password', 'Password')}
            </span>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/40" />
              <Input
                type="password"
                required
                minLength={6}
                autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="pl-9"
              />
            </div>
          </label>

          {mode === 'signin' && (
            <button
              type="button"
              onClick={handleReset}
              className="self-end text-xs font-semibold text-primary hover:underline"
            >
              {tt('auth.forgot', 'Forgot password?')}
            </button>
          )}

          <Button type="submit" disabled={busy} className="mt-1 w-full">
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            {mode === 'signin'
              ? tt('auth.signin_cta', 'Sign in')
              : tt('auth.signup_cta', 'Create account')}
          </Button>
        </form>

        <p className="text-center text-xs text-foreground/60">
          {mode === 'signin'
            ? tt('auth.no_account', "Don't have an account?")
            : tt('auth.have_account', 'Already have an account?')}{' '}
          <button
            type="button"
            onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
            className="font-bold text-primary hover:underline"
          >
            {mode === 'signin'
              ? tt('auth.signup_cta', 'Create account')
              : tt('auth.signin_cta', 'Sign in')}
          </button>
        </p>
      </DialogContent>
    </Dialog>
  );
}
