'use client';

import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { supportedLanguages } from '@/lib/languages';

interface SkipLinkProps {
  children: ReactNode;
}

export function SkipLink({ children }: SkipLinkProps) {
  const pathname = usePathname();
  const firstSegment = pathname.split('/').filter(Boolean)[0];
  const isHome = supportedLanguages.includes(firstSegment as (typeof supportedLanguages)[number])
    && pathname.split('/').filter(Boolean).length <= 1;
  const target = isHome ? 'home-main' : 'main-content';

  return (
    <a
      href={`#${target}`}
      onClick={() => {
        window.requestAnimationFrame(() => document.getElementById(target)?.focus());
      }}
      className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[9999] focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-lg focus:font-bold"
    >
      {children}
    </a>
  );
}
