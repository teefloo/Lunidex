'use client';

import { useEffect } from 'react';

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';
const COMPACT_VIEWPORT_QUERY = '(max-width: 1023px)';

function clamp(value: number, min = 0, max = 1): number {
  return Math.min(max, Math.max(min, value));
}

interface FieldMeasurements {
  worldTop: number;
  scrollRange: number;
  activationPoints: number[];
}

function getActivationViewportY(header: HTMLElement | null): number {
  const headerHeight = header?.getBoundingClientRect().height ?? 0;
  const safeTop = headerHeight + 24;
  const safeBottom = Math.max(safeTop + 1, window.innerHeight - 24);
  return safeTop + ((safeBottom - safeTop) / 2);
}

function measureWorld(
  world: HTMLElement,
  chapters: HTMLElement[],
  header: HTMLElement | null,
): FieldMeasurements {
  const worldTop = world.getBoundingClientRect().top + window.scrollY;
  const scrollRange = Math.max(1, world.offsetHeight - window.innerHeight);
  const activationViewportY = getActivationViewportY(header);
  const measuredPoints = chapters.map((chapter) => {
    const rect = chapter.getBoundingClientRect();
    const chapterHeight = rect.height || chapter.offsetHeight || window.innerHeight;
    const chapterCenter = rect.top + (chapterHeight / 2);
    return chapterCenter + window.scrollY - activationViewportY;
  });

  const pointsAreOrdered = measuredPoints.every((point, index) => index === 0 || point > measuredPoints[index - 1]);
  const measuredActivationPoints = pointsAreOrdered
    ? [Math.max(0, measuredPoints[0] ?? worldTop), ...measuredPoints.slice(1)]
    : [];
  const activationPointsAreOrdered = measuredActivationPoints.length > 0
    && measuredActivationPoints.every((point, index) => index === 0 || point > measuredActivationPoints[index - 1]);
  const activationPoints = activationPointsAreOrdered
    ? measuredActivationPoints
    : chapters.map((_, index) => worldTop + (scrollRange * index) / Math.max(1, chapters.length - 1));

  return { worldTop, scrollRange, activationPoints };
}

function getWorldProgress(measurements: FieldMeasurements): number {
  const points = measurements.activationPoints;
  if (points.length <= 1) return 0;

  const scrollY = window.scrollY;
  if (scrollY <= points[0]) return 0;
  const lastIndex = points.length - 1;
  if (scrollY >= points[lastIndex]) return 1;

  const index = points.findIndex((point, pointIndex) => (
    pointIndex < lastIndex && scrollY >= point && scrollY < points[pointIndex + 1]
  ));
  if (index < 0) return 0;

  const localProgress = (scrollY - points[index]) / Math.max(1, points[index + 1] - points[index]);
  return clamp((index + localProgress) / lastIndex);
}

function getWorldChapterIndex(measurements: FieldMeasurements): number {
  const points = measurements.activationPoints;
  if (points.length <= 1) return 0;

  const scrollY = window.scrollY;
  let activeIndex = 0;
  points.forEach((point, index) => {
    if (scrollY >= point) activeIndex = index;
  });

  return Math.min(points.length - 1, activeIndex);
}

function applyActiveIndex(
  world: HTMLElement,
  chapters: HTMLElement[],
  activeIndex: number,
): void {
  const normalizedIndex = Math.max(0, Math.min(chapters.length - 1, activeIndex));
  if (world.dataset.fieldActiveIndex === String(normalizedIndex)) return;

  world.dataset.fieldActiveIndex = String(normalizedIndex);
  chapters.forEach((chapter) => {
    chapter.toggleAttribute('data-field-active', chapter.dataset.fieldChapterIndex === String(normalizedIndex));
  });
}

function applyFieldProgress(
  world: HTMLElement,
  stage: HTMLElement,
  layers: HTMLElement[],
  chapters: HTMLElement[],
  progress: number,
  activeIndex = Math.round(progress * Math.max(0, chapters.length - 1)),
): void {
  const chapterCount = Math.max(1, chapters.length || layers.length);
  const chapterProgress = progress * Math.max(0, chapterCount - 1);
  stage.style.setProperty('--field-progress', progress.toFixed(4));
  stage.style.setProperty('--field-chapter-progress', chapterProgress.toFixed(4));
  stage.style.setProperty('--field-depth-shift', `${Math.sin(progress * Math.PI) * 1.25}%`);
  stage.style.setProperty('--field-grid-shift', `${progress * -10}%`);

  // The terminal is a readable state machine: never expose two boards at once.
  const normalizedActiveIndex = Math.min(chapterCount - 1, Math.max(0, activeIndex));
  layers.forEach((layer) => {
    const index = Number(layer.dataset.fieldLayerIndex ?? 0);
    const isActive = index === normalizedActiveIndex;
    const focus = isActive ? 1 : 0;
    layer.style.setProperty('--field-layer-focus', focus.toFixed(4));
    layer.style.setProperty('--field-layer-z', isActive ? '100' : '0');
    layer.toggleAttribute('data-field-layer-active', isActive);
  });

  applyActiveIndex(world, chapters, normalizedActiveIndex);
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
    const header = document.querySelector<HTMLElement>('[data-field-header]');
    const motionPreference = window.matchMedia(REDUCED_MOTION_QUERY);
    const compactViewport = window.matchMedia(COMPACT_VIEWPORT_QUERY);
    const measurements: FieldMeasurements = { worldTop: 0, scrollRange: 1, activationPoints: [] };
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
      const next = measureWorld(world, chapters, header);
      measurements.worldTop = next.worldTop;
      measurements.scrollRange = next.scrollRange;
      measurements.activationPoints = next.activationPoints;
    };

    const updateHeader = () => setHeaderState(header, window.scrollY > 28);

    const render = () => {
      frameId = 0;
      if (isHidden || !isWorldVisible || !dynamicListenersAttached) return;

      if (motionPreference.matches) {
        currentProgress = targetProgress;
      } else {
        const difference = targetProgress - currentProgress;
        currentProgress = Math.abs(difference) < 0.0008
          ? targetProgress
          : currentProgress + difference * 0.12;
      }

      applyFieldProgress(
        world,
        stage,
        layers,
        chapters,
        currentProgress,
        getWorldChapterIndex(measurements),
      );

      if (!motionPreference.matches && Math.abs(targetProgress - currentProgress) >= 0.0008) {
        frameId = window.requestAnimationFrame(render);
      }
    };

    const requestRender = () => {
      if (!dynamicListenersAttached || isHidden || !isWorldVisible) return;

      targetProgress = getWorldProgress(measurements);
      updateHeader();
      if (motionPreference.matches) {
        render();
      } else if (!frameId) {
        frameId = window.requestAnimationFrame(render);
      }
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
    const handleHeaderScroll = () => updateHeader();

    const attachDynamicListeners = () => {
      if (dynamicListenersAttached) return;
      dynamicListenersAttached = true;
      measure();
      currentProgress = getWorldProgress(measurements);
      targetProgress = currentProgress;
      applyFieldProgress(
        world,
        stage,
        layers,
        chapters,
        currentProgress,
        getWorldChapterIndex(measurements),
      );
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
      const isCompact = compactViewport.matches;
      world.toggleAttribute('data-field-reduced-motion', motionPreference.matches);
      world.toggleAttribute('data-field-static', isCompact || motionPreference.matches);

      detachDynamicListeners();
      measure();

      if (isCompact) {
        currentProgress = 0;
        targetProgress = 0;
      applyFieldProgress(world, stage, layers, chapters, 0, 0);
        updateHeader();
        return;
      }

      attachDynamicListeners();
    };

    const handleVisibility = () => {
      isHidden = document.hidden;
      if (isHidden) cancelFrame();
      else requestRender();
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
            if (!entries.some((entry) => entry.isIntersecting)) return;
            // IntersectionObserver is only a layout invalidation hint. The
            // conductor remains the single source of truth for the chapter
            // threshold so the story copy and terminal cannot disagree.
            measure();
            requestRender();
          },
          { rootMargin: '-42% 0px -42% 0px', threshold: 0 },
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
    window.addEventListener('scroll', handleHeaderScroll, { passive: true });

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
    updateHeader();
    world.dataset.fieldMotion = 'ready';

    return () => {
      detachDynamicListeners();
      chapterObserver?.disconnect();
      worldObserver?.disconnect();
      worldResizeObserver?.disconnect();
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('scroll', handleHeaderScroll);
      removeMediaListener(motionPreference, handleModeChange);
      removeMediaListener(compactViewport, handleModeChange);
      setHeaderState(header, false);
    };
  }, []);

  return null;
}
