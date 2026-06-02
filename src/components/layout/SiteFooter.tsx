'use client';

import Link from 'next/link';
import {
  ArrowUpRight,
  Github,
  Globe,
  ShieldCheck,
  Sparkles,
  BookOpenText,
  Route,
  Swords,
  Users,
  Shapes,
  BrainCircuit,
  LayoutGrid,
  Heart,
} from 'lucide-react';
import { motion } from 'framer-motion';

import { useTranslation } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import PrimeDexLogo from '@/components/ui/PrimeDexLogo';
import { GITHUB_REPO_URL } from '@/lib/site';

type FooterLink = {
  href: string;
  label: string;
  external?: boolean;
  icon: typeof ArrowUpRight;
};

type FooterSection = {
  title: string;
  caption?: string;
  links: FooterLink[];
};

function FooterAction({
  href,
  label,
  external = false,
  icon: Icon,
}: FooterLink) {
  const className = cn(
    'group inline-flex items-center justify-between gap-2 rounded-md border border-foreground/15 bg-background/30 px-3 py-1.5 text-left text-[12px] font-semibold text-foreground/70 transition-all duration-300 hover:border-primary/35 hover:bg-background/55 hover:text-foreground'
  );

  if (external) {
    return (
      <a href={href} target="_blank" rel="noreferrer" className={className}>
        <span className="flex min-w-0 items-center gap-2">
          <Icon className="h-3.5 w-3.5 shrink-0 text-foreground/40 transition-colors group-hover:text-primary" />
          <span className="truncate">{label}</span>
        </span>
        <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-foreground/30 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-primary" />
      </a>
    );
  }

  return (
    <Link href={href} className={className}>
      <span className="flex min-w-0 items-center gap-2">
        <Icon className="h-3.5 w-3.5 shrink-0 text-foreground/40 transition-colors group-hover:text-primary" />
        <span className="truncate">{label}</span>
      </span>
      <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-foreground/30 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-primary" />
    </Link>
  );
}

function FooterSectionCard({ title, caption, links }: FooterSection) {
  return (
    <div className="codex-frame flex flex-col gap-3 p-5">
      <div className="flex flex-col gap-1">
        <span className="cat-no text-[0.55rem] text-muted-foreground/70">Section</span>
        <h2 className="font-display text-base font-semibold tracking-tight text-foreground/90" style={{ fontVariationSettings: '"opsz" 24' }}>
          {title}
        </h2>
        {caption && (
          <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-muted-foreground/70">
            {caption}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        {links.map((link) => (
          <FooterAction key={`${link.href}-${link.label}`} {...link} />
        ))}
      </div>
    </div>
  );
}

export default function SiteFooter() {
  const { t } = useTranslation();
  const year = new Date().getFullYear();

  const navigationLinks: FooterLink[] = [
    { href: '/', label: t('nav.home'), icon: Route },
    { href: '/team', label: t('nav.team'), icon: Users },
    { href: '/compare', label: t('nav.compare'), icon: Swords },
    { href: '/tcg', label: t('nav.tcg'), icon: LayoutGrid },
    { href: '/types', label: t('nav.types'), icon: Shapes },
    { href: '/moves', label: t('nav.moves'), icon: Swords },
    { href: '/quiz', label: t('nav.quiz'), icon: BrainCircuit },
    { href: '/favorites', label: t('nav.favorites'), icon: Heart },
  ];

  const resourceLinks: FooterLink[] = [
    { href: 'https://pokeapi.co/', label: t('footer.resources.pokeapi'), icon: Globe, external: true },
    { href: 'https://tcgdex.de/', label: t('footer.resources.tcgdex'), icon: Sparkles, external: true },
    { href: GITHUB_REPO_URL, label: t('footer.resources.github'), icon: Github, external: true },
  ];

  const legalLinks: FooterLink[] = [
    { href: '/privacy', label: t('footer.legal.privacy'), icon: ShieldCheck },
    { href: '/terms', label: t('footer.legal.terms'), icon: BookOpenText },
  ];

  return (
    <footer className="relative z-0 mt-24 border-t border-foreground/10">
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 py-12 md:py-16">
        <motion.div
          className="codex-frame relative overflow-hidden px-5 py-8 md:px-8 md:py-10"
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/45 to-transparent" />

          <div className="mb-8 flex flex-col gap-2">
            <p className="page-eyebrow flex items-center gap-3 text-muted-foreground/90">
              <span aria-hidden="true" className="h-px w-6 bg-current opacity-60" />
              <span>Colophon · Imprint</span>
            </p>
            <h2 className="font-display text-2xl md:text-3xl font-extrabold tracking-[-0.01em] text-foreground" style={{ fontVariationSettings: '"opsz" 60' }}>
              {t('footer.brand.title', { defaultValue: 'About this volume' })}
            </h2>
          </div>

          <div className="relative z-0 grid gap-5 sm:grid-cols-2 lg:grid-cols-[1.15fr_0.85fr_0.85fr]">
            <motion.div
              whileHover={{ y: -2 }}
              transition={{ type: 'spring', stiffness: 260, damping: 24 }}
              className="codex-frame relative z-0 flex flex-col gap-4 p-5"
            >
              <div className="flex items-center gap-3">
                <PrimeDexLogo className="h-10 w-10 shrink-0 drop-shadow-[0_0_18px_rgba(190,93,72,0.28)]" />
                <div className="flex flex-col">
                  <div className="flex items-baseline">
                    <span className="font-display text-lg font-extrabold gradient-text-hero" style={{ fontVariationSettings: '"opsz" 144' }}>
                      Prime
                    </span>
                    <span className="font-display text-lg font-medium italic editorial-italic text-foreground/90" style={{ fontVariationSettings: '"opsz" 144' }}>
                      Dex
                    </span>
                  </div>
                  <span className="text-[9px] font-mono uppercase tracking-[0.24em] text-muted-foreground/70">
                    {t('footer.brand.mission')}
                  </span>
                </div>
              </div>

              <p className="max-w-md text-sm leading-7 text-foreground/68">
                {t('footer.brand.description')}
              </p>

              <div className="flex flex-wrap items-center gap-2">
                <span className="cat-no text-[0.55rem] text-muted-foreground/70 mr-1">Compiled from</span>
                {[
                  t('footer.resources.pokeapi'),
                  t('footer.resources.tcgdex'),
                  t('footer.resources.github'),
                ].map((label) => (
                  <span key={label} className="rounded-sm border border-foreground/15 bg-background/30 px-2.5 py-1 text-[9px] font-mono uppercase tracking-[0.18em] text-foreground/65">
                    {label}
                  </span>
                ))}
              </div>
            </motion.div>

            <FooterSectionCard
              title={t('footer.navigation.title')}
              caption="§ I — Index"
              links={navigationLinks}
            />
            <FooterSectionCard
              title={t('footer.resources.title')}
              caption="§ II — Sources"
              links={resourceLinks}
            />
          </div>

          <div className="relative z-0 mt-6 flex flex-col gap-5 border-t border-dashed border-foreground/15 pt-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex flex-col gap-3">
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-foreground/55">
                {t('home.footer_copyright', { year })}
              </p>
              <p className="max-w-3xl text-sm leading-7 text-foreground/65">
                {t('footer.disclaimer.text')}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <span className="cat-no text-[0.55rem] text-muted-foreground/70">§ III — Legal</span>
              <div className="flex flex-wrap gap-2">
                {legalLinks.map((link) => (
                  <FooterAction key={`${link.href}-${link.label}`} {...link} />
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </footer>
  );
}
