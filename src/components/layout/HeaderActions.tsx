'use client';

import { Search } from 'lucide-react';
import { useMounted } from '@/hooks/useMounted';
import { useTranslation } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import AccountMenu from '@/components/auth/AccountMenu';

type HeaderActionsPlacement = 'toolbar' | 'sheet';

interface HeaderActionsProps {
  placement?: HeaderActionsPlacement;
  onInteraction?: () => void;
  onRequestAuth?: () => void;
}

export function HeaderActions({ placement = 'toolbar', onInteraction, onRequestAuth }: HeaderActionsProps = {}) {
  const mounted = useMounted();
  const { t } = useTranslation();
  const isSheet = placement === 'sheet';

  const isMac = mounted && typeof navigator !== 'undefined' && navigator.platform.startsWith('Mac');

  const label = (key: string, fallback: string) => {
    const translated = t(key, { defaultValue: fallback });
    return translated === key ? fallback : translated;
  };

  const searchLabel = label('command_palette.title', 'Search');
  const searchPlaceholder = label('search.placeholder', 'Search Pokémon (name or id)…').replace(/\.\.\./g, '…');
  const baseActionClass = isSheet ? 'site-header-sheet-action' : 'site-header-action';

  return (
    <div className={isSheet ? 'site-header-sheet-actions-grid' : 'site-header-actions-list'}>
      {!isSheet ? (
        <button
          type="button"
          onClick={() => window.dispatchEvent(new CustomEvent('primedex:open-command-palette'))}
          aria-label={searchLabel}
          title={searchPlaceholder}
          className={cn(baseActionClass, 'site-header-search-action')}
        >
          <Search aria-hidden="true" className="h-4 w-4" />
          <span className="sr-only">{searchLabel}</span>
          <kbd className="site-header-shortcut hidden rounded-sm px-1.5 py-0.5 font-mono text-[10px] font-bold 2xl:inline-flex">
            {isMac ? '⌘K' : 'Ctrl+K'}
          </kbd>
        </button>
      ) : null}

      <AccountMenu
        className={cn(!isSheet && 'hidden', isSheet && 'site-header-sheet-action site-header-sheet-account')}
        showLabel={isSheet}
        onInteraction={onInteraction}
        onRequestAuth={onRequestAuth}
      />
    </div>
  );
}
