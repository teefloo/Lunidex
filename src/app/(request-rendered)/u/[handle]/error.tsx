'use client';

import RouteErrorState from '@/components/layout/RouteErrorState';

export default function ProfileError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <RouteErrorState error={error} reset={reset} scope="Public Profile" />;
}
