'use client';

import { usePrimeDexStore } from '@/store/primedex';
import { Heart } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/lib/i18n';
import { useMounted } from '@/hooks/useMounted';

export default function FavoriteToggle() {
  const showFavoritesOnly = usePrimeDexStore(s => s.showFavoritesOnly);
  const setShowFavoritesOnly = usePrimeDexStore(s => s.setShowFavoritesOnly);
  const favorites = usePrimeDexStore(s => s.favorites);
  const { t } = useTranslation();
  const mounted = useMounted();
  const favoritesLabel = mounted ? t('favorites.toggle', { count: favorites.length }) : `Favorites (${favorites.length})`;

  return (
    <button
      type="button"
      onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
      aria-label={favoritesLabel}
      className={cn(
        "flex items-center justify-center gap-2 px-5 min-h-[44px] rounded-sm text-[11px] font-black uppercase tracking-wider transition-all duration-100 border shadow-[var(--shadow-pixel-sm)] hover:-translate-x-px hover:-translate-y-px active:translate-x-0.5 active:translate-y-0.5 active:shadow-none",
        showFavoritesOnly
          ? "text-primary-foreground border-[color-mix(in_oklab,var(--action-favorite)_55%,transparent)] bg-[var(--action-favorite)] shadow-[2px_2px_0_color-mix(in_oklab,var(--action-favorite)_45%,transparent)]"
          : "bg-card text-foreground/70 hover:text-foreground/90 border-border/60 hover:border-border"
      )}
    >
      <Heart className={cn("w-3.5 h-3.5 transition-all", showFavoritesOnly && "fill-current")} />
      <span>{favoritesLabel}</span>
    </button>
  );
}
