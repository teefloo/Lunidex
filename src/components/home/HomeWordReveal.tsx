'use client';

import { useEffect, useRef, useState, type CSSProperties } from 'react';

interface HomeWordRevealProps {
  text: string;
  className?: string;
}

export function HomeWordReveal({ text, className }: HomeWordRevealProps) {
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
        {text.split(/\s+/).map((word, index) => (
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
