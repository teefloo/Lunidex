'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { MouseEvent, ReactNode } from 'react';
import { parsePokemonReturnTarget } from '@/lib/pokemon-filter-url';
import { DETAIL_RETURN_TARGET_KEY } from '@/lib/detail-return-navigation';

interface ValidatedBackLinkProps {
  href: string;
  className?: string;
  children: ReactNode;
}

/** Return to a validated internal list context without adding a detail/list history loop. */
export function ValidatedBackLink({ href, className, children }: ValidatedBackLinkProps) {
  const router = useRouter();

  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const target = parsePokemonReturnTarget(href);
    if (!target) return;

    event.preventDefault();
    let previousEntryMatches = false;
    try {
      const rememberedTarget = window.sessionStorage.getItem(DETAIL_RETURN_TARGET_KEY);
      window.sessionStorage.removeItem(DETAIL_RETURN_TARGET_KEY);
      previousEntryMatches = rememberedTarget === target && window.history.length > 1;
    } catch {
      previousEntryMatches = false;
    }

    if (previousEntryMatches) router.back();
    else router.replace(target);
  };

  return <Link href={href} className={className} onClick={handleClick}>{children}</Link>;
}
