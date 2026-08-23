'use client';

import Link, { LinkProps } from 'next/link';
import { usePathname } from 'next/navigation';
import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface HeaderLinkProps extends LinkProps {
  children: ReactNode;
  variant?: 'ghost' | 'default' | 'outline' | 'destructive';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
}

export function HeaderLink({ children, href, variant, size, className, ...props }: HeaderLinkProps) {
  const pathname = usePathname();
  const targetPath = typeof href === 'string' ? href.split('?')[0] : null;
  const isActive = Boolean(
    targetPath &&
      (pathname === targetPath || (targetPath !== '/' && pathname.startsWith(`${targetPath}/`))),
  );

  return (
    <Link
      href={href}
      prefetch={false}
      aria-current={isActive ? 'page' : undefined}
      data-active={isActive ? 'true' : undefined}
      className={cn(
        'touch-target inline-flex items-center justify-center whitespace-nowrap rounded-sm border border-transparent text-sm font-semibold transition-[color,background-color,border-color,box-shadow,transform,opacity] duration-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50',
        variant === 'ghost' && 'hover:border-border/60 hover:bg-muted/70 hover:text-foreground',
        isActive && 'border-primary/25 bg-primary/10 text-primary',
        size === 'sm' && 'min-h-11 px-4 text-xs tracking-[0.16em] uppercase',
        className
      )}
      {...props}
    >
      {children}
    </Link>
  );
}
