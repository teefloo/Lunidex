'use client';

import { HeaderLogo } from './HeaderLogo';
import { HeaderDesktopNav } from './HeaderDesktopNav';
import { HeaderActions } from './HeaderActions';
import { HeaderMobileNav } from './HeaderMobileNav';

export default function Header() {
  return (
    <header className="fixed left-0 right-0 top-2 z-50 flex justify-center px-3 md:top-3 md:px-4">
      <div className="relative">
        <div className="glass-toolbar codex-frame inline-flex w-fit max-w-[calc(100vw-1.5rem)] items-center gap-1.5 px-3 py-2 md:max-w-[calc(100vw-3rem)] md:px-4 shadow-[var(--shadow-pixel)]">
          <HeaderLogo />
          <HeaderDesktopNav />
          <div className="flex shrink-0 items-center justify-end gap-1 md:gap-1.5">
            <HeaderActions />
            <HeaderMobileNav />
          </div>
        </div>
      </div>
    </header>
  );
}
