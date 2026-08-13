'use client';

import { useEffect, useRef, useState, type CSSProperties } from 'react';

interface HomeWordRevealProps {
  text: string;
  className?: string;
  locale?: string;
}

interface SegmenterLike {
  segment: (value: string) => Iterable<{ segment: string }>;
}

function segmentText(text: string, locale: string): string[] {
  const Segmenter = (Intl as unknown as {
    Segmenter?: new (locales?: string | string[], options?: { granularity?: string }) => SegmenterLike;
  }).Segmenter;

  if (Segmenter) {
    const segmenter = new Segmenter(locale, { granularity: 'word' });
    const segments = Array.from(segmenter.segment(text), ({ segment }) => segment.trim()).filter(Boolean);
    if (segments.length > 0) {
      return segments.reduce<string[]>((tokens, segment) => {
        if (/^[\p{P}\p{S}]+$/u.test(segment) && tokens.length > 0) {
          tokens[tokens.length - 1] += segment;
        } else {
          tokens.push(segment);
        }
        return tokens;
      }, []);
    }
  }

  const normalized = text.trim();
  if (/\s/.test(normalized)) return normalized.split(/\s+/);
  return Array.from(normalized);
}

export function HomeWordReveal({ text, className, locale = 'en' }: HomeWordRevealProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const visualRef = useRef<HTMLSpanElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const element = ref.current;
    const visual = visualRef.current;
    if (!element || !visual) return;
    visual.dataset.ready = 'true';

    const revealNextFrame = () => {
      const frameId = requestAnimationFrame(() => setIsVisible(true));
      return () => cancelAnimationFrame(frameId);
    };

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return revealNextFrame();
    }

    if (!('IntersectionObserver' in window)) {
      return revealNextFrame();
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.2 },
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <span ref={ref} className={className}>
      <span ref={visualRef} className="home-word-reveal-visual" aria-hidden="true" data-visible={isVisible}>
        {segmentText(text, locale).map((word, index) => (
          <span
            key={`${word}-${index}`}
            className="home-word-reveal-word"
            style={{ '--word-index': index } as CSSProperties}
          >
            {word}
          </span>
        ))}
      </span>
      <span className="sr-only">{text}</span>
    </span>
  );
}
