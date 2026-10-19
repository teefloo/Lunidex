'use client';

import Link from 'next/link';
import { useLocaleHref } from '@/hooks/useLocaleHref';
import { useTranslation } from '@/lib/i18n';
import type { TCGCardLanguage } from '@/lib/tcg-language';
import { buildTCGIllustratorPath } from '@/lib/tcg-illustrators';

export function TCGIllustratorLink({
  artist,
  tcgLanguage,
}: {
  artist: string;
  tcgLanguage: TCGCardLanguage;
}) {
  const localeHref = useLocaleHref();
  const { t } = useTranslation();

  return (
    <Link
      href={localeHref(buildTCGIllustratorPath(artist, tcgLanguage))}
      prefetch={false}
      aria-label={t('tcg.open_illustrator_cards', { artist })}
      className="inline-flex min-h-11 max-w-full items-center rounded-sm px-1 text-left text-primary underline decoration-primary/30 underline-offset-4 transition-colors hover:decoration-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
    >
      {artist}
    </Link>
  );
}
