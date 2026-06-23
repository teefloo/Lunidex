'use client';

import { usePrimeDexStore } from '@/store/primedex';
import { X, Volume2, VolumeX, Sun, Moon, Monitor, Globe, Film } from 'lucide-react';
import { DataExportImport } from '@/components/layout/DataExportImport';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from '@/lib/i18n';
import { useEffect, useRef, useCallback } from 'react';
import { useChangeLanguage } from '@/hooks/useChangeLanguage';

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
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  const handleEscape = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape' && isSettingsOpen) {
      toggleSettings();
    }
  }, [isSettingsOpen, toggleSettings]);

  useEffect(() => {
    if (isSettingsOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
      closeButtonRef.current?.focus();
      return () => {
        document.removeEventListener('keydown', handleEscape);
        document.body.style.overflow = '';
      };
    }
  }, [isSettingsOpen, handleEscape]);

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
    <AnimatePresence>
      {isSettingsOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center px-4"
          role="dialog"
          aria-modal="true"
          aria-label={t('settings.title')}
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-foreground/22 "
            onClick={toggleSettings}
          />

          <motion.div
            ref={dialogRef}
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            onClick={(e) => e.stopPropagation()}
            className="glass-surface relative w-full max-w-sm rounded-sm p-8 overflow-hidden"
          >
            <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-primary/10 to-transparent" />

            <div className="relative z-10 flex justify-between items-center mb-8 pb-4 border-b border-border/60">
              <h2 className="text-2xl font-black text-foreground tracking-tight">{t('settings.title')}</h2>
              <button
                ref={closeButtonRef}
                onClick={toggleSettings}
                className="rounded-full border border-transparent p-2 text-foreground/50 transition-colors hover:bg-muted/55 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label={t('settings.close')}
                title={t('settings.close')}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="relative z-10 space-y-8">
              {/* Sound Toggle */}
              <div className="glass-card flex items-center justify-between p-4">
                <div className="flex items-center gap-4">
                  <div className={`rounded-lg p-2.5 transition-colors ${soundEnabled ? 'text-primary bg-primary/15' : 'text-foreground/50 bg-muted/55'}`}>
                    {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
                  </div>
                  <span className="font-bold text-foreground/80">{t('settings.sound')}</span>
                </div>
                <button
                  onClick={toggleSound}
                  className={`relative w-14 h-7 rounded-full transition-colors duration-300 ${soundEnabled ? 'bg-primary' : 'bg-muted/70'}`}
                  aria-label={soundEnabled ? t('settings.sound_disable') : t('settings.sound_enable')}
                  role="switch"
                  aria-checked={soundEnabled}
                >
                  <span className={`absolute top-1 w-5 h-5 rounded-full bg-primary-foreground shadow-sm transition-all duration-300 ${soundEnabled ? 'left-8' : 'left-1'}`} />
                </button>
              </div>

              {/* Animated Sprites Toggle */}
              <div className="glass-card flex items-center justify-between p-4">
                <div className="flex items-center gap-4">
                  <div className={`rounded-lg p-2.5 transition-colors ${animatedSprites ? 'text-primary bg-primary/15' : 'text-foreground/50 bg-muted/55'}`}>
                    <Film className="w-5 h-5" />
                  </div>
                  <div className="flex flex-col">
                    <span className="font-bold text-foreground/80">{t('settings.animated_sprites')}</span>
                    <span className="text-[10px] text-foreground/40">{t('settings.animated_sprites_desc')}</span>
                  </div>
                </div>
                <button
                  onClick={toggleAnimatedSprites}
                  className={`relative w-14 h-7 rounded-full transition-colors duration-300 ${animatedSprites ? 'bg-primary' : 'bg-muted/70'}`}
                  aria-label={animatedSprites ? t('settings.animated_sprites_disable') : t('settings.animated_sprites_enable')}
                  role="switch"
                  aria-checked={animatedSprites}
                >
                  <span className={`absolute top-1 w-5 h-5 rounded-full bg-primary-foreground shadow-sm transition-all duration-300 ${animatedSprites ? 'left-8' : 'left-1'}`} />
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
                      onClick={() => setTheme(value)}
                      className={`flex-1 flex flex-col items-center gap-2 py-3 px-2 rounded-sm text-xs font-bold transition-all duration-300 ${theme === value
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
                      onClick={() => handleLanguageChange(lang.code)}
                      className={`flex items-center justify-center gap-2 py-2 px-2 rounded-sm text-xs font-bold transition-all duration-300 ${language === lang.code
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

              {/* Data Export & Import */}
              <DataExportImport />

              <div className="mt-8 pt-6 border-t border-border/50 text-center">
                <p className="text-[10px] text-foreground/30 font-bold tracking-[0.2em] uppercase">
                  {t('settings.version')}
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

