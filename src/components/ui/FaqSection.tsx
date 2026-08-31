'use client';

import { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { Search, ChevronDown, X, ArrowUpRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';

type FaqLink = { href: string; label: string };
type FaqEntry = { id: string; q: string; a: string; links?: FaqLink[] };
type FaqCategory = { id: string; title: string; intro: string; entries: FaqEntry[] };

interface FaqSectionProps {
  categories: FaqCategory[];
  allLabel: string;
  searchPlaceholder: string;
  categoryLabel: string;
  relatedLinksLabel: string;
  clearSearchLabel: string;
  filterLabel: string;
  resultsFoundOne: string;
  resultsFoundOther: string;
  resultsSummary: string;
  noResultsTitle: string;
  noResultsBody: string;
  expandAnswerLabel: string;
  collapseAnswerLabel: string;
}

export default function FaqSection({
  categories,
  allLabel,
  searchPlaceholder,
  categoryLabel,
  relatedLinksLabel,
  clearSearchLabel,
  filterLabel,
  resultsFoundOne,
  resultsFoundOther,
  resultsSummary,
  noResultsTitle,
  noResultsBody,
  expandAnswerLabel,
  collapseAnswerLabel,
}: FaqSectionProps) {
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [expanded, setExpanded] = useState<string | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const normalize = useCallback((value: string) => (
    value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim()
  ), []);

  const filtered = useMemo(() => {
    const q = normalize(search);
    return categories.map((cat) => {
      const entries = cat.entries.filter((entry) => {
        const matchesCategory = activeCategory === 'all' || cat.id === activeCategory;
        if (!matchesCategory) return false;
        if (!q) return true;
        return normalize(entry.q).includes(q) || normalize(entry.a).includes(q);
      });
      return { ...cat, entries };
    });
  }, [categories, search, activeCategory, normalize]);

  const totalVisible = useMemo(
    () => filtered.reduce((sum, cat) => sum + cat.entries.length, 0),
    [filtered],
  );

  const updateHash = useCallback((id: string | null) => {
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    url.hash = id ?? '';
    window.history.replaceState(null, '', url);
  }, []);

  const toggle = useCallback((id: string) => {
    setExpanded((prev) => {
      const next = prev === id ? null : id;
      updateHash(next);
      return next;
    });
  }, [updateHash]);

  const entryIds = useMemo(
    () => new Set(categories.flatMap((category) => category.entries.map((entry) => entry.id))),
    [categories],
  );

  useEffect(() => {
    const openHashEntry = () => {
      const id = window.location.hash.slice(1);
      if (!id || !entryIds.has(id)) return;
      setSearch('');
      setActiveCategory('all');
      setExpanded(id);
      window.requestAnimationFrame(() => {
        document.getElementById(id)?.scrollIntoView({ block: 'start' });
      });
    };

    openHashEntry();
    window.addEventListener('hashchange', openHashEntry);
    return () => window.removeEventListener('hashchange', openHashEntry);
  }, [entryIds]);

  const clearSearch = useCallback(() => {
    setSearch('');
    setExpanded(null);
    updateHash(null);
    searchRef.current?.focus();
  }, [updateHash]);

  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
    setExpanded(null);
    updateHash(null);
  }, [updateHash]);

  const handleCategoryChange = useCallback((categoryId: string) => {
    setActiveCategory(categoryId);
    setExpanded(null);
    updateHash(null);
  }, [updateHash]);

  const resultMessage = search.trim()
    ? (totalVisible === 1 ? resultsFoundOne : resultsFoundOther)
      .replace('{{count}}', String(totalVisible))
      .replace('{{query}}', search.trim())
    : resultsSummary.replace('{{count}}', String(totalVisible));

  return (
    <div className="space-y-12">
      <div className="section-frame p-4 md:p-5" data-od-id="faq-search">
        <div className="relative">
          <label htmlFor="faq-question-search" className="sr-only">
            {searchPlaceholder}
          </label>
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/45"
          />
          <Input
            id="faq-question-search"
            name="faq-search"
            type="search"
            autoComplete="off"
            spellCheck={false}
            ref={searchRef}
            value={search}
            onChange={(event) => handleSearchChange(event.target.value)}
            placeholder={searchPlaceholder}
            aria-label={searchPlaceholder}
            className="h-12 pl-11 pr-14"
          />
          {search && (
            <button
              type="button"
              onClick={clearSearch}
              className="glass-btn touch-target absolute right-1.5 top-1/2 inline-flex -translate-y-1/2 items-center justify-center border-transparent bg-transparent text-foreground/55 shadow-none hover:border-primary hover:bg-card hover:text-foreground hover:shadow-[var(--shadow-pixel-sm)]"
              aria-label={clearSearchLabel}
            >
              <X aria-hidden="true" className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="mt-4 border-t-2 border-dashed border-foreground/15 pt-4" data-od-id="faq-categories">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <p className="cat-no">{filterLabel}</p>
            <p className="cat-no" aria-live="polite">
              <span className="cat-no__num">{totalVisible}</span>
            </p>
          </div>

          <div className="flex flex-wrap gap-2" role="group" aria-label={categoryLabel}>
            <button
              type="button"
              aria-pressed={activeCategory === 'all'}
              onClick={() => handleCategoryChange('all')}
              className={cn(
                'glass-btn touch-target inline-flex min-h-11 items-center gap-1.5 px-3 py-1.5 text-sm font-semibold',
                activeCategory === 'all'
                  ? 'glass-btn-active'
                  : 'text-muted-foreground',
              )}
            >
              {allLabel}
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                aria-pressed={activeCategory === cat.id}
                onClick={() => handleCategoryChange(cat.id)}
                className={cn(
                  'glass-btn touch-target inline-flex min-h-11 items-center gap-1.5 px-3 py-1.5 text-sm font-semibold',
                  activeCategory === cat.id
                    ? 'glass-btn-active'
                    : 'text-muted-foreground',
                )}
              >
                {cat.title}
                <span className="font-mono text-[0.65rem] text-current opacity-65">{cat.entries.length}</span>
              </button>
            ))}
          </div>
        </div>

        <p className="mt-3 text-xs text-muted-foreground" aria-live="polite">
          {resultMessage}
        </p>
      </div>

      <div className="space-y-12" data-od-id="faq-accordion">
        {filtered.map((cat) => {
          if (cat.entries.length === 0) return null;
          return (
            <section
              key={cat.id}
              id={cat.id}
              aria-labelledby={`${cat.id}-title`}
              className="scroll-mt-28"
            >
              <header className="mb-6 border-b border-dashed border-foreground/15 pb-4">
                <h2
                  id={`${cat.id}-title`}
                  className="text-2xl md:text-3xl font-extrabold tracking-tight"
                >
                  {cat.title}
                </h2>
                <p className="mt-2 text-foreground/70 leading-relaxed max-w-2xl">
                  {cat.intro}
                </p>
              </header>

              <div className="space-y-3">
                {cat.entries.map((entry) => {
                  const itemKey = entry.id;
                  const itemId = entry.id;
                  const headingId = `faq-question-${itemId}`;
                  const answerId = `faq-answer-${itemId}`;
                  const isOpen = expanded === itemKey;
                  return (
                    <div
                      key={itemKey}
                      id={itemId}
                      data-faq-item="true"
                      data-category={cat.id}
                      data-od-id={`faq-item-${itemId}`}
                      className={cn(
                        'glass-card scroll-mt-32 overflow-hidden transition-colors focus-within:border-primary',
                        isOpen && 'border-primary ring-2 ring-primary/15',
                      )}
                    >
                      <h3 id={headingId}>
                        <button
                          type="button"
                          onClick={() => toggle(itemKey)}
                          aria-expanded={isOpen}
                          aria-controls={answerId}
                          title={isOpen ? collapseAnswerLabel : expandAnswerLabel}
                          className={cn(
                            'flex min-h-16 w-full items-center gap-4 px-4 py-4 text-left font-bold tracking-tight transition-colors hover:bg-foreground/[0.035] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary md:min-h-[4.5rem] md:px-6 md:py-5',
                            'text-foreground',
                          )}
                        >
                          <span className="flex-1 text-base md:text-lg">{entry.q}</span>
                          <ChevronDown
                            className={cn(
                              'h-5 w-5 flex-none text-foreground/40 transition-transform duration-200',
                              isOpen && 'rotate-180 text-foreground',
                            )}
                            aria-hidden="true"
                          />
                        </button>
                      </h3>
                      <div
                        id={answerId}
                        role="region"
                        aria-labelledby={headingId}
                        aria-hidden={!isOpen}
                        inert={!isOpen}
                        className={cn(
                          'grid transition-[grid-template-rows] duration-200 ease-in-out motion-reduce:transition-none',
                          isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
                        )}
                      >
                        <div className="overflow-hidden">
                          <div className="border-t-2 border-dashed border-foreground/15 px-4 pb-5 pt-4 text-muted-foreground leading-relaxed md:px-6 md:pb-6 md:pt-5">
                            <p>{entry.a}</p>
                            {entry.links && entry.links.length > 0 && (
                              <nav className="mt-5 border-t border-dashed border-foreground/15 pt-4" aria-label={relatedLinksLabel}>
                                <ul className="flex flex-wrap gap-2">
                                  {entry.links.map((link) => (
                                    <li key={link.href}>
                                      <Link
                                        href={link.href}
                                        className="glass-btn touch-target inline-flex min-h-11 items-center gap-1.5 px-3 py-2 text-xs font-bold uppercase tracking-[0.12em] text-foreground/80"
                                      >
                                        {link.label}
                                        <ArrowUpRight aria-hidden="true" className="h-3.5 w-3.5" />
                                      </Link>
                                    </li>
                                  ))}
                                </ul>
                              </nav>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}

        {totalVisible === 0 && (
          <div className="section-frame px-5 py-12 text-center text-foreground/60" role="status">
            <Search aria-hidden="true" className="mx-auto mb-3 h-8 w-8 opacity-40" />
            <p className="font-display text-xl font-bold text-foreground">{noResultsTitle}</p>
            <p className="mt-2 text-sm">{noResultsBody}</p>
          </div>
        )}
      </div>
    </div>
  );
}
