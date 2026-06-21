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
      
      <div className="glass-card relative w-full h-80 flex items-end justify-center gap-16 md:gap-24 overflow-hidden rounded-sm p-8">
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
              {/* Single unified adult human silhouette (front view), feet at baseline */}
              <path d="M 12 1
                C 13.38 1 14.5 2.12 14.5 3.5
                C 14.5 4.88 13.38 6 12 6
                C 10.62 6 9.5 4.88 9.5 3.5
                C 9.5 2.12 10.62 1 12 1 Z
                M 10.9 5.6
                C 9.3 5.95 8.6 6.6 8.3 7.8
                L 7.4 11.0
                L 6.9 14.2
                C 6.8 14.8 7.7 15.0 7.9 14.4
                L 9.5 9.4
                L 9.8 13.4
                L 9.1 22.6
                C 9.05 23.3 9.8 23.4 10.4 23.3
                C 11.0 23.2 11.0 22.8 11.0 22.4
                L 11.6 16.2
                L 12 15.3
                L 12.4 16.2
                L 13.0 22.4
                C 13.0 22.8 13.0 23.2 13.6 23.3
                C 14.2 23.4 14.95 23.3 14.9 22.6
                L 14.2 13.4
                L 14.5 9.4
                L 16.1 14.4
                C 16.3 15.0 17.2 14.8 17.1 14.2
                L 16.6 11.0
                L 15.7 7.8
                C 15.4 6.6 14.7 5.95 13.1 5.6 Z" />
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


