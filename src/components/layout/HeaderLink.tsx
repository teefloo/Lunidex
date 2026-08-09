'use client';

import Link, { LinkProps } from 'next/link';
import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface HeaderLinkProps extends LinkProps {
  children: ReactNode;
  variant?: 'ghost' | 'default' | 'outline' | 'destructive';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
}

export function HeaderLink({ children, href, variant, size, className, ...props }: HeaderLinkProps) {
  return (
    <Link
      href={href}
      prefetch={false}
      className={cn(
        'touch-target inline-flex items-center justify-center whitespace-nowrap rounded-sm border border-transparent text-sm font-semibold transition-[color,background-color,border-color,box-shadow,transform,opacity] duration-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50',
        variant === 'ghost' && 'hover:border-border/60 hover:bg-muted/70 hover:text-foreground',
        size === 'sm' && 'min-h-11 px-4 text-xs tracking-[0.16em] uppercase',
        className
      )}
      {...props}
    >
      {children}
    </Link>
  );
}
