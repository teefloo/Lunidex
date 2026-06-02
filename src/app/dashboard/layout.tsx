import type { Metadata } from 'next';
import { getServerT } from '@/lib/server-i18n';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getServerT();
  return {
    title: t('capabilities.dashboard.title'),
    description: t('capabilities.dashboard.subtitle'),
  };
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
