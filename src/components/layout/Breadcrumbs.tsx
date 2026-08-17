import Link from 'next/link';
import { ChevronRight, Home } from 'lucide-react';

import { cn } from '@/lib/utils';

export type BreadcrumbItem = {
  label: string;
  href?: string;
};

type BreadcrumbsProps = {
  items: BreadcrumbItem[];
  homeLabel?: string;
  className?: string;
};

/** Visual counterpart to the route's server-rendered BreadcrumbList JSON-LD. */
export function Breadcrumbs({ items, homeLabel = 'Home', className }: BreadcrumbsProps) {
  if (items.length === 0) return null;

  return (
    <nav aria-label="Breadcrumb" className={cn('page-shell px-5 pt-24 md:px-8', className)}>
      <ol className="flex flex-wrap items-center gap-y-2 text-xs font-medium text-foreground/50">
        {items.map((item, index) => {
          const isCurrent = index === items.length - 1 || !item.href;
          return (
            <li key={`${item.href ?? item.label}-${index}`} className="flex min-w-0 items-center">
              {index > 0 && <ChevronRight aria-hidden="true" className="mx-2 h-3.5 w-3.5 shrink-0 text-foreground/25" />}
              {isCurrent ? (
                <span aria-current="page" className="max-w-[min(70vw,28rem)] truncate font-semibold text-foreground/80">
                  {index === 0 && <Home aria-hidden="true" className="mr-1.5 inline-block h-3.5 w-3.5 align-[-0.15em]" />}
                  {index === 0 ? homeLabel : item.label}
                </span>
              ) : (
                <Link
                  href={item.href!}
                  className="inline-flex min-h-9 items-center rounded-sm px-1 outline-none transition-colors hover:text-primary focus-visible:ring-2 focus-visible:ring-ring/40"
                >
                  {index === 0 && <Home aria-hidden="true" className="mr-1.5 h-3.5 w-3.5" />}
                  {index === 0 ? homeLabel : item.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
