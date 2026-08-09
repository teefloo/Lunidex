import type { ReactNode } from 'react';

import { LunidexArchiveMotion } from './LunidexArchiveMotion';

interface LunidexWorldProps {
  children: ReactNode;
}

export function LunidexWorld({ children }: LunidexWorldProps) {
  return (
    <div className="lunidex-world">
      <div className="lunidex-world-backdrop" aria-hidden="true">
        <LunidexArchiveMotion />
        <div className="archive-field-halo" />
        <div className="archive-field-grid" />
        <div className="archive-field-orbit archive-field-orbit-wide" />
        <div className="archive-field-orbit archive-field-orbit-tall" />
        <div className="archive-field-mark archive-field-mark-top" />
        <div className="archive-field-mark archive-field-mark-bottom" />
      </div>
      <div className="lunidex-world-content">{children}</div>
    </div>
  );
}
