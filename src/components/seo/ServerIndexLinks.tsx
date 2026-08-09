import Link from 'next/link';

interface ServerIndexLink {
  href: string;
  label: string;
}

interface ServerIndexLinksProps {
  title: string;
  links: ServerIndexLink[];
}

/**
 * Keeps a small, useful set of catalog links in the initial HTML. Interactive
 * catalogs can then enhance the same route without making discovery depend on
 * a client-side query completing first.
 */
export function ServerIndexLinks({ title, links }: ServerIndexLinksProps) {
  if (links.length === 0) return null;

  return (
    <section className="page-shell mb-6" aria-labelledby="server-index-links-title">
      <h2 id="server-index-links-title" className="mb-3 text-xs font-black uppercase tracking-[0.18em] text-foreground/45">
        {title}
      </h2>
      <nav aria-label={title}>
        <ul className="flex flex-wrap gap-2">
          {links.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className="inline-flex rounded-sm border border-border/60 bg-card/50 px-3 py-2 text-xs font-bold text-foreground/65 transition-colors hover:border-primary/30 hover:bg-primary/10 hover:text-primary"
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </section>
  );
}
