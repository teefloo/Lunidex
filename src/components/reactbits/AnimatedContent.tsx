'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { cn } from '@/lib/utils';

gsap.registerPlugin(ScrollTrigger);

export interface AnimatedContentProps {
  children: ReactNode;
  className?: string;
  delay?: number;
  distance?: number;
  direction?: 'vertical' | 'horizontal';
  threshold?: number;
}

function prefersReducedMotion() {
  return typeof window !== 'undefined'
    && typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * ReactBits AnimatedContent, adapted so server-rendered content is visible
 * before enhancement and remains visible when motion is reduced or unavailable.
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

  useEffect(() => {
    const element = ref.current;
    if (!element || prefersReducedMotion()) {
      return undefined;
    }

    const axis = direction === 'horizontal' ? 'x' : 'y';
    const fromValue = { [axis]: distance, opacity: 0 };
    const toValue = { [axis]: 0, opacity: 1 };

    try {
      const context = gsap.context(() => {
        gsap.fromTo(element, fromValue, {
          ...toValue,
          duration: 0.6,
          delay,
          ease: 'power2.out',
          immediateRender: false,
          clearProps: 'transform,opacity',
          scrollTrigger: {
            trigger: element,
            start: `top ${(1 - threshold) * 100}%`,
            once: true,
            fastScrollEnd: true,
          },
        });
      }, element);

      return () => context.revert();
    } catch {
      element.style.removeProperty('opacity');
      element.style.removeProperty('transform');
      return undefined;
    }
  }, [delay, direction, distance, threshold]);

  return (
    <div ref={ref} className={cn(className)}>
      {children}
    </div>
  );
}

export default AnimatedContent;
