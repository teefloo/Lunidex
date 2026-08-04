'use client';

import { useState, useMemo, useRef, useCallback } from 'react';
import { Search, ChevronDown, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';

type FaqEntry = { q: string; a: string };
type FaqCategory = { id: string; title: string; intro: string; entries: FaqEntry[] };

interface FaqSectionProps {
  categories: FaqCategory[];
  allLabel: string;
  searchPlaceholder: string;
  tocLabel: string;
  clearSearchLabel: string;
  filterLabel: string;
  resultsFoundOne: string;
  resultsFoundOther: string;
  noResultsTitle: string;
  noResultsBody: string;
  expandAnswerLabel: string;
  collapseAnswerLabel: string;
}

export default function FaqSection({
  categories,
  allLabel,
  searchPlaceholder,
  tocLabel,
  clearSearchLabel,
  filterLabel,
  resultsFoundOne,
  resultsFoundOther,
  noResultsTitle,
  noResultsBody,
  expandAnswerLabel,
  collapseAnswerLabel,
}: FaqSectionProps) {
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [expanded, setExpanded] = useState<string | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return categories.map((cat) => {
      const entries = cat.entries.filter((entry) => {
        const matchesCategory = activeCategory === 'all' || cat.id === activeCategory;
        if (!matchesCategory) return false;
        if (!q) return true;
        return entry.q.toLowerCase().includes(q) || entry.a.toLowerCase().includes(q);
      });
      return { ...cat, entries };
    });
  }, [categories, search, activeCategory]);

  const totalVisible = useMemo(
    () => filtered.reduce((sum, cat) => sum + cat.entries.length, 0),
    [filtered],
  );

  const toggle = useCallback(
    (id: string) => setExpanded((prev) => (prev === id ? null : id)),
    [],
  );

  const clearSearch = useCallback(() => {
    setSearch('');
    setExpanded(null);
    searchRef.current?.focus();
  }, []);

  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
    setExpanded(null);
  }, []);

  const handleCategoryChange = useCallback((categoryId: string) => {
    setActiveCategory(categoryId);
    setExpanded(null);
  }, []);

  const resultMessage = (totalVisible === 1 ? resultsFoundOne : resultsFoundOther)
    .replace('{{count}}', String(totalVisible))
    .replace('{{query}}', search.trim());

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
            {search.trim() && (
              <p className="cat-no" aria-live="polite">
                <span className="cat-no__num">{totalVisible}</span>
              </p>
            )}
          </div>

          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={tocLabel}>
            <button
              type="button"
              role="radio"
              aria-checked={activeCategory === 'all'}
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
                role="radio"
                aria-checked={activeCategory === cat.id}
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

        {search.trim() && (
          <p className="mt-3 text-xs text-muted-foreground" aria-live="polite">
            {resultMessage}
          </p>
        )}
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
                {cat.entries.map((entry, index) => {
                  const itemKey = `${cat.id}-${entry.q}`;
                  const itemId = `${cat.id}-${index + 1}`;
                  const headingId = `faq-question-${itemId}`;
                  const answerId = `faq-answer-${itemId}`;
                  const isOpen = expanded === itemKey;
                  return (
                    <div
                      key={itemKey}
                      data-category={cat.id}
                      data-od-id={`faq-item-${itemId}`}
                      className={cn(
                        'glass-card overflow-hidden transition-colors focus-within:border-primary',
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
                        className={cn(
                          'grid transition-[grid-template-rows] duration-200 ease-in-out motion-reduce:transition-none',
                          isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
                        )}
                      >
                        <div className="overflow-hidden">
                          <div className="border-t-2 border-dashed border-foreground/15 px-4 pb-5 pt-4 text-muted-foreground leading-relaxed md:px-6 md:pb-6 md:pt-5">
                            {entry.a}
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
