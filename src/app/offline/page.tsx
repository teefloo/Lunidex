import Link from 'next/link';
import { ArrowUpRight, RefreshCw, WifiOff } from 'lucide-react';

import LunidexLogo from '@/components/ui/LunidexLogo';
import { getServerLanguage, getServerT } from '@/lib/server-i18n';

const OFFLINE_PAGE_STYLES = `
  body:has(.offline-page) {
    margin: 0;
    background: #f2f6ff;
  }

  .offline-page {
    --offline-bg: var(--background, #f2f6ff);
    --offline-fg: var(--foreground, #14265d);
    --offline-panel: var(--card, #ffffff);
    --offline-muted: var(--muted-foreground, #53658e);
    --offline-accent: var(--primary, #5243b5);
    --offline-accent-foreground: var(--primary-foreground, #ffffff);
    --offline-border: rgba(35, 62, 128, 0.18);
    --offline-shadow: rgba(35, 62, 128, 0.18);
    --offline-glow: rgba(141, 180, 255, 0.34);

    position: relative;
    isolation: isolate;
    display: flex;
    min-height: 100dvh;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    padding: calc(1.5rem + env(safe-area-inset-top, 0px)) clamp(1rem, 5vw, 4rem)
      calc(1.5rem + env(safe-area-inset-bottom, 0px));
    color: var(--offline-fg);
    font-family: var(--font-body, 'Nunito', ui-sans-serif, system-ui, sans-serif);
    background:
      radial-gradient(circle at 50% -12%, rgba(141, 180, 255, 0.34), transparent 42%),
      radial-gradient(circle at 0% 100%, rgba(201, 184, 255, 0.28), transparent 34%),
      var(--offline-bg);
  }

  .offline-page::before {
    position: absolute;
    inset: 0;
    z-index: -2;
    content: '';
    pointer-events: none;
    opacity: 0.46;
    background-image: radial-gradient(rgba(82, 67, 181, 0.17) 1px, transparent 1px);
    background-size: 22px 22px;
    mask-image: linear-gradient(to bottom, black, transparent 76%);
  }

  .offline-page::after {
    position: absolute;
    inset: 0;
    z-index: -1;
    content: '';
    pointer-events: none;
    background: linear-gradient(135deg, transparent 0 48%, rgba(255, 255, 255, 0.23) 48.2% 48.5%, transparent 48.7%);
    opacity: 0.34;
  }

  .dark .offline-page {
    --offline-bg: var(--background, #07144f);
    --offline-fg: var(--foreground, #fff8fc);
    --offline-panel: var(--card, #123b86);
    --offline-muted: var(--muted-foreground, #a9b9e8);
    --offline-accent: var(--primary, #c9b8ff);
    --offline-accent-foreground: var(--primary-foreground, #10164f);
    --offline-border: rgba(201, 184, 255, 0.28);
    --offline-shadow: rgba(2, 7, 38, 0.48);
    --offline-glow: rgba(141, 180, 255, 0.24);
  }

  @media (prefers-color-scheme: dark) {
    :root:not(.light) .offline-page {
      --offline-bg: var(--background, #07144f);
      --offline-fg: var(--foreground, #fff8fc);
      --offline-panel: var(--card, #123b86);
      --offline-muted: var(--muted-foreground, #a9b9e8);
      --offline-accent: var(--primary, #c9b8ff);
      --offline-accent-foreground: var(--primary-foreground, #10164f);
      --offline-border: rgba(201, 184, 255, 0.28);
      --offline-shadow: rgba(2, 7, 38, 0.48);
      --offline-glow: rgba(141, 180, 255, 0.24);
    }
  }

  .offline-page__ambient {
    position: absolute;
    z-index: -1;
    width: clamp(16rem, 38vw, 31rem);
    aspect-ratio: 1;
    border: 1px solid var(--offline-border);
    border-radius: 50%;
    opacity: 0.48;
    pointer-events: none;
  }

  .offline-page__ambient::after {
    position: absolute;
    inset: 13%;
    border: 1px dashed var(--offline-border);
    border-radius: inherit;
    content: '';
  }

  .offline-page__ambient--top {
    top: clamp(-18rem, -25vw, -8rem);
    right: clamp(-13rem, -15vw, -4rem);
    transform: rotate(18deg);
  }

  .offline-page__ambient--bottom {
    bottom: clamp(-18rem, -24vw, -7rem);
    left: clamp(-14rem, -17vw, -4rem);
    transform: rotate(-24deg);
  }

  .offline-page__panel {
    position: relative;
    z-index: 1;
    width: min(100%, 35rem);
    padding: clamp(1.25rem, 4vw, 2rem);
    overflow: hidden;
    border: 1px solid var(--offline-border);
    border-radius: 1.35rem 1.35rem 0.7rem 1.35rem;
    background: linear-gradient(145deg, rgba(255, 255, 255, 0.88), var(--offline-panel) 62%);
    box-shadow: 9px 9px 0 var(--offline-shadow), 0 28px 70px rgba(35, 62, 128, 0.16);
  }

  .dark .offline-page__panel {
    background: linear-gradient(145deg, rgba(18, 59, 134, 0.96), rgba(7, 20, 79, 0.96));
    box-shadow: 9px 9px 0 var(--offline-shadow), 0 28px 70px rgba(2, 7, 38, 0.36);
  }

  .offline-page__panel::before {
    position: absolute;
    top: 0;
    right: 1.5rem;
    left: 1.5rem;
    height: 3px;
    border-radius: 0 0 99px 99px;
    content: '';
    background: linear-gradient(90deg, transparent, var(--offline-accent), transparent);
    opacity: 0.8;
  }

  .offline-page__panel-top,
  .offline-page__actions,
  .offline-page__status,
  .offline-page__home,
  .offline-page__retry,
  .offline-page__note,
  .offline-page__meta {
    display: flex;
    align-items: center;
  }

  .offline-page__panel-top {
    justify-content: space-between;
    gap: 1rem;
  }

  .offline-page__status {
    min-height: 2.25rem;
    gap: 0.5rem;
    padding: 0.45rem 0.75rem;
    border: 1px solid var(--offline-border);
    border-radius: 999px;
    color: var(--offline-accent);
    background: rgba(201, 184, 255, 0.14);
    font-family: var(--font-mono, ui-monospace, monospace);
    font-size: 0.68rem;
    font-weight: 700;
    letter-spacing: 0.12em;
    line-height: 1;
    text-transform: uppercase;
  }

  .offline-page__status svg {
    width: 1rem;
    height: 1rem;
  }

  .offline-page__status-dot {
    width: 0.5rem;
    height: 0.5rem;
    flex: 0 0 auto;
    border-radius: 50%;
    background: var(--destructive, #c94355);
    box-shadow: 0 0 0 4px rgba(201, 67, 85, 0.12);
    animation: offline-status-pulse 2.4s ease-in-out infinite;
  }

  .offline-page__code,
  .offline-page__meta {
    color: var(--offline-muted);
    font-family: var(--font-mono, ui-monospace, monospace);
    font-size: 0.62rem;
    font-weight: 700;
    letter-spacing: 0.14em;
    text-transform: uppercase;
  }

  .offline-page__code {
    opacity: 0.72;
  }

  .offline-page__beacon {
    position: relative;
    display: grid;
    width: clamp(11rem, 44vw, 14rem);
    height: clamp(11rem, 44vw, 14rem);
    margin: clamp(1.5rem, 5vw, 2.25rem) auto 1.25rem;
    place-items: center;
  }

  .offline-page__beacon::before {
    position: absolute;
    width: 7.8rem;
    height: 7.8rem;
    border-radius: 50%;
    content: '';
    background: radial-gradient(circle, var(--offline-glow), transparent 68%);
    box-shadow: 0 0 0 1px rgba(141, 180, 255, 0.14), 0 0 55px var(--offline-glow);
  }

  .offline-page__orbit {
    position: absolute;
    border: 1px dashed var(--offline-border);
    border-radius: 50%;
    transform: rotate(-22deg);
    animation: offline-orbit 18s linear infinite;
  }

  .offline-page__orbit--outer {
    width: 100%;
    height: 47%;
  }

  .offline-page__orbit--inner {
    width: 72%;
    height: 72%;
    transform: rotate(28deg);
    opacity: 0.78;
  }

  .offline-page__orbit-dot {
    position: absolute;
    width: 0.48rem;
    height: 0.48rem;
    border-radius: 50%;
    background: var(--offline-accent);
    box-shadow: 0 0 0 4px rgba(201, 184, 255, 0.16);
  }

  .offline-page__orbit-dot--one {
    top: 16%;
    right: 9%;
  }

  .offline-page__orbit-dot--two {
    bottom: 9%;
    left: 17%;
    width: 0.35rem;
    height: 0.35rem;
    opacity: 0.7;
  }

  .offline-page__beacon-mark {
    position: relative;
    z-index: 1;
    display: grid;
    width: 7.5rem;
    height: 7.5rem;
    place-items: center;
    border: 2px solid rgba(255, 255, 255, 0.58);
    border-radius: 1.6rem 1.6rem 0.7rem 1.6rem;
    background: linear-gradient(145deg, rgba(255, 255, 255, 0.64), rgba(201, 184, 255, 0.26));
    box-shadow: 0 0 0 9px rgba(201, 184, 255, 0.13), 0 18px 34px var(--offline-shadow);
    transform: rotate(-4deg);
  }

  .offline-page__logo {
    width: 6.1rem;
    height: 6.1rem;
    object-fit: contain;
  }

  .offline-page__signal {
    position: absolute;
    right: -0.75rem;
    bottom: -0.65rem;
    z-index: 2;
    display: grid;
    width: 2.75rem;
    height: 2.75rem;
    place-items: center;
    border: 2px solid var(--offline-panel);
    border-radius: 0.75rem;
    color: var(--offline-accent-foreground);
    background: var(--offline-accent);
    box-shadow: 4px 4px 0 var(--offline-shadow);
    transform: rotate(7deg);
  }

  .offline-page__signal svg {
    width: 1.2rem;
    height: 1.2rem;
  }

  .offline-page__copy {
    text-align: center;
  }

  .offline-page__wordmark {
    margin: 0 0 0.6rem;
    color: var(--offline-accent);
    font-family: var(--font-mono, ui-monospace, monospace);
    font-size: 0.68rem;
    font-weight: 800;
    letter-spacing: 0.28em;
    text-transform: uppercase;
  }

  .offline-page__title {
    max-width: 12ch;
    margin: 0 auto;
    color: var(--offline-fg);
    font-family: var(--font-display, 'Pixelify Sans', ui-sans-serif, system-ui, sans-serif);
    font-size: clamp(2rem, 7vw, 3.35rem);
    font-weight: 700;
    letter-spacing: -0.035em;
    line-height: 0.98;
  }

  .offline-page__description {
    max-width: 34rem;
    margin: 1rem auto 0;
    color: var(--offline-muted);
    font-size: 1rem;
    line-height: 1.55;
  }

  .offline-page__actions {
    flex-wrap: wrap;
    justify-content: center;
    gap: 0.75rem;
    margin-top: 1.75rem;
  }

  .offline-page__retry,
  .offline-page__home {
    min-height: 3rem;
    min-width: 10.75rem;
    justify-content: center;
    gap: 0.55rem;
    padding: 0.75rem 1.1rem;
    border-radius: 0.55rem;
    font-size: 0.88rem;
    font-weight: 800;
    line-height: 1;
    text-decoration: none;
    transition: transform 140ms ease, box-shadow 140ms ease, background-color 140ms ease;
  }

  .offline-page__retry {
    border: 1px solid var(--offline-accent);
    color: var(--offline-accent-foreground);
    background: var(--offline-accent);
    box-shadow: 4px 4px 0 var(--offline-shadow);
    cursor: pointer;
  }

  .offline-page__home {
    border: 1px solid var(--offline-border);
    color: var(--offline-fg);
    background: rgba(255, 255, 255, 0.3);
  }

  .dark .offline-page__home {
    background: rgba(8, 21, 74, 0.34);
  }

  .offline-page__retry:hover,
  .offline-page__home:hover {
    transform: translate(-1px, -1px);
  }

  .offline-page__retry:hover {
    box-shadow: 6px 6px 0 var(--offline-shadow);
  }

  .offline-page__home:hover {
    border-color: var(--offline-accent);
    background: rgba(201, 184, 255, 0.14);
  }

  .offline-page__retry:active,
  .offline-page__home:active {
    transform: translate(1px, 1px);
  }

  .offline-page__retry:focus-visible,
  .offline-page__home:focus-visible {
    outline: 3px solid var(--offline-accent);
    outline-offset: 3px;
  }

  .offline-page__retry svg,
  .offline-page__home svg {
    width: 1rem;
    height: 1rem;
    flex: 0 0 auto;
  }

  .offline-page__note {
    justify-content: center;
    gap: 0.55rem;
    margin: 1.75rem 0 0;
    padding-top: 1.1rem;
    border-top: 1px solid var(--offline-border);
    color: var(--offline-muted);
    font-size: 0.78rem;
    line-height: 1.45;
    text-align: center;
  }

  .offline-page__note-mark {
    width: 0.38rem;
    height: 0.38rem;
    flex: 0 0 auto;
    border-radius: 50%;
    background: var(--offline-accent);
  }

  .offline-page__meta {
    justify-content: center;
    gap: 0.65rem;
    margin-top: 1.35rem;
    opacity: 0.68;
  }

  @keyframes offline-orbit {
    from { transform: rotate(-22deg); }
    to { transform: rotate(338deg); }
  }

  @keyframes offline-status-pulse {
    0%, 100% { opacity: 0.66; transform: scale(0.9); }
    50% { opacity: 1; transform: scale(1); }
  }

  @media (max-width: 34rem) {
    .offline-page__panel-top {
      align-items: flex-start;
    }

    .offline-page__code {
      display: none;
    }

    .offline-page__actions > * {
      width: 100%;
    }

    .offline-page__note {
      align-items: flex-start;
      text-align: left;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .offline-page__orbit,
    .offline-page__status-dot {
      animation: none;
    }

    .offline-page__retry,
    .offline-page__home {
      transition: none;
    }
  }
`;

export default async function OfflinePage() {
  const t = await getServerT();
  const language = await getServerLanguage();

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: OFFLINE_PAGE_STYLES }} />
      <main className="offline-page" aria-labelledby="offline-title">
        <div className="offline-page__ambient offline-page__ambient--top" aria-hidden="true" />
        <div className="offline-page__ambient offline-page__ambient--bottom" aria-hidden="true" />

        <section className="offline-page__panel" aria-describedby="offline-description">
          <div className="offline-page__panel-top">
            <p className="offline-page__status" role="status">
              <span className="offline-page__status-dot" aria-hidden="true" />
              <WifiOff aria-hidden="true" />
              <span>{t('offline.eyebrow')}</span>
            </p>
            <span className="offline-page__code" aria-hidden="true">LNX / 00</span>
          </div>

          <div className="offline-page__beacon" aria-hidden="true">
            <span className="offline-page__orbit offline-page__orbit--outer" />
            <span className="offline-page__orbit offline-page__orbit--inner" />
            <span className="offline-page__orbit-dot offline-page__orbit-dot--one" />
            <span className="offline-page__orbit-dot offline-page__orbit-dot--two" />
            <span className="offline-page__beacon-mark">
              <LunidexLogo alt="" sizes="98px" className="offline-page__logo" priority />
              <span className="offline-page__signal">
                <WifiOff aria-hidden="true" />
              </span>
            </span>
          </div>

          <div className="offline-page__copy">
            <p className="offline-page__wordmark" aria-label="Lunidex">Lunidex</p>
            <h1 id="offline-title" className="offline-page__title">
              {t('offline.title')}
            </h1>
            <p id="offline-description" className="offline-page__description">
              {t('offline.description')}
            </p>
          </div>

          <form className="offline-page__actions" method="get" action="">
            <button className="offline-page__retry" type="submit">
              <RefreshCw aria-hidden="true" />
              <span>{t('offline.retry')}</span>
            </button>
            <Link className="offline-page__home" href={`/${language}`} prefetch={false}>
              <span>{t('offline.home')}</span>
              <ArrowUpRight aria-hidden="true" />
            </Link>
          </form>

          <p className="offline-page__note">
            <span className="offline-page__note-mark" aria-hidden="true" />
            <span>{t('offline.local_note')}</span>
          </p>
        </section>

        <div className="offline-page__meta" aria-hidden="true">
          <span>LUNIDEX</span>
          <span>•</span>
          <span>LOCAL-FIRST</span>
        </div>
      </main>
    </>
  );
}
