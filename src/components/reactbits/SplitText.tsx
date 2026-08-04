'use client';

import { useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText as GSAPSplitText } from 'gsap/SplitText';

gsap.registerPlugin(ScrollTrigger, GSAPSplitText);

export interface SplitTextProps {
  text: string;
  className?: string;
  delay?: number;
  duration?: number;
  ease?: string;
  splitType?: 'chars' | 'words' | 'lines' | 'chars,words,lines';
  from?: { opacity: number; y: number };
  to?: { opacity: number; y: number };
  threshold?: number;
  rootMargin?: string;
  textAlign?: 'left' | 'center' | 'right';
  tag?: string;
  onLetterAnimationComplete?: () => void;
}

type SplitTextElement = HTMLElement & {
  _rbsplitInstance?: GSAPSplitText;
};

/**
 * ReactBits SplitText — ported to TypeScript. Animates the text in, one
 * character/word/line at a time, when it scrolls into view.
 */
export default function SplitText({
  text,
  className = '',
  delay = 50,
  duration = 1.25,
  ease = 'power3.out',
  splitType = 'chars',
  from = { opacity: 0, y: 40 },
  to = { opacity: 1, y: 0 },
  threshold = 0.1,
  rootMargin = '-100px',
  textAlign = 'center',
  tag = 'p',
  onLetterAnimationComplete,
}: SplitTextProps) {
  const ref = useRef<SplitTextElement | null>(null);
  const animationCompletedRef = useRef(false);
  const onCompleteRef = useRef(onLetterAnimationComplete);
  const [fontsLoaded, setFontsLoaded] = useState(false);

  useLayoutEffect(() => {
    onCompleteRef.current = onLetterAnimationComplete;
  }, [onLetterAnimationComplete]);

  useLayoutEffect(() => {
    if (typeof document === 'undefined') return;
    if (document.fonts.status === 'loaded') {
      setFontsLoaded(true);
    } else {
      document.fonts.ready.then(() => setFontsLoaded(true)).catch(() => setFontsLoaded(true));
    }
  }, []);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || !text || !fontsLoaded || animationCompletedRef.current) return;

    const instanceKey = '_rbsplitInstance' as const;
    const previous = el[instanceKey];
    if (previous) {
      try {
        previous.revert();
      } catch {
        /* noop */
      }
      delete el[instanceKey];
    }

    const startPct = (1 - threshold) * 100;
    const marginMatch = /^(-?\d+(?:\.\d+)?)(px|em|rem|%)?$/.exec(rootMargin);
    const marginValue = marginMatch ? parseFloat(marginMatch[1]) : 0;
    const marginUnit = marginMatch ? marginMatch[2] || 'px' : 'px';
    const sign =
      marginValue === 0 ? '' : marginValue < 0 ? `-=${Math.abs(marginValue)}${marginUnit}` : `+=${marginValue}${marginUnit}`;
    const start = `top ${startPct}%${sign}`;

    let targets: unknown;
    const assignTargets = (self: GSAPSplitText) => {
      if (splitType.includes('chars') && self.chars.length) targets = self.chars;
      if (!targets && splitType.includes('words') && self.words.length) targets = self.words;
      if (!targets && splitType.includes('lines') && self.lines.length) targets = self.lines;
      if (!targets) targets = self.chars || self.words || self.lines;
    };

    const splitInstance = new GSAPSplitText(el, {
      type: splitType,
      smartWrap: true,
      autoSplit: splitType === 'lines',
      linesClass: 'split-line',
      wordsClass: 'split-word',
      charsClass: 'split-char',
      reduceWhiteSpace: false,
      onSplit: (self: GSAPSplitText) => {
        assignTargets(self);
        const tween = gsap.fromTo(
          targets as gsap.TweenTarget,
          { ...from },
          {
            ...to,
            duration,
            ease,
            stagger: delay / 1000,
            scrollTrigger: {
              trigger: el,
              start,
              once: true,
              fastScrollEnd: true,
              anticipatePin: 0.4,
            },
            onComplete: () => {
              animationCompletedRef.current = true;
              onCompleteRef.current?.();
            },
            willChange: 'transform, opacity',
            force3D: true,
          }
        );
        return tween;
      },
    });

    el[instanceKey] = splitInstance;

    return () => {
      ScrollTrigger.getAll().forEach((st) => {
        if (st.trigger === el) st.kill();
      });
      try {
        splitInstance.revert();
      } catch {
        /* noop */
      }
      delete el[instanceKey];
    };
  }, [text, delay, duration, ease, splitType, JSON.stringify(from), JSON.stringify(to), threshold, rootMargin, fontsLoaded]);

  const style: CSSProperties = {
    textAlign,
    overflow: 'hidden',
    display: 'inline-block',
    whiteSpace: 'normal',
    wordWrap: 'break-word',
    willChange: 'transform, opacity',
  };

  const Tag = tag as 'p';

  return (
    <Tag ref={ref as never} style={style} className={`split-parent ${className}`}>
      {text}
    </Tag>
  );
}
