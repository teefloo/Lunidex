import type { Metadata } from 'next';
import { Mail } from 'lucide-react';

import Header from '@/components/layout/Header';
import PageHeader from '@/components/layout/PageHeader';
import { Breadcrumbs } from '@/components/layout/Breadcrumbs';
import { ContactForm } from '@/components/contact/ContactForm';
import { buildBreadcrumbJsonLd, buildSubpathLanguages, DEFAULT_OG_IMAGE } from '@/lib/seo';
import { serializeJsonLd } from '@/lib/json-ld';
import { getServerLanguage, getServerT } from '@/lib/server-i18n';
import { SITE_NAME, SITE_URL } from '@/lib/site';

export const revalidate = 3600;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getServerT();
  const lang = await getServerLanguage();
  const title = t('contact.title', { defaultValue: 'Contact' });
  const description = t('contact.description', { defaultValue: 'Contact the Lunidex team.' });
  return {
    title: `${title} — ${SITE_NAME}`,
    description,
    alternates: { canonical: `/${lang}/contact`, languages: buildSubpathLanguages('/contact') },
    openGraph: { title: `${title} — ${SITE_NAME}`, description, url: `/${lang}/contact`, type: 'website', images: [DEFAULT_OG_IMAGE] },
    twitter: { card: 'summary_large_image', title: `${title} — ${SITE_NAME}`, description },
  };
}

export default async function ContactPage() {
  const t = await getServerT();
  const lang = await getServerLanguage();
  const title = t('contact.title', { defaultValue: 'Contact' });
  const description = t('contact.description', { defaultValue: 'Contact the Lunidex team.' });
  const breadcrumb = buildBreadcrumbJsonLd([
    { name: SITE_NAME, path: '/' },
    { name: title, path: '/contact' },
  ], lang);
  const contactPage = {
    '@context': 'https://schema.org',
    '@type': 'ContactPage',
    '@id': `${SITE_URL}/${lang}/contact#contactpage`,
    url: `${SITE_URL}/${lang}/contact`,
    name: `${title} — ${SITE_NAME}`,
    description,
    isPartOf: { '@id': `${SITE_URL}/#website` },
    about: { '@id': `${SITE_URL}/#organization` },
    email: 'contact@lunidex.app',
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(contactPage) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(breadcrumb) }} />
      <div className="app-page">
        <Header />
        <Breadcrumbs items={[{ label: t('common.home', { defaultValue: 'Home' }), href: `/${lang}` }, { label: title }]} homeLabel={t('common.home', { defaultValue: 'Home' })} />
        <main className="page-shell pb-24 pt-28">
          <PageHeader icon={Mail} eyebrow={t('contact.eyebrow')} title={title} description={description} />
          <article className="mx-auto grid w-full max-w-5xl gap-8 px-5 md:grid-cols-[minmax(0,0.7fr)_minmax(0,1.3fr)] md:px-8">
            <section className="section-frame h-fit p-6 md:p-8" aria-labelledby="contact-direct-title">
              <h2 id="contact-direct-title" className="text-xl font-extrabold tracking-tight">{t('contact.direct_email')}</h2>
              <a href="mailto:contact@lunidex.app" className="mt-3 inline-block break-all text-lg font-bold text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40">
                contact@lunidex.app
              </a>
            </section>
            <section className="section-frame p-6 md:p-8" aria-labelledby="contact-form-title">
              <h2 id="contact-form-title" className="mb-6 text-xl font-extrabold tracking-tight">{t('contact.form_title')}</h2>
              <ContactForm privacyHref={`/${lang}/privacy`} />
            </section>
          </article>
        </main>
      </div>
    </>
  );
}
