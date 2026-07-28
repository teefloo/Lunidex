'use client';

import { usePrimeDexStore } from '@/store/primedex';
import { Volume2, VolumeX, Sun, Moon, Monitor, Globe, Film } from 'lucide-react';
import { DataExportImport } from '@/components/layout/DataExportImport';
import { GenThemeSelector } from '@/components/settings/GenThemeSelector';
import { useTranslation } from '@/lib/i18n';
import { useChangeLanguage } from '@/hooks/useChangeLanguage';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export default function SettingsModal() {
  const isSettingsOpen = usePrimeDexStore(s => s.isSettingsOpen);
  const toggleSettings = usePrimeDexStore(s => s.toggleSettings);
  const soundEnabled = usePrimeDexStore(s => s.soundEnabled);
  const toggleSound = usePrimeDexStore(s => s.toggleSound);
  const animatedSprites = usePrimeDexStore(s => s.animatedSprites);
  const toggleAnimatedSprites = usePrimeDexStore(s => s.toggleAnimatedSprites);
  const theme = usePrimeDexStore(s => s.theme);
  const setTheme = usePrimeDexStore(s => s.setTheme);
  const language = usePrimeDexStore(s => s.language);
  const { t } = useTranslation();
  const changeLanguage = useChangeLanguage();

  const themeOptions = [
    { value: 'light' as const, label: t('settings.light'), icon: Sun },
    { value: 'dark' as const, label: t('settings.dark'), icon: Moon },
    { value: 'system' as const, label: t('settings.system'), icon: Monitor },
  ];

  const handleLanguageChange = (code: string) => {
    changeLanguage(code);
  };

  const languageOptions = [
    { code: 'auto', name: t('languages.auto'), flag: '🌐' },
    { code: 'en', name: t('languages.en'), flag: '🇺🇸' },
    { code: 'fr', name: t('languages.fr'), flag: '🇫🇷' },
    { code: 'de', name: t('languages.de'), flag: '🇩🇪' },
    { code: 'es', name: t('languages.es'), flag: '🇪🇸' },
    { code: 'it', name: t('languages.it'), flag: '🇮🇹' },
    { code: 'ja', name: t('languages.ja'), flag: '🇯🇵' },
    { code: 'ko', name: t('languages.ko'), flag: '🇰🇷' },
    { code: 'zh', name: t('languages.zh'), flag: '🇨🇳' },
  ];

  return (
    <Dialog
      open={isSettingsOpen}
      onOpenChange={(open) => {
        if (!open && isSettingsOpen) toggleSettings();
      }}
    >
      <DialogContent className="max-w-sm rounded-sm p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] sm:p-8">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-primary/10 to-transparent" />

            <DialogHeader className="relative z-10 mb-8 border-b border-border/60 pb-4">
              <DialogTitle className="text-2xl font-black tracking-tight text-foreground">{t('settings.title')}</DialogTitle>
              <DialogDescription className="sr-only">{t('settings.title')}</DialogDescription>
            </DialogHeader>

            <div className="relative z-10 space-y-8">
              {/* Sound Toggle */}
              <div className="glass-card flex items-center justify-between p-4">
                <div className="flex items-center gap-4">
                  <div className={`rounded-lg p-2.5 transition-colors ${soundEnabled ? 'text-foreground bg-primary/15' : 'text-foreground/50 bg-muted/55'}`}>
                    {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
                  </div>
                  <span className="font-bold text-foreground/80">{t('settings.sound')}</span>
                </div>
                <button
                  type="button"
                  onClick={toggleSound}
                  className="touch-target flex h-11 w-14 shrink-0 items-center justify-center rounded-sm border-transparent bg-transparent p-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                  aria-label={soundEnabled ? t('settings.sound_disable') : t('settings.sound_enable')}
                  role="switch"
                  aria-checked={soundEnabled}
                >
                  <span className={`relative block h-7 w-12 rounded-full border border-foreground/15 transition-[background-color,border-color] duration-300 ${soundEnabled ? 'border-primary/60 bg-primary' : 'bg-muted/70'}`}>
                    <span className={`absolute top-1 left-1 h-5 w-5 rounded-full bg-primary-foreground shadow-sm transition-transform duration-300 ${soundEnabled ? 'translate-x-5' : ''}`} />
                  </span>
                </button>
              </div>

              {/* Animated Sprites Toggle */}
              <div className="glass-card flex items-center justify-between p-4">
                <div className="flex items-center gap-4">
                  <div className={`rounded-lg p-2.5 transition-colors ${animatedSprites ? 'text-foreground bg-primary/15' : 'text-foreground/50 bg-muted/55'}`}>
                    <Film className="w-5 h-5" />
                  </div>
                  <div className="flex flex-col">
                    <span className="font-bold text-foreground/80">{t('settings.animated_sprites')}</span>
                    <span className="text-[11px] text-foreground/40">{t('settings.animated_sprites_desc')}</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={toggleAnimatedSprites}
                  className="touch-target flex h-11 w-14 shrink-0 items-center justify-center rounded-sm border-transparent bg-transparent p-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                  aria-label={animatedSprites ? t('settings.animated_sprites_disable') : t('settings.animated_sprites_enable')}
                  role="switch"
                  aria-checked={animatedSprites}
                >
                  <span className={`relative block h-7 w-12 rounded-full border border-foreground/15 transition-[background-color,border-color] duration-300 ${animatedSprites ? 'border-primary/60 bg-primary' : 'bg-muted/70'}`}>
                    <span className={`absolute top-1 left-1 h-5 w-5 rounded-full bg-primary-foreground shadow-sm transition-transform duration-300 ${animatedSprites ? 'translate-x-5' : ''}`} />
                  </span>
                </button>
              </div>

              {/* Theme Selector */}
              <div className="space-y-4">
                <div className="flex items-center gap-4 mb-4">
                  <div className="p-2.5 rounded-sm text-foreground/70 bg-secondary/30 border border-border/50">
                    <Monitor className="w-5 h-5" />
                  </div>
                  <span className="font-bold text-foreground/80">{t('settings.theme')}</span>
                </div>
                <div className="glass-card flex gap-3 p-2">
                  {themeOptions.map(({ value, label, icon: Icon }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setTheme(value)}
                      className={`touch-target flex min-h-11 flex-1 flex-col items-center gap-2 rounded-sm px-2 py-3 text-xs font-bold transition-[color,background-color,box-shadow] duration-300 ${theme === value
                        ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20'
                        : 'text-foreground/50 hover:bg-muted/55 hover:text-foreground/80'
                        }`}
                      aria-pressed={theme === value}
                    >
                      <Icon className="w-5 h-5" />
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Language Selector */}
              <div className="space-y-4">
                <div className="flex items-center gap-4 mb-4">
                  <div className="p-2.5 rounded-sm text-foreground/70 bg-secondary/30 border border-border/50">
                    <Globe className="w-5 h-5" />
                  </div>
                  <span className="font-bold text-foreground/80">{t('settings.language')}</span>
                </div>
                <div className="glass-card grid grid-cols-3 gap-2 p-2">
                  {languageOptions.map((lang) => (
                    <button
                      key={lang.code}
                      type="button"
                      onClick={() => handleLanguageChange(lang.code)}
                      className={`touch-target flex min-h-11 items-center justify-center gap-2 rounded-sm px-2 py-2 text-xs font-bold transition-[color,background-color,box-shadow] duration-300 ${language === lang.code
                        ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20'
                        : 'text-foreground/50 hover:bg-muted/55 hover:text-foreground/80'
                        }`}
                      title={lang.name}
                      aria-label={t('settings.language_option', { language: lang.name })}
                    >
                      <span className="text-base leading-none">{lang.flag}</span>
                      <span className="uppercase">{lang.code === 'auto' ? t('settings.auto') : lang.code}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Generation Theme Selector */}
              <GenThemeSelector />

              {/* Data Export & Import */}
              <DataExportImport />

              <div className="mt-8 pt-6 border-t border-border/50 text-center">
                <p className="text-[11px] text-foreground/30 font-bold tracking-[0.2em] uppercase">
                  {t('settings.version')}
                </p>
              </div>
            </div>
      </DialogContent>
    </Dialog>
  );
}
