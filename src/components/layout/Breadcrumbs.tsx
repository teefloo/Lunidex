'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight, Home } from 'lucide-react';
import { useEffect, useMemo } from 'react';
import { useTranslation } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { SITE_URL } from '@/lib/site';

export function Breadcrumbs() {
  const pathname = usePathname();
  const { t } = useTranslation();
  const baseUrl = SITE_URL;

  const pathSegments = useMemo(() => pathname.split('/').filter(Boolean), [pathname]);
  const shouldHide = pathname === '/' || pathname.startsWith('/pokemon/');

  const breadcrumbs = useMemo(() => [
    { label: t('nav.home'), href: '/', icon: true },
    ...pathSegments.map((segment) => {
      const href = `/${pathSegments.slice(0, pathSegments.indexOf(segment) + 1).join('/')}`;

      let label = segment;
      if (segment === 'pokemon') label = t('list.pokemon');
      else if (segment.match(/^[0-9]+$/)) label = `#${segment}`;
      else label = segment.charAt(0).toUpperCase() + segment.slice(1);

      return { label, href, icon: false };
    })
  ], [pathSegments, t]);

  const jsonLdId = 'breadcrumb-jsonld';

  useEffect(() => {
    let el = document.getElementById(jsonLdId) as HTMLScriptElement | null;
    if (shouldHide) {
      el?.remove();
      return;
    }

    const breadcrumbJsonLd = {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: breadcrumbs.map((crumb, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: crumb.label,
        item: `${baseUrl}${crumb.href}`,
      })),
    };

    if (!el) {
      el = document.createElement('script');
      el.id = jsonLdId;
      el.type = 'application/ld+json';
      document.head.appendChild(el);
    }
    el.textContent = JSON.stringify(breadcrumbJsonLd);
    return () => { el?.remove(); };
  }, [breadcrumbs, shouldHide, baseUrl]);

  if (shouldHide) return null;

  return (
    <>
      <nav
        aria-label="Breadcrumb"
        className="w-full relative z-40 bg-background/60  border-b border-border/40"
      >
        <div className="container mx-auto px-6 md:px-12 pt-24 pb-4">
          <ol className="flex items-center space-x-2 list-none p-0 m-0 text-[10px] md:text-xs font-medium text-foreground/30">
            {breadcrumbs.map((crumb, index) => (
              <li key={crumb.href} className="flex items-center">
                {index > 0 && <ChevronRight className="w-3 h-3 mx-1.5 opacity-20" />}
                <Link
                  href={crumb.href}
                  className={cn(
                    "hover:text-primary transition-colors flex items-center gap-1.5",
                    index === breadcrumbs.length - 1 ? "text-foreground/60 font-bold pointer-events-none" : ""
                  )}
                  aria-current={index === breadcrumbs.length - 1 ? "page" : undefined}
                >
                  {crumb.icon && <Home className="w-3 h-3" />}
                  {crumb.label}
                </Link>
              </li>
            ))}
          </ol>
        </div>
      </nav>
    </>
  );
}
