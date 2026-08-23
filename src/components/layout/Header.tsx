'use client';

import { HeaderLogo } from './HeaderLogo';
import { HeaderDesktopNav } from './HeaderDesktopNav';
import { HeaderActions } from './HeaderActions';
import { HeaderMobileNav } from './HeaderMobileNav';

export default function Header() {
  return (
    <header className="site-header fixed inset-x-0 top-0 z-50 pt-[env(safe-area-inset-top)]">
      <div className="site-header-bar mx-auto flex w-full max-w-[92rem] items-center gap-3 px-4 sm:px-6 lg:px-8">
        <HeaderLogo />
        <HeaderDesktopNav />
        <div className="site-header-utilities flex shrink-0 items-center justify-end gap-1 sm:gap-1.5">
          <HeaderActions />
          <HeaderMobileNav />
        </div>
      </div>
    </header>
  );
}
