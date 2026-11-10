import { expect, test, type Page, type TestInfo } from '@playwright/test';

type BrowserDiagnostics = {
  pageErrors: string[];
  failedRequests: string[];
  badLocalResponses: string[];
};

const diagnosticsByPage = new WeakMap<Page, BrowserDiagnostics>();
const localOrigin = new URL(process.env.MOBILE_BASE_URL ?? `http://127.0.0.1:${process.env.MOBILE_WEB_PORT ?? '3210'}`).origin;

function attachDiagnostics(page: Page) {
  const diagnostics: BrowserDiagnostics = {
    pageErrors: [],
    failedRequests: [],
    badLocalResponses: [],
  };
  diagnosticsByPage.set(page, diagnostics);
  page.on('pageerror', (error) => diagnostics.pageErrors.push(error.message));
  page.on('requestfailed', (request) => {
    const failure = request.failure()?.errorText;
    if (failure && failure !== 'net::ERR_ABORTED') {
      diagnostics.failedRequests.push(`${request.method()} ${request.url()}: ${failure}`);
    }
  });
  page.on('response', (response) => {
    if (response.status() < 400) return;
    const responseUrl = new URL(response.url());
    if (responseUrl.origin === localOrigin) {
      diagnostics.badLocalResponses.push(`${response.status()} ${response.request().method()} ${response.url()}`);
    }
  });
}

async function dismissFirstRunOverlays(page: Page) {
  const installPrompt = page.getByRole('dialog', { name: 'Install Lunidex on your iPhone' });
  const cookieConsent = page.getByRole('region', { name: 'Cookies on Lunidex' });

  // The iOS install prompt can hydrate after the page's first DOM load and sits
  // above the cookie banner. Give both optional overlays time to appear, then
  // dismiss the top layer before interacting with the banner underneath it.
  await Promise.all([
    installPrompt.waitFor({ state: 'visible', timeout: 6000 }).catch(() => undefined),
    cookieConsent.waitFor({ state: 'visible', timeout: 6000 }).catch(() => undefined),
  ]);

  for (let attempt = 0; attempt < 2; attempt += 1) {
    if (await installPrompt.isVisible()) {
      await installPrompt.getByRole('button', { name: 'Not now' }).click();
      await expect(installPrompt).toBeHidden();
    }

    if (await cookieConsent.isVisible()) {
      await cookieConsent.getByRole('button', { name: 'Reject all' }).click();
      await expect(cookieConsent).toBeHidden();
    }

    if (!(await installPrompt.isVisible()) && !(await cookieConsent.isVisible())) return;
  }

  await expect(installPrompt).toBeHidden();
  await expect(cookieConsent).toBeHidden();
}

async function attachDiagnosticsToReport(page: Page, testInfo: TestInfo) {
  const diagnostics = diagnosticsByPage.get(page);
  if (!diagnostics) return;
  await testInfo.attach('browser-diagnostics.json', {
    body: JSON.stringify(diagnostics, null, 2),
    contentType: 'application/json',
  });
}

test.afterEach(async ({ page }, testInfo) => attachDiagnosticsToReport(page, testInfo));

test('home screen and mobile navigation work in WebKit', async ({ page }) => {
  attachDiagnostics(page);
  // Compile the destination before the mobile page loads. In Next dev mode, a
  // cold route compile can trigger Fast Refresh while a client transition is
  // in flight and cancel that first navigation.
  const pokedexWarmup = await page.request.get('/en/pokedex');
  expect(pokedexWarmup.ok(), 'Pokédex destination should be available for navigation').toBe(true);
  await page.goto('/en', { waitUntil: 'domcontentloaded' });
  await dismissFirstRunOverlays(page);
  await expect(page.locator('main h1').first()).toBeVisible();

  const catalogPictures = page.locator(
    '.home-catalog-preview:not(.home-collection-preview) .home-catalog-preview-image > picture',
  );
  await expect(catalogPictures.first(), 'home catalog images should use a positioned picture parent').toBeAttached();
  const picturePositions = await catalogPictures.evaluateAll((pictures) =>
    pictures.map((picture) => getComputedStyle(picture).position),
  );
  expect(picturePositions.every((position) => ['absolute', 'fixed', 'relative'].includes(position))).toBe(true);

  const dimensions = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    document: document.documentElement.scrollWidth,
  }));
  expect(dimensions.document, 'home page should fit the device width').toBeLessThanOrEqual(dimensions.viewport);

  const menuButton = page.getByRole('button', { name: 'Open Menu' });
  await expect(menuButton).toBeVisible();
  await menuButton.tap();

  const navigation = page.getByRole('dialog', { name: 'Primary navigation' });
  await expect(navigation).toBeVisible();
  await navigation.locator('a[href="/en/pokedex"]').tap();
  await expect(page).toHaveURL(/\/en\/pokedex\/?$/);
  await expect(page.locator('main h1').first()).toBeVisible();

  await page.evaluate(() => window.scrollBy({ top: Math.max(1, window.innerHeight * 0.75), behavior: 'instant' }));
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0);

  const diagnostics = diagnosticsByPage.get(page);
  expect(diagnostics?.pageErrors, 'page JavaScript errors').toEqual([]);
  expect(diagnostics?.badLocalResponses, 'failed local app responses').toEqual([]);
});

test('key mobile widths do not introduce horizontal overflow', async ({ page }) => {
  attachDiagnostics(page);
  for (const viewport of [
    { width: 320, height: 568 },
    { width: 375, height: 667 },
    { width: 390, height: 844 },
    { width: 428, height: 926 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto('/en', { waitUntil: 'domcontentloaded' });
    await dismissFirstRunOverlays(page);
    await expect(page.locator('main h1').first()).toBeVisible();
    const dimensions = await page.evaluate(() => ({
      viewport: document.documentElement.clientWidth,
      document: document.documentElement.scrollWidth,
    }));
    expect(dimensions.document, `horizontal overflow at ${viewport.width}px`).toBeLessThanOrEqual(dimensions.viewport);
  }
});

for (const route of ['/en/pokedex', '/en/team', '/en/tcg', '/en/quiz']) {
  test(`${route} renders with the selected locale on mobile`, async ({ page }) => {
    attachDiagnostics(page);
    await page.goto(route, { waitUntil: 'domcontentloaded' });
    await dismissFirstRunOverlays(page);
    await expect(page.locator('main h1').first(), `${route} should render its page heading`).toBeVisible();
    const currentPath = await page.evaluate(() => window.location.pathname);
    expect([route, `${route}/`]).toContain(currentPath);
    const dimensions = await page.evaluate(() => ({
      viewport: document.documentElement.clientWidth,
      document: document.documentElement.scrollWidth,
    }));
    expect(dimensions.document, `${route} should not overflow horizontally`).toBeLessThanOrEqual(dimensions.viewport);
  });
}

test('team import dialog accepts keyboard input and closes accessibly', async ({ page }) => {
  attachDiagnostics(page);
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto('/en/team', { waitUntil: 'domcontentloaded' });
  await dismissFirstRunOverlays(page);

  const actionsMenu = page.locator('main details.team-actions-menu');
  await actionsMenu.locator('summary').tap();
  await expect(actionsMenu).toHaveAttribute('open', '');
  await actionsMenu.getByRole('button', { name: 'Import Showdown' }).tap();

  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  const input = dialog.getByRole('textbox');
  await input.focus();
  await page.keyboard.type('Pikachu');
  await expect(input).toHaveValue('Pikachu');
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();

  const dimensions = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    document: document.documentElement.scrollWidth,
  }));
  expect(dimensions.document, 'team import dialog should stay within the mobile viewport').toBeLessThanOrEqual(dimensions.viewport);
});

test('PWA manifest describes the Lunidex standalone app', async ({ page }) => {
  attachDiagnostics(page);
  await page.goto('/en', { waitUntil: 'domcontentloaded' });
  await dismissFirstRunOverlays(page);
  const manifestHref = await page.locator('link[rel="manifest"]').getAttribute('href');
  expect(manifestHref).toBeTruthy();

  const manifestResponse = await page.request.get(manifestHref!);
  expect(manifestResponse.ok()).toBe(true);
  const manifest = await manifestResponse.json() as {
    name?: string;
    display?: string;
    start_url?: string;
    icons?: Array<{ src?: string }>;
  };
  expect(manifest.name).toContain('Lunidex');
  expect(manifest.display).toBe('standalone');
  expect(manifest.start_url).toBe('/en');
  expect(manifest.icons?.some((icon) => icon.src?.includes('icon-192'))).toBe(true);
});

test('production service worker controls the PWA page when requested', async ({ page }) => {
  test.skip(process.env.MOBILE_E2E_PWA !== '1', 'Run `npm run test:mobile:pwa` to verify production PWA registration.');
  attachDiagnostics(page);
  await page.goto('/en', { waitUntil: 'domcontentloaded' });
  await dismissFirstRunOverlays(page);

  const workerResponse = await page.request.get('/sw.js');
  expect(workerResponse.ok(), 'production service worker should be served').toBe(true);
  const workerSource = await workerResponse.text();
  expect(workerSource, 'parallel-route modal chunks are excluded from precache').not.toMatch(
    /url:"\/_next\/static\/chunks\/app\/@modal\//,
  );

  await page.waitForFunction(
    () => Boolean(navigator.serviceWorker?.controller),
    undefined,
    { timeout: 30_000 },
  );
  const serviceWorker = await page.evaluate(() => navigator.serviceWorker.controller?.scriptURL ?? null);
  expect(serviceWorker).toContain('/sw.js');
});
