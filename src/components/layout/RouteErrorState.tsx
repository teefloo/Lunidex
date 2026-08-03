'use client';

import Link from 'next/link';
import { AlertTriangle, Home, RefreshCw } from 'lucide-react';

import { Button, buttonVariants } from '@/components/ui/button';
import { useLocaleHref } from '@/hooks/useLocaleHref';
import { useTranslation } from '@/lib/i18n';
import { cn } from '@/lib/utils';

interface RouteErrorStateProps {
  error: Error & { digest?: string };
  reset: () => void;
  scope?: string;
}

export default function RouteErrorState({ error, reset, scope }: RouteErrorStateProps) {
  const { t } = useTranslation();
  const localeHref = useLocaleHref();

  return (
    <div className="app-page min-h-screen px-4 py-24 text-foreground">
      <section className="section-frame mx-auto flex max-w-xl flex-col items-center px-6 py-10 text-center md:px-8 md:py-12">
        <div className="mb-5 rounded-sm border border-destructive/20 bg-destructive/10 p-4 text-destructive">
          <AlertTriangle className="h-8 w-8" />
        </div>
        <p className="page-eyebrow justify-center">{scope ?? 'Lunidex'}</p>
        <h1 className="mb-3 text-2xl font-black tracking-tight">
          {t('common.error_title', { defaultValue: 'Something went wrong' })}
        </h1>
        <p className="mb-8 max-w-md text-sm leading-6 text-foreground/55">
          {t('common.error_desc', {
            defaultValue: 'Lunidex could not load this section. Please retry or return to the Pokédex.',
          })}
        </p>

        <div className="flex flex-col justify-center gap-3 sm:flex-row">
          <Button onClick={reset} className="font-black uppercase tracking-[0.16em]">
            <RefreshCw className="h-4 w-4" />
            {t('common.retry', { defaultValue: 'Retry' })}
          </Button>
          <Link
            href={localeHref('/')}
            className={cn(buttonVariants({ variant: 'outline' }), 'font-black uppercase tracking-[0.16em]')}
          >
            <Home className="h-4 w-4" />
            {t('nav.home')}
          </Link>
        </div>

        {error.digest && (
          <p className="cat-no mt-8 font-bold text-foreground/45">
            {t('common.error_id', { defaultValue: 'Error ID' })}: {error.digest}
          </p>
        )}
      </section>
    </div>
  );
}
