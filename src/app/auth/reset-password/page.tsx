'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { Loader2, Lock } from 'lucide-react';
import { toast } from '@/lib/toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/lib/neon/AuthProvider';
import { useTranslation } from '@/lib/i18n';
import { useLocaleHref } from '@/hooks/useLocaleHref';
import { useRouter } from 'next/navigation';

export default function ResetPasswordPage() {
  const { t } = useTranslation();
  const { loading, updatePassword } = useAuth();
  const router = useRouter();
  const localeHref = useLocaleHref();
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [busy, setBusy] = useState(false);
  const [hasResetToken, setHasResetToken] = useState(false);
  const [hasCheckedResetToken, setHasCheckedResetToken] = useState(false);

  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get('token');
    setHasResetToken(Boolean(token));
    setHasCheckedResetToken(true);
  }, []);

  const tt = (key: string, fallback: string) => {
    const value = t(key, { defaultValue: fallback });
    return value === key ? fallback : value;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy) return;

    if (password.length < 6) {
      toast.error(tt('auth.password_min_length', 'Your password must contain at least 6 characters.'));
      return;
    }
    if (password !== confirmation) {
      toast.error(tt('auth.password_mismatch', 'The passwords do not match.'));
      return;
    }

    setBusy(true);
    try {
      const { error } = await updatePassword(password);
      if (error) {
        toast.error(error.message);
        return;
      }
      toast.success(tt('auth.password_updated', 'Your password has been updated.'));
      router.replace(localeHref('/dashboard'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-24">
      <section className="page-surface w-full max-w-md p-6 sm:p-8">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-sm border border-primary/30 bg-primary/10 text-primary">
            <Lock className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <p className="page-eyebrow">Lunidex</p>
            <h1 className="text-2xl font-black tracking-tight">
              {tt('auth.reset_title', 'Change your password')}
            </h1>
          </div>
        </div>

        {loading || !hasCheckedResetToken ? (
          <div className="flex items-center gap-2 text-sm text-foreground/60" role="status">
            <Loader2 className="h-4 w-4 animate-spin" />
            {tt('auth.reset_loading', 'Verifying your reset link…')}
          </div>
        ) : hasResetToken ? (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <p className="text-sm leading-6 text-foreground/60">
              {tt('auth.reset_subtitle', 'Choose a new password for your Lunidex account.')}
            </p>
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-bold uppercase tracking-[0.14em] text-foreground/60">
                {tt('auth.new_password', 'New password')}
              </span>
              <Input
                type="password"
                required
                minLength={6}
                autoComplete="new-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="h-11"
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-bold uppercase tracking-[0.14em] text-foreground/60">
                {tt('auth.confirm_password', 'Confirm password')}
              </span>
              <Input
                type="password"
                required
                minLength={6}
                autoComplete="new-password"
                value={confirmation}
                onChange={(event) => setConfirmation(event.target.value)}
                className="h-11"
              />
            </label>
            <Button type="submit" disabled={busy} className="mt-2 w-full">
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              {tt('auth.update_password', 'Update password')}
            </Button>
          </form>
        ) : (
          <div className="space-y-4">
            <p className="text-sm leading-6 text-foreground/60">
              {tt('auth.reset_invalid', 'This reset link is invalid or has expired. Please request a new one.')}
            </p>
            <Button type="button" variant="outline" onClick={() => router.replace(localeHref('/'))} className="w-full">
              {tt('common.back_home', 'Back home')}
            </Button>
          </div>
        )}
      </section>
    </main>
  );
}
