'use client';

import Header from '@/components/layout/Header';
import PageHeader from '@/components/layout/PageHeader';
import DashboardSkeleton from '@/components/dashboard/DashboardSkeleton';
import AccountCard from '@/components/dashboard/AccountCard';
import SettingsCard from '@/components/dashboard/SettingsCard';
import ProfileAndBadges from '@/components/dashboard/ProfileAndBadges';
import QuizStatistics from '@/components/dashboard/QuizStatistics';
import PokedexProgress from '@/components/dashboard/PokedexProgress';
import ActivityHeatMap from '@/components/dashboard/ActivityHeatMap';
import GeneralActivity from '@/components/dashboard/GeneralActivity';
import ExtensibleSection from '@/components/dashboard/ExtensibleSection';
import { useDashboardData } from '@/hooks/useDashboardData';
import { BarChart3, AlertCircle } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
import { useEffect } from 'react';
import { usePrimeDexStore } from '@/store/primedex';

export default function DashboardPage() {
  const { t } = useTranslation();
  const { incrementVisit } = usePrimeDexStore();
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
          eyebrow={t('dashboard.eyebrow')}
        />

        <div className="mb-6">
          <AccountCard />
        </div>

        <div className="mb-6">
          <SettingsCard />
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
          <div className="space-y-6">
            {/* Row 1: Profile + Quiz */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <ProfileAndBadges data={data} />
              <div className="lg:col-span-2">
                <QuizStatistics data={data} />
              </div>
            </div>

            {/* Row 2: Pokedex */}
            <PokedexProgress data={data} />

            {/* Row 2.5: Activity Heat Map */}
            <ActivityHeatMap />

            {/* Row 3: Activity + Extensible */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <GeneralActivity data={data} />
              <ExtensibleSection metrics={data.extensible} />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
