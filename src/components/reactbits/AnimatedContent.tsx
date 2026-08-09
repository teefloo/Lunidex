'use client';

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface AnimatedContentProps {
  children: ReactNode;
  className?: string;
  delay?: number;
  distance?: number;
  direction?: 'vertical' | 'horizontal';
  threshold?: number;
}

/**
 * Lightweight scroll reveal that keeps server-rendered content visible before
 * hydration and avoids shipping an animation runtime for static sections.
 */
export function AnimatedContent({
  children,
  className,
  delay = 0,
  distance = 24,
  direction = 'vertical',
  threshold = 0.12,
}: AnimatedContentProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [isEnhanced, setIsEnhanced] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) {
      return undefined;
    }

    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    const rect = element.getBoundingClientRect();
    const revealImmediately = reducedMotion
      || !('IntersectionObserver' in window)
      || rect.top <= window.innerHeight * (1 - threshold);
    const enhancementFrame = window.requestAnimationFrame(() => {
      setIsEnhanced(true);
      if (revealImmediately) setIsVisible(true);
    });

    if (revealImmediately) {
      return () => window.cancelAnimationFrame(enhancementFrame);
    }

    const observer = new IntersectionObserver(([entry]) => {
      if (!entry?.isIntersecting) return;
      setIsVisible(true);
      observer.disconnect();
    }, { rootMargin: `${Math.round(threshold * 100)}% 0px` });

    observer.observe(element);
    return () => {
      window.cancelAnimationFrame(enhancementFrame);
      observer.disconnect();
    };
  }, [delay, direction, distance, threshold]);

  const hiddenTransform = direction === 'horizontal'
    ? `translateX(${distance}px)`
    : `translateY(${distance}px)`;
  const style: CSSProperties = {
    opacity: isEnhanced && !isVisible ? 0 : 1,
    transform: isEnhanced && !isVisible ? hiddenTransform : 'translate(0, 0)',
    transitionDelay: `${delay}s`,
  };

  return <div ref={ref} style={style} className={cn('motion-safe:transition-[opacity,transform] motion-safe:duration-700 motion-safe:ease-out', className)}>{children}</div>;
}

export default AnimatedContent;
