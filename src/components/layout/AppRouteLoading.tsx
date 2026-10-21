'use client';

import Header from '@/components/layout/Header';
import { Skeleton } from '@/components/ui/skeleton';
import { useTranslation } from '@/lib/i18n';

export function AppRouteLoading({ variant = 'detail' }: { variant?: 'detail' | 'list' }) {
  const { t } = useTranslation();

  return (
    <div className="app-page">
      <Header />
      <main id="main-content" tabIndex={-1} className="page-shell page-shell--header-offset relative pb-32 outline-none">
        <div aria-busy="true" role="status" className="mx-auto w-full max-w-6xl space-y-6">
          <span className="sr-only">{t('common.loading')}</span>
          <div className="space-y-3">
            <Skeleton className="h-3 w-24 rounded-sm" />
            <Skeleton className="h-9 w-2/3 max-w-xl rounded-sm" />
            <Skeleton className="h-4 w-full max-w-2xl rounded-sm" />
          </div>
          {variant === 'detail' ? (
            <div className="grid gap-5 lg:grid-cols-[minmax(0,1.3fr)_minmax(16rem,0.7fr)]">
              <Skeleton className="min-h-[22rem] rounded-sm" />
              <div className="space-y-4">
                <Skeleton className="h-32 rounded-sm" />
                <Skeleton className="h-40 rounded-sm" />
              </div>
            </div>
          ) : (
            <>
              <Skeleton className="h-14 rounded-sm" />
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 6 }).map((_, index) => <Skeleton key={index} className="h-52 rounded-sm" />)}
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
