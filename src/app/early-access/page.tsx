import type { Metadata } from 'next';
import { getServerLanguage } from '@/lib/server-i18n';
import { SITE_URL, SITE_NAME, GITHUB_REPO_URL, DISCORD_URL } from '@/lib/site';
import { buildSubpathLanguages } from '@/lib/seo';
import PrimeDexLogo from '@/components/ui/PrimeDexLogo';
import EarlyAccessForm from '@/components/early-access/EarlyAccessForm';
import { Github, MessageCircle, ShieldCheck, Sparkles, Zap } from 'lucide-react';

export const revalidate = 3600;

const TITLE = 'Ne ratez pas la sortie du Deck Builder TCG';
const DESCRIPTION =
  "Le Pokédex qui suit vos parties, pas l'inverse. 1 025 Pokémon, calculs en direct, sans compte. Inscrivez-vous pour être prévenu à la sortie du Deck Builder TCG.";

export async function generateMetadata(): Promise<Metadata> {
  const lang = await getServerLanguage();
  return {
    title: TITLE,
    description: DESCRIPTION,
    alternates: {
      canonical: `/${lang}/early-access`,
      languages: buildSubpathLanguages('/early-access'),
    },
    openGraph: {
      title: TITLE,
      description: DESCRIPTION,
      url: `/${lang}/early-access`,
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: TITLE,
      description: DESCRIPTION,
    },
  };
}

const BENEFITS = [
  {
    icon: Zap,
    title: 'Calculs en direct',
    body: "Dégâts, IV, EV, synergies d'équipe : les chiffres se mettent à jour pendant que vous jouez, pas après.",
  },
  {
    icon: ShieldCheck,
    title: 'Zéro friction',
    body: 'Pas de compte, pas de mot de passe oublié. Vos données restent dans votre navigateur.',
  },
  {
    icon: Sparkles,
    title: 'Toujours à jour',
    body: 'Nouveaux sets TCG, nouvelles générations : ajoutés dès leur sortie, sans que vous ayez à vérifier.',
  },
];

const FAQ = [
  {
    q: 'Est-ce vraiment gratuit ?',
    a: "Oui, sans limite et sans version payante cachée. C'est un projet non commercial.",
  },
  {
    q: 'Mes données sont-elles stockées quelque part ?',
    a: 'Non. Tout reste dans votre navigateur (aucun compte, aucun serveur ne les reçoit).',
  },
  {
    q: 'Je vais recevoir combien d’e-mails ?',
    a: "Un par nouveauté majeure. Pas de newsletter hebdomadaire.",
  },
  {
    q: 'Puis-je me désabonner facilement ?',
    a: 'Un clic, à tout moment, dans chaque e-mail.',
  },
];

export default async function EarlyAccessPage() {
  const lang = await getServerLanguage();
  const baseUrl = SITE_URL;

  const faqPageJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    '@id': `${baseUrl}/${lang}/early-access#faq`,
    url: `${baseUrl}/${lang}/early-access`,
    mainEntity: FAQ.map((item) => ({
      '@type': 'Question',
      name: item.q,
      acceptedAnswer: { '@type': 'Answer', text: item.a },
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqPageJsonLd) }}
      />
      <div className="app-page">
        <main className="page-shell flex flex-col items-center pt-16 pb-24 md:pt-24">
          {/* Hero — Attention */}
          <section aria-labelledby="hero-title" className="w-full max-w-3xl text-center">
            <PrimeDexLogo className="mx-auto mb-6 w-14 h-14" />
            <h1
              id="hero-title"
              className="page-title font-display text-[clamp(2.25rem,7vw,4.5rem)] leading-[0.95] font-extrabold gradient-text-hero"
            >
              Le Pokédex qui suit vos parties, pas l&apos;inverse.
            </h1>
            <p className="mt-5 text-base md:text-lg text-foreground/70 max-w-2xl mx-auto">
              1 025 Pokémon, calculs de stats en direct, et bientôt vos decks TCG —
              sans compte à créer, sans pub, pour toujours gratuit.
            </p>
            <div className="mt-8 flex justify-center">
              <EarlyAccessForm formLabel="Inscription — en haut de page" />
            </div>
          </section>

          {/* Bénéfices — Intérêt */}
          <section
            aria-labelledby="benefits-title"
            className="mt-20 md:mt-28 w-full max-w-5xl"
          >
            <h2
              id="benefits-title"
              className="text-center text-2xl md:text-3xl font-extrabold tracking-tight"
            >
              Pensé pour ceux qui jouent, pas pour ceux qui collectionnent des onglets
            </h2>
            <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-3">
              {BENEFITS.map(({ icon: Icon, title, body }) => (
                <div key={title} className="section-frame p-6">
                  <Icon className="h-6 w-6 text-primary" aria-hidden="true" />
                  <h3 className="mt-4 text-lg font-extrabold tracking-tight">{title}</h3>
                  <p className="mt-2 text-sm text-foreground/70 leading-relaxed">{body}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Preuve sociale — Désir */}
          <section
            aria-labelledby="proof-title"
            className="mt-20 md:mt-28 w-full max-w-3xl text-center"
          >
            <h2 id="proof-title" className="text-2xl md:text-3xl font-extrabold tracking-tight">
              Un projet ouvert, pas une boîte noire
            </h2>
            <p className="mt-4 text-foreground/70 leading-relaxed max-w-xl mx-auto">
              Le code est public : vous pouvez vérifier vous-même ce que PrimeDex fait de vos
              données avant de nous confier votre e-mail.
            </p>
            <ul className="mt-8 flex flex-wrap justify-center gap-3 text-sm font-semibold">
              <li>
                <a
                  href={GITHUB_REPO_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="page-eyebrow normal-case tracking-normal hover:border-primary transition-colors"
                >
                  <Github className="h-3.5 w-3.5" aria-hidden="true" />
                  Code source sur GitHub
                </a>
              </li>
              <li>
                <a
                  href={DISCORD_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="page-eyebrow normal-case tracking-normal hover:border-primary transition-colors"
                >
                  <MessageCircle className="h-3.5 w-3.5" aria-hidden="true" />
                  Rejoindre le Discord
                </a>
              </li>
              <li className="page-eyebrow normal-case tracking-normal">25 000+ cartes TCG indexées</li>
            </ul>
          </section>

          {/* FAQ — Désir → Action */}
          <section
            aria-labelledby="faq-title"
            className="mt-20 md:mt-28 w-full max-w-2xl"
          >
            <h2
              id="faq-title"
              className="text-center text-2xl md:text-3xl font-extrabold tracking-tight"
            >
              Questions fréquentes
            </h2>
            <dl className="mt-8 space-y-3">
              {FAQ.map((item) => (
                <div key={item.q} className="section-frame p-5">
                  <dt className="font-bold tracking-tight">{item.q}</dt>
                  <dd className="mt-1.5 text-sm text-foreground/70 leading-relaxed">{item.a}</dd>
                </div>
              ))}
            </dl>
          </section>

          {/* CTA final — Action */}
          <section
            aria-labelledby="final-cta-title"
            className="mt-20 md:mt-28 w-full max-w-2xl text-center"
          >
            <h2 id="final-cta-title" className="text-2xl md:text-4xl font-extrabold tracking-tight">
              Ne ratez pas la sortie du Deck Builder TCG.
            </h2>
            <div className="mt-8 flex justify-center">
              <EarlyAccessForm formLabel="Inscription — bas de page" />
            </div>
          </section>

          <footer className="mt-24 text-center text-xs text-foreground/40">
            <p>{SITE_NAME} — projet non commercial, données © Nintendo / Game Freak / The Pokémon Company.</p>
          </footer>
        </main>
      </div>
    </>
  );
}
