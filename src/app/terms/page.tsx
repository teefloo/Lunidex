import Header from '@/components/layout/Header';
import { getServerT } from '@/lib/server-i18n';
import { FileText, CheckCircle, Award, AlertTriangle, UserX, Mail } from 'lucide-react';

export default async function TermsPage() {
  const t = await getServerT();
  const sections = [
    {
      icon: CheckCircle,
      title: t('legal.terms.section_1_title'),
      text: t('legal.terms.section_1_text'),
    },
    {
      icon: Award,
      title: t('legal.terms.section_2_title'),
      text: t('legal.terms.section_2_text'),
    },
    {
      icon: AlertTriangle,
      title: t('legal.terms.section_3_title'),
      text: t('legal.terms.section_3_text'),
    },
    {
      icon: UserX,
      title: t('legal.terms.section_4_title'),
      text: t('legal.terms.section_4_text'),
    },
    {
      icon: Mail,
      title: t('legal.terms.section_5_title'),
      text: t('legal.terms.section_5_text'),
    },
  ];

  return (
    <div className="app-page">
      <Header />
      <main className="page-shell py-20">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center gap-4 mb-8">
            <div className="flex h-16 w-16 items-center justify-center rounded-[1.25rem] bg-primary/10 border border-primary/20 backdrop-blur-xl">
              <FileText className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-black gradient-text-primary">
                {t('legal.terms.title')}
              </h1>
              <p className="text-sm text-foreground/40 mt-1">
                {t('legal.terms.last_updated', { date: 'April 16, 2026' })}
              </p>
            </div>
          </div>

          <div className="section-frame p-8 mb-8">
            <p className="text-lg leading-relaxed text-foreground/70">
              {t('legal.terms.intro')}
            </p>
          </div>

          <div className="space-y-6">
            {sections.map((section, index) => (
              <div
                key={index}
                className="section-frame p-6 hover:bg-card/50 transition-colors"
              >
                <div className="flex items-start gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 shrink-0">
                    <section.icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-foreground/90 mb-2">
                      {section.title}
                    </h2>
                    <p className="text-sm leading-relaxed text-foreground/60">
                      {section.text}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
