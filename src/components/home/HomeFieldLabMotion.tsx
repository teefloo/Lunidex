'use client';

import { useEffect } from 'react';

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';
const COMPACT_VIEWPORT_QUERY = '(max-width: 767px)';
const CHAPTER_COUNT = 5;

function clamp(value: number, min = 0, max = 1): number {
  return Math.min(max, Math.max(min, value));
}

function easeInOut(value: number): number {
  return value * value * (3 - 2 * value);
}

interface FieldMeasurements {
  worldTop: number;
  scrollRange: number;
}

function measureWorld(world: HTMLElement): FieldMeasurements {
  const worldTop = world.getBoundingClientRect().top + window.scrollY;
  return {
    worldTop,
    scrollRange: Math.max(1, world.offsetHeight - window.innerHeight),
  };
}

function getWorldProgress(measurements: FieldMeasurements): number {
  return clamp((window.scrollY - measurements.worldTop) / measurements.scrollRange);
}

function applyFieldProgress(
  world: HTMLElement,
  stage: HTMLElement,
  layers: HTMLElement[],
  chapters: HTMLElement[],
  navLinks: HTMLElement[],
  progress: number,
): void {
  const chapterProgress = progress * (CHAPTER_COUNT - 1);
  stage.style.setProperty('--field-progress', progress.toFixed(4));
  stage.style.setProperty('--field-chapter-progress', chapterProgress.toFixed(4));
  stage.style.setProperty('--field-depth-shift', `${Math.sin(progress * Math.PI) * 1.25}%`);
  stage.style.setProperty('--field-grid-shift', `${progress * -10}%`);

  layers.forEach((layer) => {
    const index = Number(layer.dataset.fieldLayerIndex ?? 0);
    const focus = easeInOut(clamp(1 - Math.abs(chapterProgress - index)));
    layer.style.setProperty('--field-layer-focus', focus.toFixed(4));
  });

  const activeIndex = Math.min(CHAPTER_COUNT - 1, Math.round(chapterProgress));
  if (world.dataset.fieldActiveIndex === String(activeIndex)) return;

  world.dataset.fieldActiveIndex = String(activeIndex);
  chapters.forEach((chapter) => {
    const isActive = chapter.dataset.fieldChapterIndex === String(activeIndex);
    chapter.toggleAttribute('data-field-active', isActive);
    chapter.setAttribute('aria-current', isActive ? 'step' : 'false');
  });
  navLinks.forEach((link) => {
    const isActive = link.dataset.fieldChapterNavIndex === String(activeIndex);
    link.setAttribute('aria-current', isActive ? 'step' : 'false');
  });
  const activeLink = navLinks.find((link) => link.dataset.fieldChapterNavIndex === String(activeIndex));
  if (activeLink && typeof activeLink.scrollIntoView === 'function') {
    activeLink.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }
}

function setHeaderState(header: HTMLElement | null, scrolled: boolean): void {
  header?.toggleAttribute('data-field-scrolled', scrolled);
}

export function HomeFieldLabMotion() {
  useEffect(() => {
    const world = document.querySelector<HTMLElement>('[data-field-world]');
    if (!world || typeof window.matchMedia !== 'function') return;

    const stage = world.querySelector<HTMLElement>('[data-field-stage]');
    if (!stage) return;

    const layers = Array.from(stage.querySelectorAll<HTMLElement>('[data-field-layer-index]'));
    const chapters = Array.from(world.querySelectorAll<HTMLElement>('[data-field-chapter-index]'));
    const navLinks = Array.from(world.querySelectorAll<HTMLElement>('[data-field-chapter-nav-index]'));
    const header = document.querySelector<HTMLElement>('[data-field-header]');
    const motionPreference = window.matchMedia(REDUCED_MOTION_QUERY);
    const compactViewport = window.matchMedia(COMPACT_VIEWPORT_QUERY);
    const measurements: FieldMeasurements = { worldTop: 0, scrollRange: 1 };
    let frameId = 0;
    let currentProgress = 0;
    let targetProgress = 0;
    let isHidden = document.hidden;
    let isWorldVisible = true;
    let dynamicListenersAttached = false;

    const cancelFrame = () => {
      if (!frameId) return;
      window.cancelAnimationFrame(frameId);
      frameId = 0;
    };

    const measure = () => {
      const next = measureWorld(world);
      measurements.worldTop = next.worldTop;
      measurements.scrollRange = next.scrollRange;
    };

    const updateHeader = () => setHeaderState(header, window.scrollY > 28);

    const render = () => {
      frameId = 0;
      if (isHidden || !isWorldVisible || !dynamicListenersAttached) return;

      const difference = targetProgress - currentProgress;
      if (Math.abs(difference) < 0.0008) {
        currentProgress = targetProgress;
      } else {
        currentProgress += difference * 0.12;
      }

      applyFieldProgress(world, stage, layers, chapters, navLinks, currentProgress);

      if (Math.abs(targetProgress - currentProgress) >= 0.0008) {
        frameId = window.requestAnimationFrame(render);
      }
    };

    const requestRender = () => {
      if (!dynamicListenersAttached || isHidden || !isWorldVisible) return;

      targetProgress = getWorldProgress(measurements);
      updateHeader();
      if (!frameId) frameId = window.requestAnimationFrame(render);
    };

    const handleScroll = () => requestRender();
    const handleResize = () => {
      measure();
      requestRender();
    };
    const handleLoad = () => {
      measure();
      requestRender();
    };

    const attachDynamicListeners = () => {
      if (dynamicListenersAttached) return;
      dynamicListenersAttached = true;
      measure();
      currentProgress = getWorldProgress(measurements);
      targetProgress = currentProgress;
      applyFieldProgress(world, stage, layers, chapters, navLinks, currentProgress);
      window.addEventListener('scroll', handleScroll, { passive: true });
      window.addEventListener('resize', handleResize);
      window.addEventListener('load', handleLoad);
      requestRender();
    };

    const detachDynamicListeners = () => {
      if (!dynamicListenersAttached) return;
      dynamicListenersAttached = false;
      cancelFrame();
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('load', handleLoad);
    };

    const applyPresentationMode = () => {
      const isStatic = motionPreference.matches || compactViewport.matches;
      world.toggleAttribute('data-field-reduced-motion', motionPreference.matches);
      world.toggleAttribute('data-field-static', isStatic);

      if (isStatic) {
        detachDynamicListeners();
        currentProgress = 0;
        targetProgress = 0;
        applyFieldProgress(world, stage, layers, chapters, navLinks, 0);
        updateHeader();
        return;
      }

      attachDynamicListeners();
    };

    const handleVisibility = () => {
      isHidden = document.hidden;
      if (isHidden) {
        cancelFrame();
        return;
      }
      requestRender();
    };

    const handleWorldVisibility = (entries: IntersectionObserverEntry[]) => {
      const entry = entries[0];
      if (!entry) return;
      isWorldVisible = entry.isIntersecting;
      if (!isWorldVisible) cancelFrame();
      else requestRender();
    };

    const chapterObserver = typeof IntersectionObserver === 'function'
      ? new IntersectionObserver(
          (entries) => {
            entries.forEach((entry) => {
              const chapter = entry.target as HTMLElement;
              chapter.toggleAttribute('data-field-inview', entry.isIntersecting);
            });
          },
          { rootMargin: '-28% 0px -28% 0px', threshold: 0 },
        )
      : null;
    const worldObserver = typeof IntersectionObserver === 'function'
      ? new IntersectionObserver(handleWorldVisibility, { rootMargin: '200px 0px' })
      : null;
    const worldResizeObserver = typeof ResizeObserver === 'function'
      ? new ResizeObserver(() => {
          measure();
          requestRender();
        })
      : null;

    chapters.forEach((chapter) => chapterObserver?.observe(chapter));
    worldObserver?.observe(world);
    worldResizeObserver?.observe(world);
    document.addEventListener('visibilitychange', handleVisibility);

    const addMediaListener = (query: MediaQueryList, listener: (event: MediaQueryListEvent) => void) => {
      if (query.addEventListener) query.addEventListener('change', listener);
      else query.addListener(listener);
    };
    const removeMediaListener = (query: MediaQueryList, listener: (event: MediaQueryListEvent) => void) => {
      if (query.removeEventListener) query.removeEventListener('change', listener);
      else query.removeListener(listener);
    };
    const handleModeChange = () => applyPresentationMode();
    addMediaListener(motionPreference, handleModeChange);
    addMediaListener(compactViewport, handleModeChange);

    applyPresentationMode();
    world.dataset.fieldMotion = 'ready';

    return () => {
      detachDynamicListeners();
      chapterObserver?.disconnect();
      worldObserver?.disconnect();
      worldResizeObserver?.disconnect();
      document.removeEventListener('visibilitychange', handleVisibility);
      removeMediaListener(motionPreference, handleModeChange);
      removeMediaListener(compactViewport, handleModeChange);
      setHeaderState(header, false);
    };
  }, []);

  return null;
}
