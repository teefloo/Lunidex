'use client';

import { HeaderLogo } from './HeaderLogo';
import { HeaderDesktopNav } from './HeaderDesktopNav';
import { HeaderActions } from './HeaderActions';
import { HeaderMobileNav } from './HeaderMobileNav';

export default function Header() {
  return (
    <header className="fixed left-0 right-0 top-[calc(0.5rem+env(safe-area-inset-top))] z-50 flex justify-center px-3 md:top-[calc(0.75rem+env(safe-area-inset-top))] md:px-4">
      <div className="relative">
        <div className="glass-toolbar codex-frame header-toolbar inline-flex max-w-[calc(100vw-1.5rem)] items-center gap-1.5 px-3 py-2 shadow-[var(--shadow-pixel)] max-[479px]:gap-0 max-[479px]:px-2 min-[480px]:w-full min-[480px]:justify-between min-[480px]:px-4 md:max-w-[calc(100vw-3rem)] lg:w-fit lg:justify-start">
          <HeaderLogo />
          <HeaderDesktopNav />
          <div className="flex shrink-0 items-center justify-end gap-1 max-[479px]:gap-0 md:gap-1.5">
            <HeaderActions />
            <HeaderMobileNav />
          </div>
        </div>
      </div>
    </header>
  );
}
