'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { useTranslation } from '@/lib/i18n';

import Image from 'next/image';

interface HeightComparisonProps {
  pokemonHeight: number; // in decimeters
  pokemonName: string;
  pokemonImage: string;
}

export function HeightComparison({ pokemonHeight, pokemonName, pokemonImage }: HeightComparisonProps) {
  const { t } = useTranslation();
  const prefersReducedMotion = useReducedMotion();
  
  // Convert to meters
  const heightInMeters = pokemonHeight / 10;
  const humanHeight = 1.7; // Average human height in meters

  // Scale factor to fit both in the 200px container
  const scale = 180 / Math.max(humanHeight, heightInMeters);
  
  const humanDisplayHeight = humanHeight * scale;
  const pokemonDisplayHeight = heightInMeters * scale;

  return (
    <div className="w-full flex flex-col items-center">
      <h3 className="text-xl font-black mb-10 text-foreground/90 border-b border-border/60 pb-4 w-full text-center uppercase tracking-widest">
        {t('detail.size_comparison')}
      </h3>
      
      <div className="glass-card relative w-full h-80 flex items-end justify-center gap-16 md:gap-24 overflow-hidden rounded-2xl p-8">
        {/* Background Grid/Scanline effect */}
        <div className="absolute inset-0 opacity-10 pointer-events-none" 
          style={{ 
            backgroundImage: `linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)`,
            backgroundSize: '20px 20px'
          }} 
        />
        
        {/* Human Side */}
        <div className="flex flex-col items-center z-10">
          <motion.div
            initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative flex items-end justify-center"
            style={{ height: 200 }}
          >
            <svg 
              viewBox="0 0 24 24" 
              style={{ height: humanDisplayHeight }}
              className="fill-foreground/20 dark:fill-foreground/15 drop-shadow-[0_0_10px_rgba(255,255,255,0.05)]"
              role="img"
              aria-label={t('detail.human')}
            >
              <circle cx="12" cy="3" r="2" />
              <path d="M 9 5.5 Q 7 7 7 11 L 7 16 Q 7 17 8 17 L 9 17 Q 10 17 10 16 L 10 8 Q 10 9.5 11 10.5 Q 10.5 12.5 10.5 14 L 10.5 21 L 10.5 22.5 L 11.8 22.5 L 11.8 14 L 12.2 14 L 12.2 22.5 L 13.5 22.5 L 13.5 21 L 13.5 14 Q 13.5 12.5 13 10.5 Q 14 9.5 14 8 L 14 16 Q 14 17 15 17 L 17 17 Q 17 16 17 16 L 17 11 Q 17 7 15 5.5 Z" />
            </svg>
            
            {/* Measurement Line */}
            <div className="absolute right-[-20px] bottom-0 w-px bg-foreground/20" style={{ height: humanDisplayHeight }}>
              <div className="absolute top-0 right-0 w-2 h-px bg-foreground/20" />
              <div className="absolute bottom-0 right-0 w-2 h-px bg-foreground/20" />
            </div>
          </motion.div>
          <div className="mt-6 text-center">
            <p className="text-[10px] font-black uppercase tracking-widest text-foreground/40 mb-1">{t('detail.human')}</p>
            <p className="text-sm font-black text-foreground/60">{humanHeight.toFixed(1)}m</p>
          </div>
        </div>

        {/* Pokemon Side */}
        <div className="flex flex-col items-center z-10">
          <motion.div
            initial={prefersReducedMotion ? false : { opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ delay: prefersReducedMotion ? 0 : 0.3, type: "spring", stiffness: 100 }}
            className="relative flex items-end justify-center"
            style={{ height: 200 }}
          >
            <motion.div
              style={{ height: pokemonDisplayHeight, width: pokemonDisplayHeight }}
              className="relative brightness-0 opacity-20 dark:opacity-30 drop-shadow-[0_0_15px_rgba(227,53,13,0.3)]"
              animate={prefersReducedMotion ? undefined : { 
                opacity: [0.2, 0.4, 0.2],
              }}
              transition={prefersReducedMotion ? undefined : { 
                duration: 3, 
                repeat: Infinity,
                ease: "easeInOut" 
              }}
            >
              <Image
                src={pokemonImage}
                alt={pokemonName}
                fill
                sizes="180px"
                className="object-contain"
              />
            </motion.div>
            
            {/* Measurement Line */}
            <div className="absolute left-[-20px] bottom-0 w-px bg-primary/40" style={{ height: pokemonDisplayHeight }}>
              <div className="absolute top-0 left-0 w-2 h-px bg-primary/40" />
              <div className="absolute bottom-0 left-0 w-2 h-px bg-primary/40" />
            </div>
          </motion.div>
          
          <div className="mt-6 text-center">
            <p className="text-[10px] font-black uppercase tracking-widest text-primary/60 mb-1 capitalize">{pokemonName}</p>
            <p className="text-sm font-black text-primary">{heightInMeters.toFixed(1)}m</p>
          </div>
        </div>

        {/* Ground Line */}
        <div className="absolute bottom-24 left-1/2 -translate-x-1/2 w-3/4 h-px bg-gradient-to-r from-transparent via-foreground/10 to-transparent" />
      </div>
      
      <p className="mt-6 text-[10px] text-foreground/30 font-bold uppercase tracking-[0.2em] text-center max-w-xs">
        {heightInMeters > humanHeight
          ? t('detail.height_taller', { name: pokemonName })
          : t('detail.height_shorter', { name: pokemonName })}
      </p>
    </div>
  );
}


