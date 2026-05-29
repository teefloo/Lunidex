import type { Metadata } from 'next';
import { t } from '@/lib/server-i18n';

export const metadata: Metadata = {
  title: t('capabilities.dashboard.title'),
  description: t('capabilities.dashboard.subtitle'),
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
