'use client';

import { usePrimeDexStore } from '@/store/primedex';
import { Heart } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/lib/i18n';
import { useMounted } from '@/hooks/useMounted';

export default function FavoriteToggle() {
  const { showFavoritesOnly, setShowFavoritesOnly, favorites } = usePrimeDexStore();
  const { t } = useTranslation();
  const mounted = useMounted();
  const favoritesLabel = mounted ? t('favorites.toggle', { count: favorites.length }) : `Favorites (${favorites.length})`;

  return (
    <button
      type="button"
      onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
      aria-label={favoritesLabel}
      className={cn(
        "flex items-center justify-center gap-2 px-5 min-h-[44px] rounded-full text-[11px] font-black uppercase tracking-wider transition-all duration-400 border hover:scale-105 active:scale-95",
        showFavoritesOnly
          ? "bg-rose-500 text-primary-foreground border-rose-400/50 shadow-[0_4px_20px_-4px_rgba(244,63,94,0.5)]"
          : "bg-card/50 backdrop-blur-xl text-foreground/70 hover:text-foreground/90 border-border/50 hover:border-border/70"
      )}
    >
      <Heart className={cn("w-3.5 h-3.5 transition-all", showFavoritesOnly && "fill-current scale-110")} />
      <span>{favoritesLabel}</span>
    </button>
  );
}
