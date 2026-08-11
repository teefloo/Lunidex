import type { ComponentProps, ReactNode } from 'react';
import { HomeFieldLabMotion } from './HomeFieldLabMotion';
import { HomeFieldLabStage } from './HomeFieldLabStage';

interface HomeFieldWorldProps {
  children: ReactNode;
  chapterNav: Array<{ id: string; label: string }>;
  chapterNavLabel: string;
  stageCopy: ComponentProps<typeof HomeFieldLabStage>['copy'];
}

export function HomeFieldWorld({ children, chapterNav, chapterNavLabel, stageCopy }: HomeFieldWorldProps) {
  return (
    <div className="home-field-world" data-field-world>
      <HomeFieldLabMotion />
      <nav className="field-chapter-nav" aria-label={chapterNavLabel}>
        <span className="field-chapter-nav-label">{chapterNavLabel}</span>
        <ol className="field-chapter-nav-list">
          {chapterNav.map((chapter, index) => (
            <li key={chapter.id}>
              <a
                href={`#${chapter.id}`}
                data-field-chapter-nav-link
                data-field-chapter-nav-index={index}
                aria-current={index === 0 ? 'step' : 'false'}
              >
                <span aria-hidden="true">0{index + 1}</span>
                {chapter.label}
              </a>
            </li>
          ))}
        </ol>
      </nav>
      <div className="home-field-stage-wrap" aria-hidden="true">
        <HomeFieldLabStage copy={stageCopy} />
      </div>
      <div className="home-field-story">{children}</div>
    </div>
  );
}
