import type { ComponentProps, ReactNode } from 'react';
import { HomeFieldLabMotion } from './HomeFieldLabMotion';
import { HomeFieldLabStage } from './HomeFieldLabStage';

interface HomeFieldWorldProps {
  children: ReactNode;
  stageCopy: ComponentProps<typeof HomeFieldLabStage>['copy'];
}

export function HomeFieldWorld({ children, stageCopy }: HomeFieldWorldProps) {
  return (
    <div className="home-field-world" data-field-world>
      <HomeFieldLabMotion />
      <div className="home-field-stage-wrap" aria-hidden="true">
        <HomeFieldLabStage copy={stageCopy} />
      </div>
      <div className="home-field-story">{children}</div>
    </div>
  );
}
