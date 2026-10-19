import { expect, test, type BrowserContext, type Page } from '@playwright/test';

const SEALED_HOME = '/fr/tcg/sealed';

async function openSubview(
  page: Page,
  context: BrowserContext,
  name: string,
  path: string,
  menu?: 'Rapports' | 'Outils',
) {
  const navigation = page.getByRole('navigation', { name: 'Portefeuille scellés' });
  if (menu) {
    const disclosure = navigation.locator('details').filter({ hasText: menu });
    if (!(await disclosure.evaluate((element) => (element as HTMLDetailsElement).open))) {
      await disclosure.locator('summary').tap();
    }
  }

  const link = navigation.getByRole('link', { name, exact: true });
  const bounds = await link.boundingBox();
  expect(bounds?.height, `${name} should be a touch-sized target`).toBeGreaterThanOrEqual(44);
  await link.tap();
  await page.waitForURL(`**${path}`);
  await expect(page.locator('main h1')).toBeVisible();

  const viewport = await page.evaluate(() => ({
    width: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(viewport.scrollWidth, `${path} should not cause horizontal page overflow`).toBeLessThanOrEqual(viewport.width);

  await page.goBack();
  await page.waitForURL(`**${SEALED_HOME}`);
  await expect(page.locator('main h1')).toHaveText('Tableau de bord');
  expect(await context.pages()).toHaveLength(1);
}

test('all sealed workspace views preserve mobile browser back navigation', async ({ browser }) => {
  test.setTimeout(180_000);
  const context = await browser.newContext({
    viewport: { width: 320, height: 568 },
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
    locale: 'fr-FR',
  });
  const page = await context.newPage();
  const pageErrors: string[] = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  await page.goto(SEALED_HOME, { waitUntil: 'networkidle' });

  const views: Array<{ name: string; path: string; menu?: 'Rapports' | 'Outils' }> = [
    { name: 'Collection', path: `${SEALED_HOME}/collection` },
    { name: 'Journal', path: `${SEALED_HOME}/journal` },
    { name: 'Ventes', path: `${SEALED_HOME}/sales`, menu: 'Rapports' },
    { name: 'Cashflow', path: `${SEALED_HOME}/cashflow`, menu: 'Rapports' },
    { name: 'Analyses', path: `${SEALED_HOME}/analytics`, menu: 'Rapports' },
    { name: 'Catalogue', path: `${SEALED_HOME}/catalogue`, menu: 'Outils' },
    { name: 'Sources', path: `${SEALED_HOME}/sources`, menu: 'Outils' },
    { name: 'Marché des scellés', path: `${SEALED_HOME}/market` },
  ];

  for (const view of views) {
    await openSubview(page, context, view.name, view.path, view.menu);
  }

  expect(pageErrors).toEqual([]);
  await context.close();
});

test('collection and catalogue links preserve the locale and TCG language', async ({ browser }) => {
  const context = await browser.newContext({
    viewport: { width: 375, height: 667 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    locale: 'fr-FR',
  });
  const page = await context.newPage();

  await page.goto('/fr/tcg/collection?tcgLang=ja', { waitUntil: 'networkidle' });
  const collectionNav = page.locator('nav.tcg-local-navigation');
  const portfolioLink = collectionNav.getByRole('link', { name: 'Scellés', exact: true });
  expect((await portfolioLink.boundingBox())?.height).toBeGreaterThanOrEqual(44);
  await portfolioLink.tap();
  await page.waitForURL('**/fr/tcg/sealed?tcgLang=ja');
  await page.goBack();
  await page.waitForURL('**/fr/tcg/collection?tcgLang=ja');

  await page.goto('/fr/tcg?tcgLang=ja', { waitUntil: 'networkidle' });
  const catalogueNav = page.locator('nav.tcg-local-navigation');
  const marketLink = catalogueNav.getByRole('link', { name: 'Marché des scellés', exact: true });
  expect((await marketLink.boundingBox())?.height).toBeGreaterThanOrEqual(44);
  await marketLink.tap();
  await page.waitForURL('**/fr/tcg/sealed/market?tcgLang=ja');
  await page.goBack();
  await page.waitForURL('**/fr/tcg?tcgLang=ja');

  const dimensions = await page.evaluate(() => ({
    width: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.width);
  await context.close();
});

for (const viewport of [
  { name: '375 × 667', width: 375, height: 667 },
  { name: '390 × 844', width: 390, height: 844 },
  { name: '412 × 915', width: 412, height: 915 },
  { name: '844 × 390 landscape', width: 844, height: 390 },
]) {
  test(`sealed entry, menu navigation, and browser back work at ${viewport.name}`, async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: viewport.width, height: viewport.height },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
      locale: 'fr-FR',
    });
    const page = await context.newPage();
    const pageErrors: string[] = [];
    page.on('pageerror', (error) => pageErrors.push(error.message));

    await page.goto('/fr/tcg', { waitUntil: 'networkidle' });
    await page.getByRole('button', { name: 'Plus', exact: true }).tap();
    const menu = page.getByRole('dialog', { name: 'Navigation principale' });
    await expect(menu).toBeVisible();
    await menu.getByRole('link', { name: 'Scellés', exact: true }).tap();
    await page.waitForURL(`**${SEALED_HOME}`);
    await expect(menu).toBeHidden();

    await page.getByRole('navigation', { name: 'Portefeuille scellés' })
      .getByRole('link', { name: 'Journal', exact: true }).tap();
    await page.waitForURL(`**${SEALED_HOME}/journal`);
    await page.goBack();
    await page.waitForURL(`**${SEALED_HOME}`);

    const widths = await page.evaluate(() => ({
      width: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
    }));
    expect(widths.scrollWidth).toBeLessThanOrEqual(widths.width);
    expect(pageErrors).toEqual([]);
    await context.close();
  });
}

for (const width of [768, 1024, 1440]) {
  test(`shared navigation fits and closes at ${width}px`, async ({ browser }) => {
    const mobile = width < 1024;
    const height = width === 768 ? 1024 : 900;
    const context = await browser.newContext({
      viewport: { width, height },
      deviceScaleFactor: 1,
      isMobile: mobile,
      hasTouch: mobile,
      locale: 'fr-FR',
    });
    const page = await context.newPage();
    await page.goto('/fr/pokedex', { waitUntil: 'networkidle' });

    if (mobile) {
      const trigger = page.getByRole('button', { name: 'Plus', exact: true });
      await trigger.tap();
      const menu = page.getByRole('dialog', { name: 'Navigation principale' });
      await expect(menu).toBeVisible();
      const bounds = await menu.boundingBox();
      expect(bounds?.x).toBeGreaterThanOrEqual(0);
      expect((bounds?.x ?? 0) + (bounds?.width ?? 0)).toBeLessThanOrEqual(width);
      expect(await page.evaluate(() => document.body.style.overflow)).toBe('hidden');
      await page.keyboard.press('Escape');
      await expect(menu).toBeHidden();
      await expect(trigger).toBeFocused();
      expect(await page.evaluate(() => document.body.style.overflow)).not.toBe('hidden');
    } else {
      const disclosure = page.locator('.site-header-more');
      const trigger = disclosure.locator('summary');
      await trigger.click();
      const menu = disclosure.locator('.site-header-more-menu');
      await expect(menu).toBeVisible();
      const bounds = await menu.boundingBox();
      expect(bounds?.x).toBeGreaterThanOrEqual(0);
      expect((bounds?.x ?? 0) + (bounds?.width ?? 0)).toBeLessThanOrEqual(width);
      await page.keyboard.press('Escape');
      await expect(disclosure).not.toHaveAttribute('open', '');
      await expect(trigger).toBeFocused();
    }

    await context.close();
  });
}
