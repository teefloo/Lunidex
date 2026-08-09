'use client';

import { useEffect } from 'react';

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

function clamp(value: number) {
  return Math.min(1, Math.max(0, value));
}

function applyArchiveMotion(element: HTMLElement, progress: number) {
  element.style.setProperty('--archive-field-halo-x', `${progress * 2}vw`);
  element.style.setProperty('--archive-field-halo-y', `${progress * -10}vh`);
  element.style.setProperty('--archive-field-halo-scale', `${1 + progress * 0.08}`);
  element.style.setProperty('--archive-field-grid-x', `${progress * 5}vw`);
  element.style.setProperty('--archive-field-grid-y', `${progress * -14}vh`);
  element.style.setProperty('--archive-field-wide-x', `${progress * -6}vw`);
  element.style.setProperty('--archive-field-wide-y', `${progress * -3}vh`);
  element.style.setProperty('--archive-field-wide-rotate', `${progress * 7}deg`);
  element.style.setProperty('--archive-field-tall-x', `${progress * 4}vw`);
  element.style.setProperty('--archive-field-tall-y', `${progress * 5}vh`);
  element.style.setProperty('--archive-field-tall-rotate', `${progress * -9}deg`);
  element.style.setProperty('--archive-field-mark-top-y', `${progress * 5}vh`);
  element.style.setProperty('--archive-field-mark-bottom-y', `${progress * -5}vh`);
}

export function LunidexArchiveMotion() {
  useEffect(() => {
    const backdrop = document.querySelector<HTMLElement>('.lunidex-world-backdrop');
    if (!backdrop || typeof window.matchMedia !== 'function') return;

    const motionPreference = window.matchMedia(REDUCED_MOTION_QUERY);
    let animationFrame = 0;
    let currentProgress = 0;
    let targetProgress = 0;
    let isListening = false;

    const getScrollProgress = () => {
      const scrollRange = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      return clamp(window.scrollY / scrollRange);
    };

    const render = () => {
      animationFrame = 0;
      const remaining = targetProgress - currentProgress;

      if (Math.abs(remaining) < 0.001) {
        currentProgress = targetProgress;
      } else {
        currentProgress += remaining * 0.1;
      }

      applyArchiveMotion(backdrop, currentProgress);

      if (currentProgress !== targetProgress) {
        animationFrame = window.requestAnimationFrame(render);
      }
    };

    const requestRender = () => {
      targetProgress = getScrollProgress();
      if (!animationFrame) {
        animationFrame = window.requestAnimationFrame(render);
      }
    };

    const startListening = () => {
      if (isListening) return;
      isListening = true;
      window.addEventListener('scroll', requestRender, { passive: true });
      window.addEventListener('resize', requestRender);
      requestRender();
    };

    const stopListening = () => {
      if (!isListening) return;
      isListening = false;
      window.removeEventListener('scroll', requestRender);
      window.removeEventListener('resize', requestRender);
      if (animationFrame) {
        window.cancelAnimationFrame(animationFrame);
        animationFrame = 0;
      }
      currentProgress = 0;
      targetProgress = 0;
      applyArchiveMotion(backdrop, 0);
    };

    const handleMotionPreference = () => {
      if (motionPreference.matches) {
        stopListening();
      } else {
        startListening();
      }
    };

    motionPreference.addEventListener('change', handleMotionPreference);
    applyArchiveMotion(backdrop, 0);
    handleMotionPreference();

    return () => {
      stopListening();
      motionPreference.removeEventListener('change', handleMotionPreference);
    };
  }, []);

  return null;
}
