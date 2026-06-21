import { AlertCircle, AlertTriangle, CheckCircle2 } from 'lucide-react';

import type { LegalCallout, LegalDocument, LegalSection } from '@/lib/i18n/legal-types';

const calloutStyles: Record<LegalCallout['type'], { wrapper: string; icon: string }> = {
  info: {
    wrapper: 'border-sky-500/30 bg-sky-500/10 text-sky-100',
    icon: 'text-sky-300',
  },
  warning: {
    wrapper: 'border-amber-500/40 bg-amber-500/10 text-amber-100',
    icon: 'text-amber-300',
  },
  success: {
    wrapper: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-100',
    icon: 'text-emerald-300',
  },
};

const calloutIcon: Record<LegalCallout['type'], typeof AlertCircle> = {
  info: AlertCircle,
  warning: AlertTriangle,
  success: CheckCircle2,
};

function Section({ section, depth = 0 }: { section: LegalSection; depth?: number }) {
  const headingClass =
    depth === 0
      ? 'text-2xl font-semibold text-foreground'
      : 'text-lg font-semibold text-foreground';

  return (
    <section id={section.id} className={depth === 0 ? 'scroll-mt-24' : 'scroll-mt-24 mt-6'}>
      <h2 className={headingClass}>{section.title}</h2>
      {section.intro ? (
        <p className="mt-3 text-base leading-relaxed text-foreground/85">{section.intro}</p>
      ) : null}

      {section.paragraphs?.map((paragraph, index) => (
        <p key={`p-${index}`} className="mt-3 text-base leading-relaxed text-foreground/85">
          {paragraph}
        </p>
      ))}

      {section.list && section.list.length > 0 ? (
        <ul className="mt-3 list-disc space-y-1.5 pl-6 text-base leading-relaxed text-foreground/85">
          {section.list.map((item, index) => (
            <li key={`l-${index}`}>{item}</li>
          ))}
        </ul>
      ) : null}

      {section.table ? (
        <div className="mt-4 overflow-x-auto rounded-lg border border-foreground/10 bg-background/40">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-foreground/5 text-left">
                {section.table.headers.map((header, index) => (
                  <th
                    key={`h-${index}`}
                    className="px-4 py-2.5 font-semibold text-foreground/90"
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {section.table.rows.map((row, rowIndex) => (
                <tr
                  key={`r-${rowIndex}`}
                  className="border-t border-foreground/10 align-top"
                >
                  {row.map((cell, cellIndex) => (
                    <td
                      key={`c-${rowIndex}-${cellIndex}`}
                      className="px-4 py-2.5 text-foreground/85"
                    >
                      {cellIndex === 0 ? (
                        <span className="font-medium text-foreground">{cell}</span>
                      ) : (
                        cell
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {section.callout ? <Callout callout={section.callout} /> : null}

      {section.subsections?.map((subsection) => (
        <Section key={subsection.id} section={subsection} depth={depth + 1} />
      ))}
    </section>
  );
}

function Callout({ callout }: { callout: LegalCallout }) {
  const styles = calloutStyles[callout.type];
  const Icon = calloutIcon[callout.type];

  return (
    <div className={`mt-4 flex gap-3 rounded-lg border p-4 ${styles.wrapper}`}>
      <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${styles.icon}`} aria-hidden="true" />
      <p className="text-sm leading-relaxed">{callout.text}</p>
    </div>
  );
}

export default function LegalDocumentView({
  doc,
}: {
  doc: LegalDocument;
}) {
  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-3xl font-bold text-foreground sm:text-4xl">{doc.title}</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          {doc.lastUpdated} · {doc.effectiveDate}
        </p>
        <p className="mt-4 text-base leading-relaxed text-foreground/85">{doc.intro}</p>
        {doc.preamble ? (
          <p className="mt-3 text-base leading-relaxed text-foreground/85">{doc.preamble}</p>
        ) : null}
      </div>

      <nav
        aria-label="Table of contents"
        className="rounded-sm border border-foreground/10 bg-foreground/[0.02] p-4"
      >
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Table of contents
        </p>
        <ol className="mt-2 space-y-1 text-sm">
          {doc.sections.map((section) => (
            <li key={section.id}>
              <a
                href={`#${section.id}`}
                className="text-foreground/80 transition-colors hover:text-foreground"
              >
                {section.title}
              </a>
            </li>
          ))}
        </ol>
      </nav>

      <div className="space-y-10">
        {doc.sections.map((section) => (
          <Section key={section.id} section={section} />
        ))}
      </div>
    </div>
  );
}
