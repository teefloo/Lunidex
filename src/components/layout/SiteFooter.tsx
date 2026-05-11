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
  links: FooterLink[];
};

function FooterAction({
  href,
  label,
  external = false,
  icon: Icon,
}: FooterLink) {
  const className = cn(
    'group inline-flex items-center justify-between gap-2 rounded-full border border-border/50 bg-card/55 px-3 py-2 text-left text-sm font-semibold text-foreground/70 backdrop-blur-xl transition-all duration-300 hover:border-primary/25 hover:bg-card/75 hover:text-foreground'
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

function FooterSectionCard({ title, links }: FooterSection) {
  return (
    <div className="glass-card flex flex-col gap-3 p-5">
      <div className="flex items-center gap-2">
        <div className="h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_10px_rgba(227,53,13,0.35)]" />
        <h2 className="text-xs font-black uppercase tracking-[0.24em] text-foreground/55">{title}</h2>
      </div>

      <div className="flex flex-col gap-2">
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
    <footer className="relative z-0 mt-24 border-t border-border/50">
      <div className="page-shell py-12 md:py-16">
        <motion.div
          className="section-frame relative overflow-hidden px-5 py-8 md:px-8 md:py-10"
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/35 to-transparent" />

          <div className="relative z-0 grid gap-5 lg:grid-cols-[1.15fr_0.85fr_0.85fr]">
            <motion.div
              whileHover={{ y: -2 }}
              transition={{ type: 'spring', stiffness: 260, damping: 24 }}
              className="glass-card relative z-0 flex flex-col gap-4 p-5"
            >
              <div className="flex items-center gap-3">
                <PrimeDexLogo className="h-10 w-10 shrink-0 drop-shadow-[0_0_18px_rgba(227,53,13,0.24)]" />
                <div className="flex flex-col">
                  <span className="text-lg font-black tracking-tight">
                    <span className="gradient-text-primary">Prime</span>
                    <span className="text-foreground">Dex</span>
                  </span>
                  <span className="text-[10px] font-black uppercase tracking-[0.24em] text-foreground/30">
                    {t('footer.brand.mission')}
                  </span>
                </div>
              </div>

              <p className="max-w-md text-sm leading-7 text-foreground/68">
                {t('footer.brand.description')}
              </p>

              <div className="flex flex-wrap gap-2">
                <span className="rounded-full border border-border/50 bg-card/55 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-foreground/45">
                  {t('footer.resources.pokeapi')}
                </span>
                <span className="rounded-full border border-border/50 bg-card/55 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-foreground/45">
                  {t('footer.resources.tcgdex')}
                </span>
                <span className="rounded-full border border-border/50 bg-card/55 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-foreground/45">
                  {t('footer.resources.github')}
                </span>
              </div>
            </motion.div>

            <FooterSectionCard title={t('footer.navigation.title')} links={navigationLinks} />
            <FooterSectionCard title={t('footer.resources.title')} links={resourceLinks} />
          </div>

          <div className="relative z-0 mt-6 flex flex-col gap-5 border-t border-border/60 pt-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex flex-col gap-3">
              <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-foreground/35">
                {t('home.footer_copyright', { year })}
              </p>
              <p className="max-w-3xl text-sm leading-7 text-foreground/58">
                {t('footer.disclaimer.text')}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
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
