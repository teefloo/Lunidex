'use client';

import Header from '@/components/layout/Header';
import PageHeader from '@/components/layout/PageHeader';
import Link from 'next/link';
import DashboardSkeleton from '@/components/dashboard/DashboardSkeleton';
import AccountCard from '@/components/dashboard/AccountCard';
import SettingsCard from '@/components/dashboard/SettingsCard';
import ProfileAndBadges from '@/components/dashboard/ProfileAndBadges';
import QuizStatistics from '@/components/dashboard/QuizStatistics';
import PokedexProgress from '@/components/dashboard/PokedexProgress';
import ActivityHeatMap from '@/components/dashboard/ActivityHeatMap';
import GeneralActivity from '@/components/dashboard/GeneralActivity';
import ExtensibleSection from '@/components/dashboard/ExtensibleSection';
import FriendPrivacyCard from '@/components/friends/FriendPrivacyCard';
import { useDashboardData } from '@/hooks/useDashboardData';
import { BarChart3, AlertCircle, Users } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
import { useEffect } from 'react';
import { usePrimeDexStore } from '@/store/primedex';
import { useLocaleHref } from '@/hooks/useLocaleHref';

export default function DashboardPage() {
  const { t } = useTranslation();
  const localeHref = useLocaleHref();
  const incrementVisit = usePrimeDexStore((state) => state.incrementVisit);
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
        />

        <div className="mb-6">
          <AccountCard />
        </div>

        <div className="mb-6">
          <FriendPrivacyCard />
        </div>

        <div className="mb-6">
          <Link href={localeHref('/friends')} className="glass-card flex items-center gap-3 rounded-sm p-5 transition-colors hover:border-primary/30 hover:bg-primary/5">
            <span className="rounded-sm border border-primary/20 bg-primary/10 p-2 text-primary"><Users className="h-5 w-5" /></span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-black text-foreground/85">{t('friends.title', { defaultValue: 'Friends' })}</span>
              <span className="block text-xs text-foreground/50">{t('friends.subtitle', { defaultValue: 'Manage friends and explore shared TCG collections.' })}</span>
            </span>
          </Link>
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
