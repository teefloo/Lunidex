'use client';

import type { ReactNode } from 'react';
import AnimatedContent from '@/components/reactbits/AnimatedContent';

interface HomeMotionSectionProps {
  children: ReactNode;
  className?: string;
  delay?: number;
}

export function HomeMotionSection({ children, className, delay = 0 }: HomeMotionSectionProps) {
  return (
    <AnimatedContent className={className} delay={delay} distance={20} threshold={0.08}>
      {children}
    </AnimatedContent>
  );
}
