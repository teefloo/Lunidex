import Link from 'next/link';
import { BookOpen, Users } from 'lucide-react';
import { getServerLanguage, getServerT } from '@/lib/server-i18n';
import { localeHref } from '@/lib/seo';

export default async function HomeGameTools() {
  const [t, language] = await Promise.all([getServerT(), getServerLanguage()]);
  const tools = [
    { href: '/pokedex', icon: BookOpen, title: t('lunidex_home.tools_pokedex_title', { defaultValue: 'Explore the Pokédex' }), body: t('lunidex_home.tools_pokedex_body', { defaultValue: 'Browse Pokémon, their types, stats, and evolutions.' }) },
    { href: '/team', icon: Users, title: t('lunidex_home.tools_team_title', { defaultValue: 'Build a team' }), body: t('lunidex_home.tools_team_body', { defaultValue: 'Create a team and check its type coverage.' }) },
  ];

  return (
    <section className="mx-auto w-full max-w-6xl px-5 py-12 md:px-8 md:py-16" aria-labelledby="game-tools-title">
      <p className="text-xs font-black uppercase tracking-[0.2em] text-primary">{t('lunidex_home.tools_eyebrow', { defaultValue: 'Game tools' })}</p>
      <h2 id="game-tools-title" className="mt-3 text-3xl font-black tracking-tight md:text-4xl">{t('lunidex_home.tools_title', { defaultValue: 'Explore Pokémon. Build your team.' })}</h2>
      <p className="mt-3 max-w-2xl text-base leading-7 text-foreground/65">{t('lunidex_home.tools_body', { defaultValue: 'Browse the Pokédex and prepare balanced teams in the same place.' })}</p>
      <div className="mt-7 grid gap-4 md:grid-cols-2">
        {tools.map((tool) => <Link key={tool.href} href={localeHref(tool.href, language)} className="group rounded-sm border border-border/60 bg-card/40 p-5 transition-colors hover:border-primary/45 hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60">
          <tool.icon className="h-6 w-6 text-primary" aria-hidden="true" />
          <h3 className="mt-5 text-xl font-black group-hover:text-primary">{tool.title}</h3>
          <p className="mt-2 text-sm leading-6 text-foreground/65">{tool.body}</p>
        </Link>)}
      </div>
    </section>
  );
}
