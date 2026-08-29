'use client';

import { useEffect, useState } from 'react';
import { ArrowUp } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { useTranslation } from '@/lib/i18n';

export function BackToTopButton() {
  const { t } = useTranslation();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    let frameId: number | null = null;

    const updateVisibility = () => {
      frameId = null;
      const viewportHeight = window.innerHeight;
      const documentHeight = Math.max(
        document.documentElement.scrollHeight,
        document.body.scrollHeight,
      );
      const hasRoomToScrollBack = documentHeight - viewportHeight > viewportHeight;
      const nextIsVisible = hasRoomToScrollBack && window.scrollY > viewportHeight;

      setIsVisible((currentIsVisible) => (
        currentIsVisible === nextIsVisible ? currentIsVisible : nextIsVisible
      ));
    };

    const scheduleVisibilityUpdate = () => {
      if (frameId !== null) return;
      frameId = window.requestAnimationFrame(updateVisibility);
    };

    updateVisibility();
    window.addEventListener('scroll', scheduleVisibilityUpdate, { passive: true });
    window.addEventListener('resize', scheduleVisibilityUpdate);

    const resizeObserver = typeof ResizeObserver === 'undefined'
      ? null
      : new ResizeObserver(scheduleVisibilityUpdate);
    resizeObserver?.observe(document.documentElement);
    resizeObserver?.observe(document.body);

    return () => {
      window.removeEventListener('scroll', scheduleVisibilityUpdate);
      window.removeEventListener('resize', scheduleVisibilityUpdate);
      resizeObserver?.disconnect();
      if (frameId !== null) window.cancelAnimationFrame(frameId);
    };
  }, []);

  if (!isVisible) return null;

  const label = t('legal.common.back_to_top', { defaultValue: 'Back to top' });

  const handleClick = () => {
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    document.getElementById('main-content')?.focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
  };

  return (
    <Button
      type="button"
      variant="outline"
      size="icon-touch"
      aria-label={label}
      title={label}
      onClick={handleClick}
      className="fixed right-[max(1rem,env(safe-area-inset-right))] bottom-[calc(5rem+env(safe-area-inset-bottom))] z-40 rounded-full border-primary/35 bg-card/90 text-primary shadow-[var(--shadow-pixel-sm)] backdrop-blur-md hover:border-primary/65 hover:bg-primary/10 hover:text-primary focus-visible:ring-ring/50"
    >
      <ArrowUp aria-hidden="true" className="size-5" strokeWidth={2.5} />
    </Button>
  );
}
