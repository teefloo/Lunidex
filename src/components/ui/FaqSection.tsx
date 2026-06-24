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
}

export default function FaqSection({
  categories,
  allLabel,
  searchPlaceholder,
  tocLabel,
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
    searchRef.current?.focus();
  }, []);

  return (
    <div className="space-y-14">
      <div className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground/40 pointer-events-none" />
          <Input
            ref={searchRef}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={searchPlaceholder}
            aria-label={searchPlaceholder}
            className="pl-10 pr-9"
          />
          {search && (
            <button
              onClick={clearSearch}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground/40 hover:text-foreground transition-colors"
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={tocLabel}>
          <button
            role="radio"
            aria-checked={activeCategory === 'all'}
            onClick={() => setActiveCategory('all')}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-semibold transition-colors',
              activeCategory === 'all'
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-foreground/15 text-foreground/60 hover:border-primary/40 hover:text-foreground/80',
            )}
          >
            {allLabel}
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              role="radio"
              aria-checked={activeCategory === cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-semibold transition-colors',
                activeCategory === cat.id
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-foreground/15 text-foreground/60 hover:border-primary/40 hover:text-foreground/80',
              )}
            >
              {cat.title}
              <span className="text-xs text-foreground/40">({cat.entries.length})</span>
            </button>
          ))}
        </div>

        {search && (
          <p className="text-xs text-foreground/50">
            {totalVisible} {totalVisible === 1 ? 'result' : 'results'} for &ldquo;{search}&rdquo;
          </p>
        )}
      </div>

      <div className="space-y-14" data-od-id="faq-accordion">
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
                  const itemKey = `${cat.id}-${entry.q}`;
                  const isOpen = expanded === itemKey;
                  return (
                    <div
                      key={itemKey}
                      className={cn(
                        'section-frame transition-colors',
                        isOpen && 'ring-1 ring-primary/20',
                      )}
                    >
                      <h3>
                        <button
                          type="button"
                          onClick={() => toggle(itemKey)}
                          aria-expanded={isOpen}
                          className={cn(
                            'flex w-full items-center gap-4 px-5 py-4 md:px-7 md:py-5 text-left font-bold tracking-tight transition-colors',
                            'hover:bg-foreground/[0.02]',
                            isOpen ? 'text-primary' : 'text-foreground',
                          )}
                        >
                          <span className="flex-1 text-base md:text-lg">{entry.q}</span>
                          <ChevronDown
                            className={cn(
                              'h-5 w-5 flex-none text-foreground/40 transition-transform duration-200',
                              isOpen && 'rotate-180 text-primary',
                            )}
                          />
                        </button>
                      </h3>
                      <div
                        role="region"
                        aria-labelledby={`${itemKey}-heading`}
                        className={cn(
                          'grid transition-[grid-template-rows] duration-200 ease-in-out',
                          isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
                        )}
                      >
                        <div className="overflow-hidden">
                          <div className="px-5 pb-5 md:px-7 md:pb-6 text-foreground/80 leading-relaxed">
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
          <div className="text-center py-12 text-foreground/50">
            <Search className="h-8 w-8 mx-auto mb-3 opacity-40" />
            <p className="text-sm font-semibold">No results found</p>
            <p className="text-xs mt-1">Try a different search term or category</p>
          </div>
        )}
      </div>
    </div>
  );
}
