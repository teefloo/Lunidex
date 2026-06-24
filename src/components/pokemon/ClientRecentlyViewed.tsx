'use client';

import dynamic from 'next/dynamic';
import { Skeleton } from '@/components/ui/skeleton';
import { usePrimeDexStore } from '@/store/primedex';
import { useMounted } from '@/hooks/useMounted';

const RecentlyViewed = dynamic(() => import('@/components/pokemon/RecentlyViewed'), {
  ssr: false,
  loading: () => (
    <section className="mx-auto w-full max-w-6xl px-4 sm:px-2 mt-12" aria-hidden="true">
      <div className="flex items-end justify-between mb-6 gap-4">
        <div className="flex flex-col gap-2">
          <p className="page-eyebrow flex items-center gap-3 text-muted-foreground/90">
            <span aria-hidden="true" className="h-px w-6 bg-current opacity-60" />
            <span>Appendix · Field Notes</span>
          </p>
          <h2 className="page-title font-display text-2xl md:text-3xl font-extrabold tracking-[-0.01em] text-foreground" style={{ fontVariationSettings: '"opsz" 60' }}>
            Recently catalogued
          </h2>
        </div>
        <Skeleton className="h-8 w-24 rounded-sm" />
      </div>
      <div className="rule-line mb-6" aria-hidden="true" />
      <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-3">
        {Array.from({ length: 10 }).map((_, idx) => (
          <div key={idx} className="codex-frame p-2.5 flex flex-col items-center text-center gap-1.5">
            <Skeleton className="h-10 w-10 rounded-sm" />
            <div className="space-y-1 w-full">
              <Skeleton className="h-2 w-6 rounded-sm mx-auto" />
              <Skeleton className="h-2.5 w-12 rounded-sm mx-auto" />
            </div>
          </div>
        ))}
      </div>
    </section>
  ),
});

export default function ClientRecentlyViewed() {
  const mounted = useMounted();
  const history = usePrimeDexStore(s => s.history);

  if (!mounted || history.length === 0) {
    return null;
  }

  return <RecentlyViewed />;
}
