'use client';

import { useState, type FormEvent } from 'react';
import { Loader2, Mail, PartyPopper } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Status = 'idle' | 'submitting' | 'success' | 'error';

interface EarlyAccessFormProps {
  formLabel: string;
}

export default function EarlyAccessForm({ formLabel }: EarlyAccessFormProps) {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<Status>('idle');

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!EMAIL_PATTERN.test(email)) {
      setStatus('error');
      return;
    }
    setStatus('submitting');
    try {
      const res = await fetch('/api/early-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) throw new Error('request_failed');
      setStatus('success');
    } catch {
      setStatus('error');
    }
  }

  if (status === 'success') {
    return (
      <div
        role="status"
        className="section-frame flex flex-col items-center gap-2 px-6 py-8 text-center"
      >
        <PartyPopper className="h-6 w-6 text-primary" aria-hidden="true" />
        <p className="text-lg font-extrabold tracking-tight">C&apos;est noté !</p>
        <p className="text-sm text-foreground/70">
          Vous recevrez un e-mail dès la sortie du Deck Builder. Rien d&apos;autre, promis.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate aria-label={formLabel} className="w-full max-w-md">
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Mail
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/40"
            aria-hidden="true"
          />
          <Input
            type="email"
            inputMode="email"
            autoComplete="email"
            required
            placeholder="Votre e-mail"
            aria-label={formLabel}
            aria-invalid={status === 'error'}
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (status === 'error') setStatus('idle');
            }}
            className="pl-10"
          />
        </div>
        <Button type="submit" size="lg" disabled={status === 'submitting'} className="shrink-0">
          {status === 'submitting' ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              Envoi…
            </>
          ) : (
            "M'inscrire"
          )}
        </Button>
      </div>
      {status === 'error' && (
        <p className="mt-2 text-sm font-semibold text-destructive" role="alert">
          Adresse e-mail invalide, réessayez.
        </p>
      )}
      <p className="mt-3 text-xs text-foreground/50">
        Gratuit · 1 champ · désabonnement immédiat
      </p>
    </form>
  );
}
