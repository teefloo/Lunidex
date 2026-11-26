'use client';

import { useEffect, useRef, useState, type ComponentProps, type FormEvent } from 'react';
import { toast } from '@/lib/toast';
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
import { useAuth } from '@/lib/neon/AuthProvider';
import { useTranslation } from '@/lib/i18n';
import LunidexLogo from '@/components/ui/LunidexLogo';
import { POSTHOG_EVENTS } from '@/lib/posthog-events';
import { capturePostHogEvent } from '@/lib/posthog-client';
import { classifyRecoverableError } from '@/lib/error-feedback';

type Mode = 'signin' | 'signup';
type DialogOpenChangeDetails = Parameters<NonNullable<ComponentProps<typeof Dialog>['onOpenChange']>>[1];

export default function AuthModal({
  open,
  onOpenChange,
  initialMode = 'signin',
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialMode?: Mode;
}) {
  const { t } = useTranslation();
  const { signIn, signUp, resetPassword, user } = useAuth();
  const [mode, setMode] = useState<Mode>(initialMode);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const actionGuard = useRef(false);

  const tt = (key: string, fallback: string) => {
    const value = t(key, { defaultValue: fallback });
    return value === key ? fallback : value;
  };

  const authErrorMessage = (error: { name: string; message: string }) => {
    if (error.name === 'AuthSessionUnavailable') return tt('auth.session_unavailable', 'Sign-in could not be confirmed. Please try again.');
    if (error.name === 'AuthUnavailable') return tt('common.error_server', 'The service is temporarily unavailable. Please try again.');
    if (error.name === 'InvalidToken') return tt('auth.reset_invalid', 'This reset link is invalid or has expired. Please request a new one.');
    if (error.name === 'AuthTimeout') return tt('common.error_timeout', 'The request timed out. Please try again.');
    const category = classifyRecoverableError(error);
    return category === null
      ? tt('common.error_unknown', 'Something went wrong. Please try again.')
      : tt(`common.error_${category}`, 'Unable to complete the request. Please try again.');
  };

  const unexpectedAuthErrorMessage = (error: unknown) => authErrorMessage(
    error instanceof Error ? error : { name: 'AuthError', message: '' },
  );

  const handleDialogOpenChange = (nextOpen: boolean, eventDetails: DialogOpenChangeDetails) => {
    if (!nextOpen && busy) {
      eventDetails.cancel();
      return;
    }
    const isDismissal = eventDetails.reason === 'escape-key' || eventDetails.reason === 'outside-press';
    if (!nextOpen && isDismissal && eventDetails.event.defaultPrevented) {
      // Autofill suggestions can consume Escape while still letting it bubble to the dialog.
      eventDetails.cancel();
      return;
    }
    onOpenChange(nextOpen);
  };

  useEffect(() => {
    if (open && user) onOpenChange(false);
  }, [onOpenChange, open, user]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (actionGuard.current) return;
    actionGuard.current = true;
    setBusy(true);
    setErrorMessage(null);
    const authEvent = mode === 'signup' ? POSTHOG_EVENTS.authSignUp : POSTHOG_EVENTS.authSignIn;
    capturePostHogEvent(authEvent, { method: 'password', result: 'started' });

    try {
      if (mode === 'signup') {
        const { error } = await signUp(email, password, name);
        if (error) {
          capturePostHogEvent(authEvent, { method: 'password', result: 'error', error_type: error.name });
          const message = authErrorMessage(error);
          setErrorMessage(message);
          return;
        }
        capturePostHogEvent(authEvent, { method: 'password', result: 'success', authenticated: Boolean(user) });
        toast.success(tt('auth.check_email', 'Account created — check your inbox to confirm your email.'));
        onOpenChange(false);
      } else {
        const { error } = await signIn(email, password);
        if (error) {
          capturePostHogEvent(authEvent, { method: 'password', result: 'error', error_type: error.name });
          const message = authErrorMessage(error);
          setErrorMessage(message);
          return;
        }
        capturePostHogEvent(authEvent, { method: 'password', result: 'success', authenticated: true });
        toast.success(tt('auth.signed_in', 'Signed in. Syncing your collection…'));
        onOpenChange(false);
      }
    } catch (error) {
      capturePostHogEvent(authEvent, {
        method: 'password',
        result: 'error',
        error_type: error instanceof Error ? error.name : 'Error',
      });
      const message = unexpectedAuthErrorMessage(error);
      setErrorMessage(message);
    } finally {
      actionGuard.current = false;
      setBusy(false);
    }
  };

  const handleReset = async () => {
    const normalizedEmail = email.trim();
    if (!normalizedEmail) {
      setErrorMessage(tt('auth.enter_email', 'Enter your email first.'));
      return;
    }
    if (actionGuard.current) return;

    actionGuard.current = true;
    setBusy(true);
    setErrorMessage(null);
    capturePostHogEvent(POSTHOG_EVENTS.authPasswordResetRequested, { method: 'email', result: 'started' });
    try {
      const { error } = await resetPassword(normalizedEmail);
      if (error) {
        capturePostHogEvent(POSTHOG_EVENTS.authPasswordResetRequested, { method: 'email', result: 'error', error_type: error.name });
        const message = authErrorMessage(error);
        setErrorMessage(message);
        return;
      }
      capturePostHogEvent(POSTHOG_EVENTS.authPasswordResetRequested, { method: 'email', result: 'success' });
      toast.success(tt('auth.reset_sent', 'Password reset email sent.'));
    } catch (error) {
      capturePostHogEvent(POSTHOG_EVENTS.authPasswordResetRequested, {
        method: 'email',
        result: 'error',
        error_type: error instanceof Error ? error.name : 'Error',
      });
      const message = unexpectedAuthErrorMessage(error);
      setErrorMessage(message);
    } finally {
      actionGuard.current = false;
      setBusy(false);
    }
  };

  // Autofill UIs can route selection clicks through the backdrop.
  return (
    <Dialog
      open={open}
      disablePointerDismissal
      onOpenChange={handleDialogOpenChange}
    >
      <DialogContent className="z-[402] sm:max-w-md" overlayClassName="z-[401]" data-ph-no-capture aria-busy={busy}>
        <DialogHeader>
          <LunidexLogo alt="Lunidex" sizes="40px" className="mb-2 h-10 w-10 object-contain" />
          <DialogTitle className="text-xl font-black tracking-tight">
            {mode === 'signin'
              ? tt('auth.signin_title', 'Welcome back')
              : tt('auth.signup_title', 'Create your account')}
          </DialogTitle>
          <DialogDescription>
            {mode === 'signin'
              ? tt('auth.signin_subtitle', 'Sign in to sync your collections and progress across devices.')
              : tt('auth.signup_subtitle', 'Save your collection, team and progress to the cloud.')}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3" data-ph-no-capture>
          {mode === 'signup' && (
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-bold uppercase tracking-[0.14em] text-foreground/60">
                {tt('auth.name', 'Name')}
              </span>
              <div className="relative">
                <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/40" />
                <Input
                  name="name"
                  type="text"
                  required
                  autoComplete="name"
                  value={name}
                  onChange={(e) => { setName(e.target.value); setErrorMessage(null); }}
                  disabled={busy}
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
                name="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setErrorMessage(null); }}
                disabled={busy}
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
                name="password"
                type="password"
                required
                minLength={6}
                autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                value={password}
                onChange={(e) => { setPassword(e.target.value); setErrorMessage(null); }}
                disabled={busy}
                className="pl-9"
              />
            </div>
          </label>

          {mode === 'signin' && (
            <button
              type="button"
              onClick={handleReset}
              disabled={busy}
              className="self-end text-xs font-semibold text-primary hover:underline"
            >
              {tt('auth.forgot', 'Forgot password?')}
            </button>
          )}

          <Button type="submit" disabled={busy} aria-busy={busy} className="mt-1 w-full">
            {busy && <Loader2 className="h-4 w-4 motion-safe:animate-spin" aria-hidden="true" />}
            {busy ? tt('common.loading', 'Loading…') : mode === 'signin'
              ? tt('auth.signin_cta', 'Sign in')
              : tt('auth.signup_cta', 'Create account')}
          </Button>
        </form>

        {errorMessage && (
          <p role="alert" className="text-sm font-semibold text-destructive">
            {errorMessage}
          </p>
        )}

        <p className="text-center text-xs text-foreground/60">
          {mode === 'signin'
            ? tt('auth.no_account', "Don't have an account?")
            : tt('auth.have_account', 'Already have an account?')}{' '}
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              setMode(mode === 'signin' ? 'signup' : 'signin');
              setErrorMessage(null);
            }}
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
