import { getServerLanguage, getServerT } from '@/lib/server-i18n';
import { localeHref } from '@/lib/seo';
import { HomeToolCard, type HomeToolIcon } from './HomeToolCard';

export default async function HomeGameTools() {
  const [t, language] = await Promise.all([getServerT(), getServerLanguage()]);
  const tools: Array<{ href: string; icon: HomeToolIcon; title: string; body: string }> = [
    { href: '/pokedex', icon: 'book-open', title: t('lunidex_home.tools_pokedex_title', { defaultValue: 'Explore the Pokédex' }), body: t('lunidex_home.tools_pokedex_body', { defaultValue: 'Browse Pokémon, their types, stats, and evolutions.' }) },
    { href: '/team', icon: 'users', title: t('lunidex_home.tools_team_title', { defaultValue: 'Build a team' }), body: t('lunidex_home.tools_team_body', { defaultValue: 'Create a team and check its type coverage.' }) },
  ];

  return (
    <section className="mx-auto w-full max-w-6xl px-5 py-12 md:px-8 md:py-16" aria-labelledby="game-tools-title">
      <p className="text-xs font-black uppercase tracking-[0.2em] text-primary">{t('lunidex_home.tools_eyebrow', { defaultValue: 'Game tools' })}</p>
      <h2 id="game-tools-title" className="mt-3 text-3xl font-black tracking-tight md:text-4xl">{t('lunidex_home.tools_title', { defaultValue: 'Explore Pokémon. Build your team.' })}</h2>
      <p className="mt-3 max-w-2xl text-base leading-7 text-foreground/65">{t('lunidex_home.tools_body', { defaultValue: 'Browse the Pokédex and prepare balanced teams in the same place.' })}</p>
      <div className="mt-7 grid gap-4 md:grid-cols-2">
        {tools.map((tool) => (
          <HomeToolCard
            key={tool.href}
            href={localeHref(tool.href, language)}
            icon={tool.icon}
            title={tool.title}
            body={tool.body}
          />
        ))}
      </div>
    </section>
  );
}
