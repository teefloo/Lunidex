'use client';

import Link from 'next/link';
import type { AnchorHTMLAttributes, ReactNode } from 'react';
import { recordDetailReturnOrigin } from '@/lib/detail-return-navigation';

interface DetailOriginLinkProps extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href' | 'onClick'> {
  href: string;
  returnTarget: string;
  children?: ReactNode;
}

/** A detail link that prepares its validated source anchor for browser Back. */
export function DetailOriginLink({ href, returnTarget, children, ...props }: DetailOriginLinkProps) {
  return (
    <Link
      {...props}
      href={href}
      onClick={(event) => recordDetailReturnOrigin(event, returnTarget)}
    >
      {children}
    </Link>
  );
}
