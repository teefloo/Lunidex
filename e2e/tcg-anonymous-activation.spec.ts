import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { expect, test, type Request } from '@playwright/test';

const campaignSlug = 'reddit-spd-20261011-lunidex';
const config = [
  { language: 'fr', locale: 'fr-FR', device: 'desktop' },
  { language: 'en', locale: 'en-US', device: 'desktop' },
  { language: 'fr', locale: 'fr-FR', device: 'mobile' },
  { language: 'en', locale: 'en-US', device: 'mobile' },
] as const;

test.describe('anonymous TCG activation cold start', () => {
  for (const scenario of config) {
    for (const stalledPersistence of [false, true]) {
      test(`${scenario.language.toUpperCase()} ${scenario.device} can complete the checklist from /go${stalledPersistence ? ' while IndexedDB is stalled' : ''}`, async ({ browser }, testInfo) => {
      const artifactDir = testInfo.outputPath();
      await mkdir(artifactDir, { recursive: true });
      const harPath = path.join(artifactDir, 'network.har');
      const tracePath = path.join(artifactDir, 'trace.zip');
      const startScreenshotPath = path.join(artifactDir, 'start.png');
      const checklistScreenshotPath = path.join(artifactDir, 'checklist.png');
      const summaryPath = path.join(artifactDir, 'diagnostics.json');
      const pageErrors: string[] = [];
      const consoleMessages: Array<{ type: string; text: string }> = [];
      const network: Array<{ url: string; method: string; type: string; status?: number; durationMs?: number; failure?: string }> = [];
      const requestRecords = new Map<Request, { startedAt: number; item: typeof network[number] }>();
      const stageTimes: Record<string, number> = {};
      const reactSnapshots: Array<{ stage: string; state: unknown }> = [];
      const failedRequests: string[] = [];
      const mobile = scenario.device === 'mobile';
      const context = await browser.newContext({
        locale: scenario.locale,
        viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 900 },
        deviceScaleFactor: mobile ? 3 : 1,
        isMobile: mobile,
        hasTouch: mobile,
        userAgent: mobile
          ? 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36'
          : undefined,
        recordHar: { path: harPath, mode: 'full', content: 'embed' },
      });
      if (stalledPersistence) {
        await context.addInitScript(`(() => {
          const probe = { indexedDbOpenedAt: null, storageTimeoutFired: false, catalogStartedBeforeTimeout: false };
          Object.defineProperty(window, '__lunidexE2eStorageProbe', { value: probe, configurable: false });
          const factory = window.indexedDB;
          const nativeOpen = factory.open.bind(factory);
          const stalledFactory = new Proxy(factory, {
            get(target, property) {
              if (property === 'open') {
                return (name, ...args) => {
                  if (name === 'keyval-store') {
                    probe.indexedDbOpenedAt = performance.now();
                    return { oncomplete: null, onsuccess: null, onabort: null, onerror: null, onupgradeneeded: null };
                  }
                  return nativeOpen(name, ...args);
                };
              }
              const value = Reflect.get(target, property, target);
              return typeof value === 'function' ? value.bind(target) : value;
            },
          });
          Object.defineProperty(window, 'indexedDB', { value: stalledFactory, configurable: true });
          const nativeSetTimeout = window.setTimeout.bind(window);
          window.setTimeout = (handler, delay, ...args) => {
            if (delay === 1500 && typeof handler === 'function') {
              return nativeSetTimeout(() => {
                probe.storageTimeoutFired = true;
                handler(...args);
              }, 30_000);
            }
            return nativeSetTimeout(handler, delay, ...args);
          };
          const nativeFetch = window.fetch.bind(window);
          window.fetch = (input, init) => {
            const requestUrl = input instanceof Request ? input.url : String(input);
            if (new URL(requestUrl, location.href).pathname === '/api/tcg/sets') {
              probe.catalogStartedBeforeTimeout = probe.indexedDbOpenedAt !== null && !probe.storageTimeoutFired;
              // Hold hydration open, but let Next's normal navigation timers run
              // once the startup catalogue request proves the page is live.
              window.setTimeout = nativeSetTimeout;
            }
            return nativeFetch(input, init);
          };
        })()`);
      }
      const page = await context.newPage();
      const startedAt = Date.now();
      let failure: unknown;
      const catalogResponses: Array<{ status: number; durationMs?: number; url: string }> = [];
      let interacted = false;

      context.on('request', (request) => {
        const item = { url: request.url(), method: request.method(), type: request.resourceType() } as typeof network[number];
        requestRecords.set(request, { startedAt: Date.now(), item });
        network.push(item);
      });
      context.on('response', (response) => {
        const record = requestRecords.get(response.request());
        if (record) {
          record.item.status = response.status();
          record.item.durationMs = Date.now() - record.startedAt;
        }
        if (new URL(response.url()).pathname === '/api/tcg/sets') {
          catalogResponses.push({ status: response.status(), durationMs: record ? Date.now() - record.startedAt : undefined, url: response.url() });
        }
      });
      context.on('requestfailed', (request) => {
        const message = `${request.method()} ${request.url()} — ${request.failure()?.errorText ?? 'unknown network failure'}`;
        failedRequests.push(message);
        const record = requestRecords.get(request);
        if (record) record.item.failure = request.failure()?.errorText ?? 'unknown network failure';
      });
      page.on('pageerror', (error) => pageErrors.push(error.stack ?? error.message));
      page.on('console', (message) => {
        if (message.type() === 'error' || message.type() === 'warning') {
          consoleMessages.push({ type: message.type(), text: message.text() });
        }
      });
      await context.tracing.start({ screenshots: true, snapshots: true, sources: true });

      const captureReactState = async (stage: string) => {
        const state = await page.evaluate(() => {
          const summarize = (value: unknown): unknown => {
            if (value === null || ['string', 'number', 'boolean', 'undefined'].includes(typeof value)) return value;
            if (Array.isArray(value)) return { kind: 'array', length: value.length, first: value.length ? summarize(value[0]) : undefined };
            if (typeof value === 'object') {
              const object = value as Record<string, unknown>;
              const keys = Object.keys(object).slice(0, 24);
              const fields = Object.fromEntries(keys.flatMap((key) => {
                const field = object[key];
                return field === null || ['string', 'number', 'boolean'].includes(typeof field)
                  ? [[key, field]]
                  : [];
              }));
              return { kind: Object.getPrototypeOf(object)?.constructor?.name ?? 'object', keys, fields };
            }
            return typeof value;
          };
          const main = document.querySelector('main') as (HTMLElement & Record<string, unknown>) | null;
          const fiberKey = main ? Object.keys(main).find((key) => key.startsWith('__reactFiber$')) : undefined;
          let fiber = fiberKey && main ? main[fiberKey] as { return?: unknown; type?: unknown; memoizedState?: unknown } : undefined;
          const components: Array<{ name: string; hooks: unknown[] }> = [];
          for (let depth = 0; fiber && depth < 30; depth += 1) {
            const current = fiber as { return?: unknown; type?: unknown; memoizedState?: unknown };
            if (typeof current.type === 'function') {
              const componentType = current.type as { displayName?: string; name?: string };
              const name = componentType.displayName ?? componentType.name ?? 'anonymous';
              const hooks: unknown[] = [];
              let hook = current.memoizedState as { memoizedState?: unknown; next?: unknown } | null;
              for (let hookIndex = 0; hook && hookIndex < 40; hookIndex += 1) {
                hooks.push(summarize(hook.memoizedState));
                hook = hook.next as typeof hook;
              }
              components.push({ name, hooks });
            }
            fiber = current.return as typeof fiber;
          }
          return {
            url: location.href,
            title: document.title,
            documentReadyState: document.readyState,
            visibleSearch: Boolean(document.querySelector('#set-search')?.getClientRects().length),
            loadingRegions: Array.from(document.querySelectorAll('[aria-busy="true"]')).map((element) => element.textContent?.slice(0, 100)),
            setLinks: Array.from(document.querySelectorAll('a[href*="activation=1"]')).slice(0, 12).map((element) => ({ text: element.textContent?.trim(), href: (element as HTMLAnchorElement).href })),
            mainText: document.querySelector('main')?.textContent?.trim().slice(0, 1200) ?? null,
            documentCookies: document.cookie.split(';').map((cookie) => cookie.split('=')[0]?.trim()).filter(Boolean),
            localStorageKeys: (() => { try { return Object.keys(localStorage); } catch { return ['unavailable']; } })(),
            apiResources: performance.getEntriesByType('resource')
              .filter((entry) => entry.name.includes('/api/tcg/sets'))
              .map((entry) => ({ name: entry.name, duration: entry.duration, startTime: entry.startTime })),
            e2eStorageProbe: (window as Window & { __lunidexE2eStorageProbe?: unknown }).__lunidexE2eStorageProbe ?? null,
            reactComponents: components.slice(0, 20),
            tcgStartComponent: components.find((component) => component.name.includes('TCGStartPage')) ?? null,
            reactQueryStates: components.flatMap((component) => component.hooks.flatMap((hook) => {
              if (!hook || typeof hook !== 'object' || !('fields' in hook)) return [];
              const fields = (hook as { fields?: Record<string, unknown> }).fields;
              return fields && typeof fields.status === 'string' && typeof fields.fetchStatus === 'string'
                ? [{ component: component.name, fields }]
                : [];
            })),
          };
        });
        reactSnapshots.push({ stage, state });
        return state;
      };

      try {
        const emptyState = await context.storageState();
        expect(emptyState.cookies, 'fresh browser context must start without cookies').toHaveLength(0);
        expect(emptyState.origins, 'fresh browser context must start without local or session storage').toHaveLength(0);

        await page.goto(`/go/${campaignSlug}`, { waitUntil: 'domcontentloaded', timeout: 25_000 });
        stageTimes.redirectedAtMs = Date.now() - startedAt;
        await expect(page).toHaveURL(new RegExp(`/${scenario.language}/tcg/start\\?`), { timeout: 8_000 });
        expect(page.url()).toContain(`campaign=${campaignSlug}`);
        await captureReactState('after-redirect');

        const setSearch = page.locator('#set-search');
        // The UI locale is FR/EN while the TCG data language defaults to EN.
        // The activation route therefore uses /collection/en/ for both locales.
        const setLink = page.locator('a[href*="/tcg/collection/"][href*="activation=1"]').first();
        try {
          await setSearch.waitFor({ state: 'visible', timeout: 18_000 });
          await setLink.waitFor({ state: 'visible', timeout: Math.max(1, 18_000 - (Date.now() - startedAt)) });
        } catch (error) {
          const remainingUntilTwentySeconds = 20_000 - (Date.now() - startedAt);
          if (remainingUntilTwentySeconds > 0) await page.waitForTimeout(remainingUntilTwentySeconds);
          await captureReactState('blocked-at-20s');
          await page.screenshot({ path: startScreenshotPath, fullPage: true }).catch(() => undefined);
          throw new Error(`Interactive set selector/list was not visible within 20s (elapsed ${Date.now() - startedAt}ms): ${String(error)}`);
        }
        stageTimes.selectorVisibleAtMs = Date.now() - startedAt;
        await captureReactState('selector-visible');
        await page.screenshot({ path: startScreenshotPath, fullPage: true });
        if (stalledPersistence) {
          const storageProbe = await page.evaluate(() => (window as Window & { __lunidexE2eStorageProbe?: { indexedDbOpenedAt: number | null; storageTimeoutFired: boolean; catalogStartedBeforeTimeout: boolean } }).__lunidexE2eStorageProbe ?? null);
          expect(storageProbe?.indexedDbOpenedAt, 'IndexedDB read must still be pending').not.toBeNull();
          expect(storageProbe?.storageTimeoutFired, 'the persistence timeout must still be pending').toBe(false);
          expect(storageProbe?.catalogStartedBeforeTimeout, 'catalog request must start before persistence finishes').toBe(true);
        }

        const responseDeadline = Math.max(1, 18_000 - (Date.now() - startedAt));
        await expect.poll(() => catalogResponses.at(-1)?.status ?? null, { timeout: responseDeadline, message: '/api/tcg/sets response observed' }).not.toBeNull();
        const catalogResponse = catalogResponses.at(-1) ?? null;
        expect(catalogResponse?.status, 'the catalogue endpoint must succeed').toBe(200);
        expect(catalogResponse?.url).toContain('/api/tcg/sets');
        stageTimes.catalogResponseAtMs = Date.now() - startedAt;

        await setLink.click();
        await expect(page).toHaveURL(new RegExp(`/${scenario.language}/tcg/collection/en/`), { timeout: 12_000 });
        const demoTitle = scenario.language === 'fr' ? 'Checklist démo' : 'Demo checklist';
        await expect(page.getByText(demoTitle, { exact: true })).toBeVisible({ timeout: 15_000 });
        const ownedButton = page.getByRole('button', {
          name: scenario.language === 'fr' ? /^Démo\s*:\s*marquer .+ comme possédée$/ : /^Demo: mark .+ as owned$/,
        }).first();
        await expect(ownedButton).toBeVisible({ timeout: 10_000 });
        const initialProgress = page.locator('[aria-atomic="true"]');
        await expect(initialProgress).toContainText(scenario.language === 'fr' ? /Possédées 0 \/ \d+/ : /Owned 0 \/ \d+/);
        await ownedButton.click();
        await expect(initialProgress).toContainText(scenario.language === 'fr' ? /Possédées 1 \/ \d+/ : /Owned 1 \/ \d+/);
        interacted = true;
        stageTimes.cardToggledAtMs = Date.now() - startedAt;
        await captureReactState('interactive-checklist');
        await page.screenshot({ path: checklistScreenshotPath, fullPage: true });
        expect(Date.now() - startedAt, 'the initial checklist must be interactive before 20 seconds').toBeLessThan(20_000);
        expect(pageErrors, 'no uncaught JavaScript exceptions').toEqual([]);
        expect(consoleMessages.filter((entry) => entry.type === 'error'), 'no browser console errors').toEqual([]);
      } catch (error) {
        failure = error;
        if (reactSnapshots.length === 0 || !reactSnapshots.at(-1)?.stage.startsWith('blocked-at-20s')) {
          await captureReactState('failure').catch(() => undefined);
        }
        await page.screenshot({ path: startScreenshotPath, fullPage: true }).catch(() => undefined);
      } finally {
        await context.tracing.stop({ path: tracePath }).catch(() => undefined);
        await context.close().catch(() => undefined);
        const report = {
          scenario,
          stalledPersistence,
          target: process.env.E2E_BASE_URL ?? 'http://127.0.0.1:3000',
          startUrl: `/go/${campaignSlug}`,
          freshStorage: true,
          durationMs: Date.now() - startedAt,
          stageTimes,
          catalogResponse: catalogResponses.at(-1) ?? null,
          interacted,
          pageErrors,
          consoleMessages,
          failedRequests,
          network,
          reactSnapshots,
          artifacts: { harPath, tracePath, startScreenshotPath, checklistScreenshotPath },
          failure: failure ? String(failure) : null,
        };
        await writeFile(summaryPath, JSON.stringify(report, null, 2));
        await testInfo.attach('diagnostics', { path: summaryPath, contentType: 'application/json' });
        await testInfo.attach('network HAR', { path: harPath, contentType: 'application/json' });
        await testInfo.attach('Playwright trace', { path: tracePath, contentType: 'application/zip' });
        if (await import('node:fs/promises').then(({ access }) => access(startScreenshotPath).then(() => true).catch(() => false))) {
          await testInfo.attach('start page screenshot', { path: startScreenshotPath, contentType: 'image/png' });
        }
        if (await import('node:fs/promises').then(({ access }) => access(checklistScreenshotPath).then(() => true).catch(() => false))) {
          await testInfo.attach('interactive checklist screenshot', { path: checklistScreenshotPath, contentType: 'image/png' });
        }
      }
      if (failure) throw failure;
      });
    }
  }
});
