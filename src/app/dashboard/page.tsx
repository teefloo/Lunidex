'use client';

import Header from '@/components/layout/Header';
import PageHeader from '@/components/layout/PageHeader';
import Link from 'next/link';
import DashboardSkeleton from '@/components/dashboard/DashboardSkeleton';
import AccountCard from '@/components/dashboard/AccountCard';
import ProfileAndBadges from '@/components/dashboard/ProfileAndBadges';
import QuizStatistics from '@/components/dashboard/QuizStatistics';
import PokedexProgress from '@/components/dashboard/PokedexProgress';
import ActivityHeatMap from '@/components/dashboard/ActivityHeatMap';
import GeneralActivity from '@/components/dashboard/GeneralActivity';
import ExtensibleSection from '@/components/dashboard/ExtensibleSection';
import { useDashboardData } from '@/hooks/useDashboardData';
import { BarChart3, AlertCircle, Users, Settings } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
import { useEffect, useState } from 'react';
import { usePrimeDexStore } from '@/store/primedex';
import { useLocaleHref } from '@/hooks/useLocaleHref';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/neon/AuthProvider';

export default function DashboardPage() {
  const { t } = useTranslation();
  const localeHref = useLocaleHref();
  const incrementVisit = usePrimeDexStore((state) => state.incrementVisit);
  const toggleSettings = usePrimeDexStore((state) => state.toggleSettings);
  const { enabled } = useAuth();
  const [accountExpanded, setAccountExpanded] = useState(false);
  const { data, isLoading, isError } = useDashboardData();

  useEffect(() => {
    incrementVisit();
  }, [incrementVisit]);

  return (
    <div className="app-page relative overflow-hidden">
      <Header />

      <main className="page-shell py-8 relative z-10 mt-16 md:mt-20">
        <PageHeader
          icon={BarChart3}
          title={t('dashboard.title')}
          subtitle={t('dashboard.subtitle')}
          eyebrow={null}
          variant="compact"
        />

        <div className="mb-6 flex flex-wrap gap-2">
          <Link href={localeHref('/friends')} className="dashboard-quick-link">
            <Users aria-hidden="true" className="h-4 w-4" />
            {t('friends.title', { defaultValue: 'Friends' })}
          </Link>
          <Button type="button" variant="outline" onClick={toggleSettings} className="dashboard-quick-link">
            <Settings aria-hidden="true" className="h-4 w-4" />
            {t('nav.settings', { defaultValue: 'Settings' })}
          </Button>
        </div>

        {isLoading ? (
          <DashboardSkeleton />
        ) : isError || !data ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="p-5 rounded-full bg-destructive/10 mb-4">
              <AlertCircle className="w-10 h-10 text-destructive" />
            </div>
            <p className="text-sm font-semibold text-foreground/60">{t('dashboard.errors.load_failed')}</p>
          </div>
        ) : (
          <>
            <section className="glass-card mb-6 rounded-sm p-4 sm:p-5" aria-labelledby="dashboard-overview-title">
              <h2 id="dashboard-overview-title" className="text-sm font-bold text-foreground">
                {t('dashboard.overview_heading')}
              </h2>
              <dl className="mt-4 grid gap-3 sm:grid-cols-3">
                <div className="min-w-0 rounded-sm border border-border/40 bg-muted/20 p-3">
                  <dt className="text-xs font-semibold text-foreground/55">{t('dashboard.pokedex.title')}</dt>
                  <dd className="mt-1 text-lg font-black tabular-nums text-foreground">
                    {data.pokedex.caughtPercent}%
                  </dd>
                  <p className="text-xs text-foreground/50">
                    {t('dashboard.pokedex.progress', {
                      count: data.pokedex.caughtCount,
                      total: data.pokedex.totalPokemon,
                    })}
                  </p>
                </div>
                <div className="min-w-0 rounded-sm border border-border/40 bg-muted/20 p-3">
                  <dt className="text-xs font-semibold text-foreground/55">{t('dashboard.extensible.tcg_owned')}</dt>
                  <dd className="mt-1 text-lg font-black tabular-nums text-foreground">
                    {data.extensible.find((metric) => metric.id === 'tcg-owned')?.value ?? 0}
                  </dd>
                </div>
                <div className="min-w-0 rounded-sm border border-border/40 bg-muted/20 p-3">
                  <dt className="text-xs font-semibold text-foreground/55">{t('dashboard.badges.title')}</dt>
                  <dd className="mt-1 text-lg font-black tabular-nums text-foreground">
                    {t('dashboard.badges.count', {
                      count: data.badges.unlocked.length,
                      total: data.badges.all.length,
                    })}
                  </dd>
                </div>
              </dl>
            </section>

            <div className="dashboard-sections">
              <details className="dashboard-section">
                <summary>
                  <span>{t('dashboard.section_progression')}</span>
                </summary>
                <div className="dashboard-section-content">
                  <ProfileAndBadges data={data} />
                  <PokedexProgress data={data} />
                  <ExtensibleSection metrics={data.extensible} />
                </div>
              </details>

              <details className="dashboard-section">
                <summary>
                  <span>{t('dashboard.section_quiz')}</span>
                </summary>
                <div className="dashboard-section-content">
                  <QuizStatistics data={data} />
                </div>
              </details>

              <details className="dashboard-section">
                <summary>
                  <span>{t('dashboard.section_activity')}</span>
                </summary>
                <div className="dashboard-section-content">
                  <ActivityHeatMap />
                  <GeneralActivity data={data} />
                </div>
              </details>
            </div>
          </>
        )}

        {enabled && (
          <details
            className="dashboard-section mt-6"
            onToggle={(event) => setAccountExpanded(event.currentTarget.open)}
          >
            <summary>
              <span>{t('dashboard.account_section')}</span>
            </summary>
            {accountExpanded && (
              <div className="dashboard-section-content">
                <AccountCard />
              </div>
            )}
          </details>
        )}
      </main>
    </div>
  );
}
