'use client';

import Link from 'next/link';
import { useClientLanguage } from '@/hooks/useLocaleHref';
import LunidexLogo from '@/components/ui/LunidexLogo';

export function HeaderLogo() {
  const resolvedLang = useClientLanguage();

  return (
    <div className="site-header-brand flex min-w-0 shrink-0 items-center justify-start">
      <Link prefetch={false} href={`/${resolvedLang}`} className="site-header-brand-link group flex min-h-11 min-w-0 items-center gap-2.5 py-1">
        <div className="site-header-brand-mark shrink-0">
          <LunidexLogo alt="" sizes="28px" className="h-7 w-7 object-contain" />
        </div>
        <div className="site-header-brand-copy flex min-w-0 flex-col items-start">
          <div className="flex items-baseline leading-none tracking-tight">
            <span translate="no" className="site-header-brand-luni font-display text-[1.05rem] font-extrabold sm:text-base">Luni</span>
            <span translate="no" className="font-display text-[1.05rem] font-medium italic editorial-italic text-foreground sm:text-base">dex</span>
          </div>
        </div>
      </Link>
    </div>
  );
}
