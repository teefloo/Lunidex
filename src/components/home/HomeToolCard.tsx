'use client';

import Link from 'next/link';
import { BookOpen, Users, type LucideIcon } from 'lucide-react';

export type HomeToolIcon = 'book-open' | 'users';

interface HomeToolCardProps {
  href: string;
  icon: HomeToolIcon;
  title: string;
  body: string;
}

const HOME_TOOL_ICONS: Record<HomeToolIcon, LucideIcon> = {
  'book-open': BookOpen,
  users: Users,
};

export function HomeToolCard({ href, icon, title, body }: HomeToolCardProps) {
  const Icon = HOME_TOOL_ICONS[icon];

  return (
    <Link
      href={href}
      className="group relative block h-full min-h-40 rounded-sm border border-border/70 bg-card/35 p-5 shadow-[var(--shadow-pixel-sm)] transition-[border-color,background-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:bg-primary/[0.035] hover:shadow-[var(--shadow-pixel)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-inset motion-reduce:transform-none"
    >
      <span className="flex h-11 w-11 items-center justify-center rounded-sm border border-primary/30 bg-primary/[0.08] p-2 transition-colors duration-200 group-hover:bg-primary/[0.13]">
        <Icon className="h-6 w-6 text-primary transition-transform duration-200 group-hover:-translate-y-0.5 motion-reduce:transition-none" aria-hidden="true" />
      </span>
      <h3 className="mt-5 text-xl font-black transition-colors group-hover:text-primary">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-foreground/65">{body}</p>
    </Link>
  );
}
