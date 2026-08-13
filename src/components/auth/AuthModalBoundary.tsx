'use client';

import { Component, useEffect, useRef, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw, X } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';

interface AuthModalBoundaryProps {
  children: ReactNode;
  onClose: () => void;
}

interface AuthModalBoundaryState {
  hasError: boolean;
}

function AuthModalLoadError({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    containerRef.current?.focus();
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-foreground/25 p-4"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="auth-load-error-title"
      aria-describedby="auth-load-error-description"
    >
      <div
        ref={containerRef}
        tabIndex={-1}
        className="glass-surface w-full max-w-sm space-y-4 p-5 outline-none"
      >
        <div className="flex items-start gap-3">
          <span className="rounded-sm border border-destructive/20 bg-destructive/10 p-2 text-destructive">
            <AlertTriangle className="h-5 w-5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h2 id="auth-load-error-title" className="font-black tracking-tight">
              {t('auth.load_error_title', { defaultValue: 'Sign-in unavailable' })}
            </h2>
            <p id="auth-load-error-description" className="mt-1 text-sm leading-6 text-muted-foreground">
              {t('auth.load_error_desc', {
                defaultValue: 'The sign-in form could not load. Please retry or close this dialog and try again.',
              })}
            </p>
          </div>
        </div>

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            className="glass-btn inline-flex min-h-11 items-center justify-center gap-2 px-4 text-xs font-black uppercase tracking-[0.14em]"
          >
            <X className="h-4 w-4" aria-hidden="true" />
            {t('common.close', { defaultValue: 'Close' })}
          </button>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="glass-btn inline-flex min-h-11 items-center justify-center gap-2 bg-primary px-4 text-xs font-black uppercase tracking-[0.14em] text-primary-foreground hover:bg-primary/90"
          >
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            {t('common.retry', { defaultValue: 'Retry' })}
          </button>
        </div>
      </div>
    </div>
  );
}

/** Keeps a failed lazy auth chunk from taking down the current route. */
export class AuthModalBoundary extends Component<AuthModalBoundaryProps, AuthModalBoundaryState> {
  state: AuthModalBoundaryState = { hasError: false };

  static getDerivedStateFromError(): AuthModalBoundaryState {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) return <AuthModalLoadError onClose={this.props.onClose} />;
    return this.props.children;
  }
}
