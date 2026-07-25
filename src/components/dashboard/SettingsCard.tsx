'use client';

import { usePrimeDexStore } from '@/store/primedex';
import { useTranslation } from '@/lib/i18n';
import { Settings, Volume2, VolumeX, Film } from 'lucide-react';

export default function SettingsCard() {
  const { t } = useTranslation();
  const soundEnabled = usePrimeDexStore(s => s.soundEnabled);
  const toggleSound = usePrimeDexStore(s => s.toggleSound);
  const animatedSprites = usePrimeDexStore(s => s.animatedSprites);
  const toggleAnimatedSprites = usePrimeDexStore(s => s.toggleAnimatedSprites);

  return (
    <div className="glass-card p-6">
      <div className="flex items-center gap-3 mb-5 pb-4 border-b border-border/40">
        <div className="p-2 rounded-sm text-foreground/70 bg-secondary/30 border border-border/50">
          <Settings className="w-5 h-5" />
        </div>
        <h3 className="text-lg font-black text-foreground/90">{t('settings.title')}</h3>
      </div>

      <div className="space-y-4">
        {/* Sound Toggle */}
        <div className="flex items-center justify-between p-3 rounded-sm bg-secondary/20 border border-border/40">
          <div className="flex items-center gap-3">
            <div className={`rounded-lg p-2 transition-colors ${soundEnabled ? 'text-primary bg-primary/15' : 'text-foreground/50 bg-muted/55'}`}>
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </div>
            <span className="text-sm font-bold text-foreground/80">{t('settings.sound')}</span>
          </div>
          <button
            onClick={toggleSound}
            className={`relative w-12 h-6 rounded-full transition-colors duration-300 ${soundEnabled ? 'bg-primary' : 'bg-muted/70'}`}
            aria-label={soundEnabled ? t('settings.sound_disable') : t('settings.sound_enable')}
            role="switch"
            aria-checked={soundEnabled}
          >
            <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-primary-foreground shadow-sm transition-all duration-300 ${soundEnabled ? 'left-6' : 'left-0.5'}`} />
          </button>
        </div>

        {/* Animated Sprites Toggle */}
        <div className="flex items-center justify-between p-3 rounded-sm bg-secondary/20 border border-border/40">
          <div className="flex items-center gap-3">
            <div className={`rounded-lg p-2 transition-colors ${animatedSprites ? 'text-primary bg-primary/15' : 'text-foreground/50 bg-muted/55'}`}>
              <Film className="w-4 h-4" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-bold text-foreground/80">{t('settings.animated_sprites')}</span>
              <span className="text-[11px] text-foreground/40">{t('settings.animated_sprites_desc')}</span>
            </div>
          </div>
          <button
            onClick={toggleAnimatedSprites}
            className={`relative w-12 h-6 rounded-full transition-colors duration-300 ${animatedSprites ? 'bg-primary' : 'bg-muted/70'}`}
            aria-label={animatedSprites ? t('settings.animated_sprites_disable') : t('settings.animated_sprites_enable')}
            role="switch"
            aria-checked={animatedSprites}
          >
            <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-primary-foreground shadow-sm transition-all duration-300 ${animatedSprites ? 'left-6' : 'left-0.5'}`} />
          </button>
        </div>
      </div>
    </div>
  );
}
