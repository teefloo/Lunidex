'use client';

import dynamic from 'next/dynamic';
import { useState } from 'react';
import { AuthModalBoundary } from '@/components/auth/AuthModalBoundary';
import { useAuth } from '@/lib/neon/AuthProvider';
import { useTranslation } from '@/lib/i18n';
import { trackProductEvent } from '@/lib/product-measurement';
import type { TCGCardLanguage } from '@/lib/tcg-language';

const AuthModal = dynamic(() => import('@/components/auth/AuthModal'), { ssr: false });

export function TCGDemoNotice({ setId, language }: { setId: string; language: TCGCardLanguage }) {
  const { t } = useTranslation();
  const { enabled } = useAuth();
  const [authOpen, setAuthOpen] = useState(false);

  return (
    <div className="mt-4 space-y-3 border-t border-primary/20 pt-4">
      <p className="text-sm font-bold text-foreground">{t('tcg.demo.notice')}</p>
      <p className="max-w-2xl text-sm leading-6 text-foreground/65">{t('tcg.demo.reset_notice')}</p>
      <button
        type="button"
        disabled={!enabled}
        onClick={() => {
          void trackProductEvent('tcg_demo_signup_clicked', undefined, undefined, { set_id: setId, tcg_language: language });
          setAuthOpen(true);
        }}
        className="inline-flex min-h-12 items-center justify-center rounded-sm bg-primary px-4 py-3 text-left text-sm font-black text-primary-foreground hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {t('tcg.demo.signup')}
      </button>
      {!enabled && <p className="text-sm text-muted-foreground">{t('tcg.demo.auth_unavailable')}</p>}
      {authOpen && (
        <AuthModalBoundary onClose={() => setAuthOpen(false)}>
          <AuthModal open initialMode="signup" onOpenChange={setAuthOpen} />
        </AuthModalBoundary>
      )}
    </div>
  );
}
