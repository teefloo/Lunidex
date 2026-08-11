'use client';

import { useEffect } from 'react';

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';
const CHAPTER_COUNT = 6;

function clamp(value: number, min = 0, max = 1): number {
  return Math.min(max, Math.max(min, value));
}

function easeInOut(value: number): number {
  return value * value * (3 - 2 * value);
}

function getWorldProgress(world: HTMLElement): number {
  const worldTop = world.getBoundingClientRect().top + window.scrollY;
  const scrollRange = Math.max(1, world.offsetHeight - window.innerHeight);
  return clamp((window.scrollY - worldTop) / scrollRange);
}

function applyFieldProgress(world: HTMLElement, progress: number): void {
  const stage = world.querySelector<HTMLElement>('[data-field-stage]');
  if (!stage) return;

  const chapterProgress = progress * (CHAPTER_COUNT - 1);
  stage.style.setProperty('--field-progress', progress.toFixed(4));
  stage.style.setProperty('--field-chapter-progress', chapterProgress.toFixed(4));
  stage.style.setProperty('--field-depth-shift', `${Math.sin(progress * Math.PI) * 1.25}%`);
  stage.style.setProperty('--field-grid-shift', `${progress * -10}%`);

  const layers = stage.querySelectorAll<HTMLElement>('[data-field-layer-index]');
  layers.forEach((layer) => {
    const index = Number(layer.dataset.fieldLayerIndex ?? 0);
    const focus = easeInOut(clamp(1 - Math.abs(chapterProgress - index)));
    layer.style.setProperty('--field-layer-focus', focus.toFixed(4));
  });

  const activeIndex = Math.min(CHAPTER_COUNT - 1, Math.round(chapterProgress));
  if (world.dataset.fieldActiveIndex !== String(activeIndex)) {
    world.dataset.fieldActiveIndex = String(activeIndex);
    world.querySelectorAll<HTMLElement>('[data-field-chapter-index]').forEach((chapter) => {
      const isActive = chapter.dataset.fieldChapterIndex === String(activeIndex);
      chapter.toggleAttribute('data-field-active', isActive);
      chapter.setAttribute('aria-current', isActive ? 'step' : 'false');
    });
    world.querySelectorAll<HTMLElement>('[data-field-chapter-nav-index]').forEach((link) => {
      const isActive = link.dataset.fieldChapterNavIndex === String(activeIndex);
      link.setAttribute('aria-current', isActive ? 'step' : 'false');
    });
  }
}

function setHeaderState(scrolled: boolean): void {
  const header = document.querySelector<HTMLElement>('[data-field-header]');
  header?.toggleAttribute('data-field-scrolled', scrolled);
}

export function HomeFieldLabMotion() {
  useEffect(() => {
    const world = document.querySelector<HTMLElement>('[data-field-world]');
    if (!world || typeof window.matchMedia !== 'function') return;

    const motionPreference = window.matchMedia(REDUCED_MOTION_QUERY);
    const chapters = Array.from(world.querySelectorAll<HTMLElement>('[data-field-chapter-index]'));
    let frameId = 0;
    let currentProgress = 0;
    let targetProgress = 0;
    let isHidden = document.hidden;

    const updateHeader = () => setHeaderState(window.scrollY > 28);

    const render = () => {
      frameId = 0;
      if (isHidden) return;

      const difference = targetProgress - currentProgress;
      if (motionPreference.matches) {
        currentProgress = targetProgress;
      } else if (Math.abs(difference) < 0.0008) {
        currentProgress = targetProgress;
      } else {
        currentProgress += difference * 0.12;
      }

      applyFieldProgress(world, currentProgress);

      if (!motionPreference.matches && Math.abs(targetProgress - currentProgress) >= 0.0008) {
        frameId = window.requestAnimationFrame(render);
      }
    };

    const requestRender = () => {
      targetProgress = getWorldProgress(world);
      updateHeader();

      if (motionPreference.matches) {
        currentProgress = targetProgress;
        applyFieldProgress(world, currentProgress);
        return;
      }

      if (!frameId && !isHidden) frameId = window.requestAnimationFrame(render);
    };

    const handleVisibility = () => {
      isHidden = document.hidden;
      if (isHidden && frameId) {
        window.cancelAnimationFrame(frameId);
        frameId = 0;
      }
      if (!isHidden) requestRender();
    };

    const handleMotionPreference = () => {
      world.toggleAttribute('data-field-reduced-motion', motionPreference.matches);
      currentProgress = getWorldProgress(world);
      targetProgress = currentProgress;
      applyFieldProgress(world, currentProgress);
      requestRender();
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
    const worldResizeObserver = typeof ResizeObserver === 'function'
      ? new ResizeObserver(() => requestRender())
      : null;
    const handleLoad = () => requestRender();

    chapters.forEach((chapter) => chapterObserver?.observe(chapter));
    worldResizeObserver?.observe(world);
    window.addEventListener('scroll', requestRender, { passive: true });
    window.addEventListener('resize', requestRender);
    window.addEventListener('load', handleLoad);
    document.addEventListener('visibilitychange', handleVisibility);
    motionPreference.addEventListener('change', handleMotionPreference);

    handleMotionPreference();
    world.dataset.fieldMotion = 'ready';

    return () => {
      if (frameId) window.cancelAnimationFrame(frameId);
      chapterObserver?.disconnect();
      worldResizeObserver?.disconnect();
      window.removeEventListener('scroll', requestRender);
      window.removeEventListener('resize', requestRender);
      window.removeEventListener('load', handleLoad);
      document.removeEventListener('visibilitychange', handleVisibility);
      motionPreference.removeEventListener('change', handleMotionPreference);
      setHeaderState(false);
    };
  }, []);

  return null;
}
