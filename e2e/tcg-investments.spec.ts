import { expect, test, type BrowserContext, type Page } from '@playwright/test';

const enabled = process.env.E2E_INVESTMENTS === '1' && !process.env.E2E_BASE_URL;
test.skip(!enabled, 'Run with E2E_INVESTMENTS=1 against the isolated local fixture server.');

async function mockAccount(context: BrowserContext, options: { singleFinish?: boolean } = {}) {
  context.setDefaultTimeout(10000);
  context.setDefaultNavigationTimeout(30000);
  let state: Record<string, unknown> = { tcgBrowseLanguage: 'en', tcgInvestments: [] };
  let version = '2026-10-19T10:00:00.000Z';
  let rejectWrite = false;
  let unavailable = false;
  let detailUnavailable = false;
  let detailRequests = 0;
  const card = {
    id: 'base1-1', name: 'Alakazam', localId: '1', category: 'Pokemon', stage: 'Stage2', types: ['Psychic'], image: 'https://assets.tcgdex.net/en/base/base1/1',
    set: { id: 'base1', name: 'Base Set' }, rarity: 'Rare', variants: { normal: !options.singleFinish, holo: true, reverse: !options.singleFinish },
    pricing: { cardmarket: { unit: 'EUR', trend: 35, 'trend-holo': 50, updated: '2026-10-18' } },
  };
  await context.route('**/api/auth/**', async (route) => route.fulfill({ json: route.request().url().includes('get-session') ? {
    user: { id: '00000000-0000-4000-8000-000000000001', email: 'investments@example.test', name: 'Trainer', createdAt: version },
    session: { id: 'test-session', token: 'test-token', expiresAt: '2027-10-19T10:00:00.000Z' },
  } : { token: 'test-token' } }));
  await context.route('**/api/user-state', async (route) => {
    if (route.request().method() === 'PUT') {
      if (rejectWrite) { await route.fulfill({ status: 413, json: { error: 'State payload is too large' } }); return; }
      state = route.request().postDataJSON().data;
      version = new Date(Date.parse(version) + 1000).toISOString();
    }
    await route.fulfill({ json: { data: state, updatedAt: version } });
  });
  await context.route('**/api/tcg/price-history/**', (route) => route.fulfill({ json: { history: [], status: 'empty' } }));
  await context.route('https://api.tcgdex.net/v2/**', async (route) => {
    const url = new URL(route.request().url());
    if (unavailable) { await route.fulfill({ status: 503, json: { error: 'Unavailable' } }); return; }
    if (url.pathname.endsWith('/cards/base1-1')) { detailRequests++; await route.fulfill(detailUnavailable ? { status: 503, json: { error: 'Detail unavailable' } } : { json: card }); return; }
    await route.fulfill({ json: url.pathname.endsWith('/cards') ? [card] : [] });
  });
  await context.route('https://assets.tcgdex.net/**', async (route) => route.fulfill({ contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 2 3"><rect width="2" height="3" fill="#444"/></svg>' }));
  return { state: () => state, rejectWrites: () => { rejectWrite = true; }, acceptWrites: () => { rejectWrite = false; }, failDetails: () => { detailUnavailable = true; }, detailRequests: () => detailRequests, setReference: (amount: number) => { card.pricing.cardmarket.trend = amount; card.pricing.cardmarket['trend-holo'] = amount; }, failCatalog: () => { unavailable = true; } };
}

async function openNewPurchase(page: Page) {
  await page.getByRole('button', { name: 'Record a purchase', exact: true }).click();
  await page.getByRole('textbox', { name: 'Search cards', exact: true }).fill('Alakazam');
  await page.getByRole('button', { name: 'Select this card: Alakazam base1-1' }).click();
  await page.getByLabel('Printing / finish', { exact: true }).selectOption('normal');
  await page.getByLabel('Condition', { exact: true }).selectOption('nm');
}

for (const viewport of [{ name: 'desktop', width: 1440, height: 1000 }, { name: 'mobile', width: 390, height: 844 }]) {
  test(`purchase, correction, repeat purchase, missing value and persistence on ${viewport.name}`, async ({ browser }) => {
    const context = await browser.newContext({ viewport });
    const fixture = await mockAccount(context);
    const page = await context.newPage();
    await page.goto('/en/tcg/investments');
    await expect(page.getByRole('heading', { name: 'No purchases recorded yet' })).toBeVisible({ timeout: 30000 });
    await openNewPurchase(page);
    await page.getByLabel('Purchase price per card (€)', { exact: true }).fill('20');
    await page.getByLabel('Quantity', { exact: true }).fill('2');
    await page.getByTestId('investment-extra-details').locator('summary').click();
    await page.getByLabel('Total acquisition fees (€)', { exact: true }).fill('5');
    await page.getByLabel('Acquisition date (optional)', { exact: true }).fill('2026-10-01');
    await page.getByLabel('Current estimate per card (€, optional)', { exact: true }).fill('35');
    await page.getByLabel('Valuation date (optional)', { exact: true }).fill('2026-10-19');
    await page.getByLabel('I confirm this estimate', { exact: false }).check();
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    const lots = page.getByTestId('investment-lot');
    await expect(lots).toHaveCount(1);
    await expect(lots.first()).toContainText('€45.00');
    await expect(lots.first()).toContainText('€70.00');
    await expect(lots.first()).toContainText('+€25.00');
    await expect.poll(() => (fixture.state().tcgInvestments as unknown[]).length).toBe(1);
    await page.reload();
    await expect(lots).toHaveCount(1, { timeout: 30000 });
    await lots.first().getByRole('button', { name: 'Edit purchase' }).click();
    await page.getByLabel('Quantity', { exact: true }).fill('3');
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(lots.first()).toContainText('€65.00');
    await openNewPurchase(page);
    await page.getByLabel('Purchase price per card (€)', { exact: true }).fill('40');
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(lots).toHaveCount(2);
    await expect(page.getByText('1 card unvalued · €40.00 invested excluded from returns.')).toBeVisible();
    await expect.poll(() => (fixture.state().tcgInvestments as unknown[]).length).toBe(2);
    await expect(page.locator('main')).toContainText('€105.00');
    await expect(page.locator('main')).toContainText('+61.54%');
    await page.getByPlaceholder('Search purchases by card name or ID').fill('not-a-card');
    await expect(lots).toHaveCount(0);
    await page.getByPlaceholder('Search purchases by card name or ID').fill('Alakazam');
    await expect(lots).toHaveCount(2);
    await page.getByRole('combobox', { name: 'Filter purchases' }).selectOption('missing');
    await expect(lots).toHaveCount(1);
    await expect(lots).toContainText('€40.00');
    await page.getByRole('combobox', { name: 'Filter purchases' }).selectOption('all');
    await page.getByRole('combobox', { name: 'Sort purchases' }).selectOption('best');
    await expect(lots.first()).toContainText('Manual estimate');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    const rejectCookies = page.getByRole('button', { name: 'Reject all', exact: true });
    if (await rejectCookies.isVisible()) await rejectCookies.click();
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
    await page.screenshot({ path: `/tmp/lunidex-investments-${viewport.name}.png`, fullPage: true });
    const valuedLot = lots.filter({ hasText: 'Manual estimate' });
    await valuedLot.getByRole('button', { name: 'Edit purchase' }).click();
    await page.getByLabel('Current estimate per card (€, optional)', { exact: true }).fill('');
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await expect.poll(() => (fixture.state().tcgInvestments as { valuation: unknown }[]).every((entry) => entry.valuation === null)).toBe(true);
    await expect(page.getByText('4 cards unvalued · €105.00 invested excluded from returns.')).toBeVisible();
    page.once('dialog', (dialog) => dialog.accept());
    await lots.first().getByRole('button', { name: 'Delete', exact: true }).click();
    await expect(lots).toHaveCount(1);
    await expect.poll(() => (fixture.state().tcgInvestments as unknown[]).length).toBe(1);
    // The investment ledger never adds a duplicate to collection ownership.
    expect(fixture.state().tcgOwnedCards).toEqual([]);
    await context.close();
  });
}

test('rejected writes roll back; an indicative quote never becomes a valuation', async ({ browser }) => {
  const context = await browser.newContext();
  const fixture = await mockAccount(context);
  const page = await context.newPage();
  await page.goto('/en/tcg/investments');
  await expect(page.getByRole('button', { name: 'Record a purchase', exact: true })).toBeVisible({ timeout: 30000 });
  await openNewPurchase(page);
  await page.getByLabel('Purchase price per card (€)', { exact: true }).fill('20');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect.poll(() => (fixture.state().tcgInvestments as unknown[]).length).toBe(1);
  expect((fixture.state().tcgInvestments as { valuation: unknown }[])[0].valuation).toBeNull();
  fixture.rejectWrites();
  await page.getByRole('button', { name: 'Edit purchase', exact: true }).click();
  await page.getByLabel('Purchase price per card (€)', { exact: true }).fill('99');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByTestId('investment-lot')).toContainText('€20.00');
  await expect(page.getByText(/exceeds.*account.*storage|exceeds.*storage.*limit/).first()).toBeVisible();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByLabel('Purchase price per card (€)', { exact: true })).toHaveValue('99');
  fixture.acceptWrites();
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByTestId('investment-lot')).toContainText('€99.00');
  await context.close();
});

test('exact catalog ID, card language and finish remain explicit', async ({ browser }) => {
  const context = await browser.newContext();
  const fixture = await mockAccount(context);
  const page = await context.newPage();
  await page.goto('/fr/tcg/investments');
  await page.getByRole('button', { name: 'Enregistrer un achat', exact: true }).click();
  await page.getByLabel('Langue des cartes', { exact: true }).selectOption('fr');
  await page.getByLabel('Rechercher des cartes', { exact: true }).fill('base1-1');
  await page.getByRole('button', { name: 'Sélectionner cette carte: Alakazam base1-1' }).click();
  await page.getByLabel('Édition / finition', { exact: true }).selectOption('reverse');
  await expect(page.getByText('Aucune référence exploitable en euros pour cette édition.')).toBeVisible();
  await page.getByLabel('Prix d’achat par carte (€)', { exact: true }).fill('20,25');
  await page.getByRole('button', { name: 'Enregistrer', exact: true }).click();
  await expect.poll(() => (fixture.state().tcgInvestments as unknown[]).length).toBe(1);
  expect((fixture.state().tcgInvestments as object[])[0]).toMatchObject({ cardId: 'base1-1', language: 'fr', variant: 'reverse', unitCostCents: 2025, valuation: null });
  await context.close();
});

test('catalog failure has a retry state and creates no purchase', async ({ browser }) => {
  const context = await browser.newContext();
  const fixture = await mockAccount(context);
  fixture.failCatalog();
  const page = await context.newPage();
  await page.goto('/en/tcg/investments');
  await page.getByRole('button', { name: 'Record a purchase', exact: true }).click();
  await page.getByRole('textbox', { name: 'Search cards', exact: true }).fill('Alakazam');
  await expect(page.getByText('Cards could not be searched. Check your connection and try again.')).toBeVisible({ timeout: 15000 });
  await expect(page.getByRole('button', { name: 'Try again', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Select this card: Alakazam base1-1' })).toHaveCount(0);
  expect(fixture.state().tcgInvestments).toEqual([]);
  await context.close();
});

test('single finish is ready without special edition text; refresh requests a new reference', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const fixture = await mockAccount(context, { singleFinish: true });
  const page = await context.newPage();
  await page.goto('/en/tcg/investments');
  await page.getByRole('button', { name: 'Record a purchase', exact: true }).click();
  await page.getByRole('textbox', { name: 'Search cards', exact: true }).fill('Alakazam');
  await page.getByRole('button', { name: 'Select this card: Alakazam base1-1' }).click();
  await expect(page.getByLabel('Printing / finish', { exact: true })).toHaveValue('holo');
  await expect(page.getByLabel('Edition, stamp or grading details', { exact: true })).toHaveCount(0);
  await expect(page.getByRole('dialog')).toContainText('€50.00');
  const requests = fixture.detailRequests();
  fixture.setReference(80);
  await page.getByRole('button', { name: 'Refresh reference', exact: true }).click();
  await expect.poll(() => fixture.detailRequests()).toBeGreaterThan(requests);
  await expect(page.getByRole('dialog')).toContainText('€80.00');
  await page.getByLabel('Purchase price per card (€)', { exact: true }).fill('20');
  await expect(page.getByRole('button', { name: 'Save', exact: true })).toBeInViewport();
  await page.screenshot({ path: '/tmp/lunidex-investments-form-mobile-fixed.png' });
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByTestId('investment-lot')).toContainText('Not valued');
  await expect.poll(() => (fixture.state().tcgInvestments as unknown[]).length).toBe(1);
  expect((fixture.state().tcgInvestments as { variant: string; valuation: unknown }[])[0]).toMatchObject({ variant: 'holo', valuation: null });
  await context.close();
});

test('catalog identity can be saved when optional details fail', async ({ browser }) => {
  const context = await browser.newContext();
  const fixture = await mockAccount(context, { singleFinish: true });
  fixture.failDetails();
  const page = await context.newPage();
  await page.goto('/en/tcg/investments');
  await page.getByRole('button', { name: 'Record a purchase', exact: true }).click();
  await page.getByRole('textbox', { name: 'Search cards', exact: true }).fill('Alakazam');
  await page.getByRole('button', { name: 'Select this card: Alakazam base1-1' }).click();
  await page.getByLabel('Purchase price per card (€)', { exact: true }).fill('20');
  await expect(page.getByRole('button', { name: 'Try again', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Save', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByTestId('investment-lot')).toHaveCount(1);
  await expect.poll(() => (fixture.state().tcgInvestments as unknown[]).length).toBe(1);
  await context.close();
});

test('invalid amounts receive focus and dirty edits require confirmation before discarding', async ({ browser }) => {
  const context = await browser.newContext();
  await mockAccount(context);
  const page = await context.newPage();
  await page.goto('/en/tcg/investments');
  await openNewPurchase(page);
  const price = page.getByLabel('Purchase price per card (€)', { exact: true });
  await price.fill('1,234');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(price).toBeFocused();
  await expect(price).toHaveAttribute('aria-invalid', 'true');
  await expect(page.getByTestId('investment-lot')).toHaveCount(0);
  page.once('dialog', (dialog) => dialog.dismiss());
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(price).toHaveValue('1,234');
  page.once('dialog', (dialog) => dialog.accept());
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await context.close();
});

test('explicit card language initializes purchases independently of the interface', async ({ browser }) => {
  const context = await browser.newContext();
  await mockAccount(context);
  const page = await context.newPage();
  await page.goto('/en/tcg/investments?tcgLang=fr');
  await page.getByRole('button', { name: 'Record a purchase', exact: true }).click();
  await expect(page.getByLabel('Card language', { exact: true })).toHaveValue('fr');
  await context.close();
});

test('browser Back protects the draft and closes the purchase before leaving the page', async ({ browser }) => {
  const context = await browser.newContext();
  await mockAccount(context);
  const page = await context.newPage();
  await page.goto('/en/tcg/investments');
  await openNewPurchase(page);
  const price = page.getByLabel('Purchase price per card (€)', { exact: true });
  await price.fill('28');
  page.once('dialog', (dialog) => dialog.dismiss());
  await page.goBack();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(price).toHaveValue('28');
  page.once('dialog', (dialog) => dialog.accept());
  await page.goBack();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page).toHaveURL(/\/en\/tcg\/investments$/);
  await context.close();
});

test('traversing multiple history entries keeps URL and page consistent', async ({ browser }) => {
  const context = await browser.newContext();
  await mockAccount(context);
  const page = await context.newPage();
  await page.goto('/en/tcg/investments?tcgLang=fr');
  await page.getByRole('button', { name: 'Record a purchase', exact: true }).waitFor();
  await page.evaluate(() => window.history.pushState(window.history.state, '', '/en/tcg/investments'));
  await expect(page).toHaveURL(/\/en\/tcg\/investments$/);
  await openNewPurchase(page);
  await page.getByLabel('Purchase price per card (€)', { exact: true }).fill('28');
  page.once('dialog', (dialog) => dialog.dismiss());
  await page.evaluate(() => window.history.go(-2));
  await expect(page).toHaveURL(/\/en\/tcg\/investments$/);
  await expect(page.getByLabel('Purchase price per card (€)', { exact: true })).toHaveValue('28');
  page.once('dialog', (dialog) => dialog.accept());
  await page.evaluate(() => window.history.go(-2));
  await expect(page).toHaveURL(/tcgLang=fr$/);
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Investments', exact: true })).toBeVisible();
  await context.close();
});

test('a card detail opens a preselected purchase and restores its own focus after saving', async ({ browser }) => {
  const context = await browser.newContext();
  const fixture = await mockAccount(context);
  const page = await context.newPage();
  await page.goto('/en/tcg/investments');
  await openNewPurchase(page);
  await page.getByLabel('Purchase price per card (€)', { exact: true }).fill('20');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.getByTestId('investment-lot').getByRole('link', { name: 'Alakazam', exact: true }).click();
  const detail = page.getByRole('dialog');
  await detail.getByRole('heading', { name: 'Alakazam', exact: true }).waitFor();
  await detail.getByRole('button', { name: 'Record a purchase', exact: true }).click();
  const purchase = page.getByRole('dialog').filter({ has: page.getByRole('heading', { name: 'Record a purchase', exact: true }) });
  await expect(purchase.getByRole('textbox', { name: 'Search cards', exact: true })).toHaveCount(0);
  await expect(purchase.getByLabel('Card language', { exact: true })).toHaveValue('en');
  await page.screenshot({ path: '/tmp/lunidex-investments-context-fixed.png' });
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(1);
  await expect(detail.getByRole('button', { name: 'Record a purchase', exact: true })).toBeFocused();
  await detail.getByRole('button', { name: 'Record a purchase', exact: true }).click();
  await purchase.getByLabel('Printing / finish', { exact: true }).selectOption('normal');
  await purchase.getByLabel('Purchase price per card (€)', { exact: true }).fill('25');
  await purchase.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(1);
  await expect(page.getByText('Purchase saved to your account.', { exact: true })).toBeVisible();
  await expect.poll(() => (fixture.state().tcgInvestments as unknown[]).length).toBe(2);
  expect(fixture.state().tcgOwnedCards).toEqual([]);
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('investment-lot')).toHaveCount(2);
  await context.close();
});
