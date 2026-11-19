import type { Metadata } from 'next';
import { getServerT } from '@/lib/server-i18n';

// Reset links carry a one-time credential: keep them out of search indexes
// and out of cached intermediaries entirely.
export async function generateMetadata(): Promise<Metadata> {
  const t = await getServerT();
  return {
    title: { absolute: `${t('auth.reset_title', { defaultValue: 'Change your password' })} | Lunidex` },
    robots: {
      index: false,
      follow: false,
    },
  };
}

export default function ResetPasswordLayout({ children }: { children: React.ReactNode }) {
  return children;
}
