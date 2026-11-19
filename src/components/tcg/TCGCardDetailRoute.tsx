'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import type { TCGCard } from '@/types/tcg';
import type { TCGCardLanguage } from '@/lib/tcg-language';
import { isSupportedLanguage } from '@/lib/languages';
import { useLocaleHref } from '@/hooks/useLocaleHref';
import { useTranslation } from '@/lib/i18n';
import { TCGCardDetailContent } from './TCGCardDetailContent';

function normalizeReturnPath(pathname: string): string {
  const segments = pathname.split(/[?#]/, 1)[0]?.split('/').filter(Boolean) ?? [];
  if (segments[0] && isSupportedLanguage(segments[0])) segments.shift();
  return segments.length > 0 ? `/${segments.join('/')}` : '/';
}

export function getQueryReturnHref(
  searchParams: Readonly<URLSearchParams>,
  localeHref: (path: string) => string,
): string | undefined {
  const from = searchParams.get('from');
  if (from && from.startsWith('/') && !from.startsWith('//')) {
    try {
      const base = new URL('https://lunidex.invalid');
      const target = new URL(from, base);
      const path = normalizeReturnPath(target.pathname);
      if (target.origin === base.origin && path.startsWith('/tcg') && !path.startsWith('/tcg/cards/')) {
        return localeHref(`${path}${target.search}`);
      }
    } catch {
      // Ignore malformed return paths and use the set/catalog fallback.
    }
  }

  const hasCatalogState = ['q', 'set', 'view', 'sortBy', 'sortOrder'].some((key) => searchParams.has(key));
  if (!hasCatalogState) return undefined;
  const params = new URLSearchParams();
  searchParams.forEach((value, key) => {
    if (key !== 'from') params.append(key, value);
  });
  return localeHref(`/tcg${params.size > 0 ? `?${params.toString()}` : ''}`);
}

function CardBackLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      prefetch={false}
      className="glass-control mb-6 inline-flex min-h-11 items-center gap-2 px-4 py-2 text-xs font-black uppercase tracking-[0.2em] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
    >
      <ArrowLeft aria-hidden="true" className="h-4 w-4" />
      {label}
    </Link>
  );
}

function QueryAwareCardBackLink({
  returnHref,
  fallbackHref,
  label,
  localeHref,
}: {
  returnHref?: string;
  fallbackHref: string;
  label: string;
  localeHref: (path: string) => string;
}) {
  const searchParams = useSearchParams();
  const href = returnHref ?? getQueryReturnHref(searchParams, localeHref) ?? fallbackHref;
  return <CardBackLink href={href} label={label} />;
}

export function TCGCardDetailRoute({
  card,
  tcgLanguage = 'en',
  returnHref,
}: {
  card: TCGCard | null;
  tcgLanguage?: TCGCardLanguage;
  returnHref?: string;
}) {
  const localeHref = useLocaleHref();
  const { t } = useTranslation();
  const fallbackHref = card?.set?.id
    ? localeHref(`/tcg/sets/${encodeURIComponent(card.set.id)}?tcgLang=${encodeURIComponent(tcgLanguage)}`)
    : localeHref(`/tcg?tcgLang=${encodeURIComponent(tcgLanguage)}`);
  const backLabel = t('common.back');

  return (
    <div className="app-page">
      <main className="page-shell pb-24 pt-8">
        <Suspense fallback={<CardBackLink href={returnHref ?? fallbackHref} label={backLabel} />}>
          <QueryAwareCardBackLink
            returnHref={returnHref}
            fallbackHref={fallbackHref}
            label={backLabel}
            localeHref={localeHref}
          />
        </Suspense>
        {card ? (
          <TCGCardDetailContent card={card} tcgLanguage={tcgLanguage} presentation="page" />
        ) : (
          <div className="glass-surface rounded-sm p-8 text-center">
            <h1 className="text-3xl font-black">{t('tcg.no_cards')}</h1>
            <p className="mt-3 text-muted-foreground">{t('tcg.no_cards_desc')}</p>
          </div>
        )}
      </main>
    </div>
  );
}
