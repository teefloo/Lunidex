'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import { toast } from '@/lib/toast';
import { useTranslation } from '@/lib/i18n';
import { getSyncAccessStatus, onSyncAccessRequired } from '@/store/sync-access';
import { useAuth } from '@/lib/neon/AuthProvider';
import { AuthModalBoundary } from './AuthModalBoundary';

const AuthModal = dynamic(() => import('./AuthModal'), { ssr: false });

/** Opens the existing account flow when a syncable action is attempted. */
export function SyncAuthPrompt() {
  const { enabled, user } = useAuth();
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  useEffect(() => onSyncAccessRequired(() => {
    const status = getSyncAccessStatus();
    if (!enabled || (!user && status === 'unauthenticated')) {
      toast.error(t('auth.signin_subtitle', {
        defaultValue: 'Sign in to save and sync your data.',
      }));
      return;
    }
    if (status === 'unavailable') {
      toast.error(t('auth.session_unavailable', {
        defaultValue: 'Your online data is temporarily unavailable. Please try again.',
      }));
      return;
    }
    if (status === 'checking' || status === 'loading') {
      toast.error(t('auth.session_unavailable', {
        defaultValue: 'Your online session is still loading. Please try again in a moment.',
      }));
      return;
    }
    setOpen(true);
  }), [enabled, t, user]);

  if (!open) return null;

  return (
    <AuthModalBoundary onClose={() => setOpen(false)}>
      <AuthModal open onOpenChange={setOpen} />
    </AuthModalBoundary>
  );
}
