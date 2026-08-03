'use client';

import { motion, useReducedMotion } from 'framer-motion';
import type { ReactNode } from 'react';

interface EmptyStateMotionProps {
  children: ReactNode;
  className?: string;
}

export default function EmptyStateMotion({ children, className }: EmptyStateMotionProps) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, scale: 0.95 }}
      animate={reduceMotion ? undefined : { opacity: 1, scale: 1 }}
      transition={reduceMotion ? undefined : { duration: 0.5 }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
