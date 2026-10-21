import { expect, test, type BrowserContext, type Page, type Route } from '@playwright/test';

const userId = '00000000-0000-4000-8000-000000000001';
const updatedAt = '2026-10-19T10:00:00.000Z';
const collectionId = '126e8648-39da-4fc9-88b2-fd194d28cc5a';
const e2eBaseUrl = process.env.E2E_BASE_URL;
const localMockBaseUrl = !e2eBaseUrl || /^http:\/\/(localhost|127\.0\.0\.1):3000$/.test(e2eBaseUrl);
const customE2EEnabled = process.env.E2E_CUSTOM_COLLECTIONS === '1' && localMockBaseUrl;

type E2EState = Record<string, unknown>;
type CatalogOutcome = 'success' | 'empty' | 'network-error' | 'server-error';

function makeState(collections: unknown[] = [], cards: unknown[] = []): E2EState {
  return {
    tcgOwnedCards: [],
    tcgLegacyOwnedCards: [],
    tcgCollections: [],
    tcgCollectionCards: [],
    tcgActiveCollections: [],
    tcgCollectionModelVersion: 3,
    tcgBrowseLanguage: 'en',
    tcgDisplayCurrency: 'EUR',
    tcgWishlistCards: [],
    tcgCustomCollections: collections,
    tcgCustomCollectionCards: cards,
  };
}

function cardPayload(cardId: string, language = 'en') {
  const suffix = cardId.slice(cardId.lastIndexOf('-') + 1);
  const numeric = Number.parseInt(suffix, 10);
  return {
    id: cardId,
    localId: suffix,
    name: cardId === 'base1-4' ? ({ fr: 'Dracaufeu', ja: 'リザードン', en: 'Charizard' }[language] ?? 'Charizard') : Number.isFinite(numeric) ? `Card ${numeric}` : 'Alakazam',
    image: `https://assets.tcgdex.net/${language}/base/base1/${suffix}`,
    rarity: 'Rare',
    category: 'Pokemon',
    stage: 'Basic',
    types: ['Psychic'],
    set: { id: 'base1', name: language === 'fr' ? 'Set de Base' : language === 'ja' ? '第1弾' : 'Base Set', cardCount: { total: 102, official: 102 } },
    variants: { normal: true },
  };
}

async function mockAuthenticatedApp(context: BrowserContext, initialState: E2EState) {
  let state = initialState;
  let stateVersion = updatedAt;
  let activeCardRequests = 0;
  let maximumActiveCardRequests = 0;
  let catalogOutcome: CatalogOutcome = 'success';
  let holdCatalogResponse = false;
  let releaseCatalogResponse: (() => void) | null = null;
  let catalogRequestCount = 0;
  let rejectStateWrites = false;
  let pendingConflictResponses = 0;
  let stateWriteCount = 0;
  const cardRequestDelayMs = 30;

  await context.route('**/api/auth/**', async (route: Route) => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith('/get-session')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user: { id: userId, email: 'trainer@example.test', name: 'E2E Trainer', createdAt: updatedAt },
          session: { id: 'e2e-session', token: 'e2e-token', expiresAt: '2027-10-19T10:00:00.000Z' },
        }),
      });
      return;
    }
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ token: 'e2e-token' }) });
  });

  await context.route('**/api/user-state', async (route: Route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: state, updatedAt: stateVersion }) });
      return;
    }
    stateWriteCount += 1;
    if (pendingConflictResponses > 0) {
      pendingConflictResponses -= 1;
      await route.fulfill({ status: 409, contentType: 'application/json', body: JSON.stringify({ data: state, updatedAt: stateVersion }) });
      return;
    }
    if (rejectStateWrites) {
      await route.fulfill({ status: 413, contentType: 'application/json', body: JSON.stringify({ error: 'State payload is too large' }) });
      return;
    }
    const body = route.request().postDataJSON() as { data?: E2EState };
    state = body.data ?? state;
    stateVersion = new Date(Date.parse(stateVersion) + 1_000).toISOString();
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, data: state, updatedAt: stateVersion }) });
  });

  await context.route('https://api.tcgdex.net/v2/**', async (route: Route) => {
    const url = new URL(route.request().url());
    const language = url.pathname.split('/')[2];
    const cardPath = url.pathname.match(/\/cards\/([^/]+)$/);
    if (cardPath) {
      activeCardRequests += 1;
      maximumActiveCardRequests = Math.max(maximumActiveCardRequests, activeCardRequests);
      await new Promise((resolve) => setTimeout(resolve, cardRequestDelayMs));
      activeCardRequests -= 1;
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(cardPayload(decodeURIComponent(cardPath[1]), language)) });
      return;
    }
    if (url.pathname.endsWith('/cards')) {
      catalogRequestCount += 1;
      if (holdCatalogResponse) {
        await new Promise<void>((resolve) => { releaseCatalogResponse = resolve; });
        releaseCatalogResponse = null;
      }
      if (catalogOutcome === 'network-error') {
        await route.abort('internetdisconnected');
        return;
      }
      if (catalogOutcome === 'server-error') {
        await route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ error: 'catalog unavailable' }) });
        return;
      }
      if (catalogOutcome === 'empty') {
        await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify((url.searchParams.get('name') ?? '').toLowerCase().includes('alakazam') ? [{ ...cardPayload('base1-001', language), name: 'Alakazam', localId: '001', stage: 'Stage2' }] : [cardPayload('base1-4', language)]),
      });
      return;
    }
    if (url.pathname.endsWith('/sets/base1')) {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ id: 'base1', name: 'Base Set', cardCount: { total: 1, official: 1 }, cards: [cardPayload('base1-4', language)] }) });
      return;
    }
    if (url.pathname.endsWith('/sets')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([{ id: 'base1', name: 'Base Set', cardCount: { total: 102 }, releaseDate: '1999-01-09', serie: { id: 'base', name: 'Base' } }]),
      });
      return;
    }
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
  });

  await context.route('https://assets.tcgdex.net/**', async (route: Route) => {
    await route.fulfill({ status: 200, contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 2 3"><rect width="2" height="3" fill="#222"/></svg>' });
  });

  await context.route('**/api/tcg/sets?**', async (route) => {
    await route.fulfill({ json: { sets: [{ id: 'base1', name: 'Base Set', totalCards: 102, releaseRank: 1, dataLanguage: 'fr', releaseDate: '1999-01-09', serie: { id: 'base', name: 'Base' } }] } });
  });

  return {
    getState: () => state,
    getStateWriteCount: () => stateWriteCount,
    getCatalogRequestCount: () => catalogRequestCount,
    getMaximumActiveCardRequests: () => maximumActiveCardRequests,
    setCatalogOutcome: (outcome: CatalogOutcome) => { catalogOutcome = outcome; },
    setCatalogResponseHeld: (held: boolean) => {
      holdCatalogResponse = held;
      if (!held) {
        releaseCatalogResponse?.();
        releaseCatalogResponse = null;
      }
    },
    setRejectStateWrites: (rejected: boolean) => { rejectStateWrites = rejected; },
    conflictNextStateWrites: (count = 1) => { pendingConflictResponses = count; },
  };
}

async function createBinderAndOpen(page: Page, name: string) {
  await page.goto('/en/tcg/collection?view=custom');
  await expect(page.getByRole('heading', { name: 'Custom collections', exact: true })).toBeVisible({ timeout: 15_000 });
  const rejectCookies = page.getByRole('button', { name: 'Reject all', exact: true });
  if (await rejectCookies.isVisible()) await rejectCookies.click();
  await page.getByRole('button', { name: 'Create collection' }).first().click();
  const nameInput = page.getByLabel('Name');
  await expect(nameInput).toBeFocused();
  await nameInput.fill(name);
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.locator('main').getByRole('link', { name, exact: true })).toBeVisible();
  await page.locator('main').getByRole('link', { name, exact: true }).click();
  await expect(page.getByRole('heading', { name, level: 1 })).toBeVisible({ timeout: 15_000 });
}

for (const viewport of [
  { name: 'desktop', width: 1440, height: 900, mobile: false },
  { name: 'mobile', width: 390, height: 844, mobile: true },
]) {
  test(`custom binder creation, adding, reload, and focus work on ${viewport.name}`, async ({ browser }) => {
    test.skip(!customE2EEnabled, 'Run with npm run test:e2e:tcg-custom to enable the locally mocked Neon session.');
    const context = await browser.newContext({
      viewport: { width: viewport.width, height: viewport.height },
      isMobile: viewport.mobile,
      hasTouch: viewport.mobile,
    });
    const app = await mockAuthenticatedApp(context, makeState());
    const page = await context.newPage();

    await createBinderAndOpen(page, 'Favorites');
    await page.getByRole('button', { name: 'Add cards' }).first().click();
    const panel = page.getByRole('dialog');
    await expect(panel).toBeVisible();
    const panelBounds = await panel.boundingBox();
    expect(panelBounds?.width).toBeGreaterThan(viewport.mobile ? 370 : 600);
    const search = panel.getByRole('textbox');
    await search.fill('Alakazam');
    const cardResult = page.getByRole('list', { name: 'Search cards' }).getByText('Alakazam');
    await expect(cardResult).toBeVisible();
    await expect(search).toBeFocused();
    // The development issues badge can cover mobile app controls. Collapse the badge through its UI.
    const collapseIssues = page.getByRole('button', { name: 'Collapse issues badge', exact: true });
    if (await collapseIssues.isVisible()) await collapseIssues.click();
    await page.getByRole('button', { name: 'Add', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Already added' })).toBeVisible();
    app.setCatalogOutcome('server-error');
    let requestCount = app.getCatalogRequestCount();
    await search.fill('server error lookup');
    await expect.poll(() => app.getCatalogRequestCount()).toBeGreaterThan(requestCount);
    await expect(panel.getByRole('alert')).toContainText('Cards could not be searched. Check your connection and try again.');
    app.setCatalogOutcome('network-error');
    requestCount = app.getCatalogRequestCount();
    await search.fill('interrupted lookup');
    await expect.poll(() => app.getCatalogRequestCount()).toBeGreaterThan(requestCount);
    await expect(panel.getByRole('alert')).toContainText('Cards could not be searched. Check your connection and try again.');
    app.setCatalogOutcome('success');
    await panel.getByRole('button', { name: 'Try again', exact: true }).click();
    await expect(page.getByRole('list', { name: 'Search cards' }).getByText('Charizard')).toBeVisible();

    app.setCatalogResponseHeld(true);
    requestCount = app.getCatalogRequestCount();
    await search.fill('controlled wait');
    await expect.poll(() => app.getCatalogRequestCount()).toBeGreaterThan(requestCount);
    await expect(panel.locator('[aria-busy="true"]')).toBeVisible();
    app.setCatalogResponseHeld(false);
    await expect(page.getByRole('list', { name: 'Search cards' }).getByText('Charizard')).toBeVisible();

    app.setCatalogOutcome('empty');
    requestCount = app.getCatalogRequestCount();
    await search.fill('empty search');
    await expect.poll(() => app.getCatalogRequestCount()).toBeGreaterThan(requestCount);
    await expect(panel.getByRole('status')).toContainText('No matching collections or cards.');
    await page.keyboard.press('Escape');
    await expect(panel).toBeHidden();
    await expect(page.getByRole('button', { name: 'Add cards' }).first()).toBeFocused();
    await expect.poll(() => (app.getState().tcgCustomCollectionCards as unknown[] | undefined)?.length).toBe(1);

    await page.reload();
    await expect(page.getByRole('heading', { name: 'Favorites', level: 1 })).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText('Card 1')).toBeVisible();
    await expect(page.getByText('Owned', { exact: true })).toBeVisible();
    await expect(page.locator('main')).toContainText('1 cards');

    await page.getByRole('button', { name: 'Delete: Favorites' }).click();
    await expect(page.getByText('Cards in your global inventory will be kept.')).toBeVisible();
    await page.getByRole('button', { name: 'Cancel' }).click();
    await expect(page.getByRole('heading', { name: 'Favorites', level: 1 })).toBeVisible();
    await context.close();
  });
}

test('a missing binder card becomes owned without changing series after tapping it on mobile', async ({ browser }) => {
  test.skip(!customE2EEnabled, 'Run with npm run test:e2e:tcg-custom to enable the locally mocked Neon session.');
  const binder = { id: collectionId, name: 'Ownership check', createdAt: updatedAt, updatedAt };
  const reference = {
    collectionId,
    cardId: 'base1-001',
    language: 'en',
    cardName: 'Card 1',
    addedAt: updatedAt,
    quantity: 0,
  };
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  const app = await mockAuthenticatedApp(context, makeState([binder], [reference]));
  const page = await context.newPage();

  await page.goto(`/en/tcg/collection/custom/${collectionId}`);
  await expect(page.getByRole('heading', { name: 'Ownership check', level: 1 })).toBeVisible({ timeout: 15_000 });

  const card = page.getByRole('list', { name: 'Ownership check' }).getByRole('listitem').first();
  const addCardButton = card.getByRole('button', { name: 'Add Card 1 to my collection' });
  await expect(addCardButton.locator('img')).toHaveClass(/grayscale/);
  await addCardButton.click();

  await expect(card.getByText('Owned', { exact: true })).toBeVisible();
  await expect(card.locator('img')).not.toHaveClass(/grayscale/);
  await expect(card.getByRole('button', { name: 'Add Card 1 to my collection' })).toHaveCount(0);
  await expect.poll(() => (app.getState().tcgCustomCollectionCards as { quantity: number }[])[0]?.quantity).toBe(1);
  expect(app.getState().tcgOwnedCards).toEqual([]);
  await expect.poll(() => (app.getState().tcgCollectionCards as unknown[] | undefined)?.length).toBe(0);

  await context.close();
});

test('backup import keeps its preview after a rejected write and export starts a download', async ({ browser }) => {
  test.skip(!customE2EEnabled, 'Run with npm run test:e2e:tcg-custom to enable the locally mocked Neon session.');
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const fixture = await mockAuthenticatedApp(context, makeState());
  const page = await context.newPage();
  await page.goto('/en/tcg/collection?view=custom');
  await page.waitForResponse((response) => response.url().includes('/api/user-state') && response.request().method() === 'GET');
  await page.getByRole('button', { name: 'More', exact: true }).click();
  await page.getByRole('button', { name: 'Settings', exact: true }).click();

  const settings = page.getByRole('dialog', { name: 'Settings' });
  await expect(settings.getByText('Data Export & Import')).toBeVisible();
  const backup = JSON.stringify({ version: '3.0', exportedAt: updatedAt, data: { favorites: [25], team: [25, 6] } });
  await settings.locator('input[type="file"]').setInputFiles({ name: 'fixture-backup.json', mimeType: 'application/json', buffer: Buffer.from(backup) });
  const preview = page.getByRole('dialog', { name: 'Import Data' });
  await expect(preview).toBeVisible();
  await expect(preview).toContainText('Favorites');

  fixture.setRejectStateWrites(true);
  const importButton = preview.getByRole('button', { name: 'Import', exact: true });
  await importButton.click();
  await expect(preview.getByRole('alert')).toContainText('too large');
  await expect(preview).toBeVisible();

  fixture.setRejectStateWrites(false);
  await importButton.click();
  await expect(preview).toBeHidden();
  await expect(page.getByText('Data imported successfully')).toBeVisible();
  await expect.poll(() => fixture.getState().favorites).toEqual([25]);

  const downloadPromise = page.waitForEvent('download');
  await settings.getByRole('button', { name: 'Export', exact: true }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/^primedex-backup-\d{4}-\d{2}-\d{2}\.json$/);
  await context.close();
});

test('custom collection form retains its value after a rejected write and closes only after retry is saved', async ({ browser }) => {
  test.skip(!customE2EEnabled, 'Run with npm run test:e2e:tcg-custom to enable the locally mocked Neon session.');
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const fixture = await mockAuthenticatedApp(context, makeState());
  const page = await context.newPage();
  await page.goto('/en/tcg/collection?view=custom');
  await page.waitForResponse((response) => response.url().includes('/api/user-state') && response.request().method() === 'GET');
  await expect(page.getByRole('heading', { name: 'Custom collections', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Create collection' }).first().click();

  const form = page.getByRole('dialog', { name: 'New collection' });
  const nameInput = form.getByLabel('Name');
  await nameInput.fill('Retry binder');
  fixture.setRejectStateWrites(true);
  await form.getByRole('button', { name: 'Save', exact: true }).evaluate((button) => {
    (button as HTMLButtonElement).click();
    (button as HTMLButtonElement).click();
  });

  await expect(form.getByRole('alert')).toContainText('too large');
  await expect(nameInput).toHaveValue('Retry binder');
  await expect(form).toBeVisible();
  expect(fixture.getStateWriteCount()).toBe(1);

  fixture.setRejectStateWrites(false);
  await form.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(form).toBeHidden();
  await expect.poll(() => (fixture.getState().tcgCustomCollections as { name: string }[])[0]?.name).toBe('Retry binder');
  expect(fixture.getStateWriteCount()).toBe(2);
  await context.close();
});

test('custom collection save reconciles one version conflict before confirming the write', async ({ browser }) => {
  test.skip(!customE2EEnabled, 'Run with npm run test:e2e:tcg-custom to enable the locally mocked Neon session.');
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const fixture = await mockAuthenticatedApp(context, makeState());
  const page = await context.newPage();
  await page.goto('/en/tcg/collection?view=custom');
  await page.waitForResponse((response) => response.url().includes('/api/user-state') && response.request().method() === 'GET');
  await expect(page.getByRole('heading', { name: 'Custom collections', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Create collection' }).first().click();

  const form = page.getByRole('dialog', { name: 'New collection' });
  await form.getByLabel('Name').fill('Conflict retry');
  fixture.conflictNextStateWrites();
  await form.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(form).toBeHidden();
  await expect.poll(() => (fixture.getState().tcgCustomCollections as { name: string }[])[0]?.name).toBe('Conflict retry');
  expect(fixture.getStateWriteCount()).toBe(2);
  await context.close();
});

test('custom collection stays usable at 320px with keyboard focus and reduced motion', async ({ browser }) => {
  test.skip(!customE2EEnabled, 'Run with npm run test:e2e:tcg-custom to enable the locally mocked Neon session.');
  const context = await browser.newContext({ viewport: { width: 320, height: 720 }, isMobile: true, hasTouch: true, reducedMotion: 'reduce' });
  const fixture = await mockAuthenticatedApp(context, makeState());
  const page = await context.newPage();
  await page.goto('/en/tcg/collection?view=custom');
  await page.waitForResponse((response) => response.url().includes('/api/user-state') && response.request().method() === 'GET');
  await expect(page.getByRole('heading', { name: 'Custom collections', exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);

  const createButton = page.getByRole('button', { name: 'Create collection' }).first();
  await createButton.focus();
  await expect(createButton).toBeFocused();
  await page.keyboard.press('Enter');
  const form = page.getByRole('dialog', { name: 'New collection' });
  await expect(form).toBeVisible();
  const bounds = await form.boundingBox();
  expect(bounds?.width).toBeLessThanOrEqual(320);
  await expect(form.getByLabel('Name')).toBeFocused();
  expect(fixture.getStateWriteCount()).toBe(0);
  await context.close();
});

test('large binders render 48 ordered cards with at most six detail requests at once', async ({ browser }) => {
  test.skip(!customE2EEnabled, 'Run with npm run test:e2e:tcg-custom to enable the locally mocked Neon session.');
  const references = Array.from({ length: 2_400 }, (_, index) => ({
    collectionId,
    cardId: `base1-${String(index + 1).padStart(4, '0')}`,
    language: 'en',
    cardName: `Card ${index + 1}`,
    addedAt: new Date(Date.parse(updatedAt) + index * 1_000).toISOString(),
  }));
  const binder = { id: collectionId, name: 'Long list', createdAt: updatedAt, updatedAt };
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const app = await mockAuthenticatedApp(context, makeState([binder], references));
  const page = await context.newPage();

  await page.goto(`/en/tcg/collection/custom/${collectionId}`);
  await expect(page.getByRole('heading', { name: 'Long list', level: 1 })).toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole('list', { name: 'Long list' }).getByRole('link', { name: 'Card 1' }).first()).toBeVisible();
  await expect(page.getByText('1 / 50')).toBeVisible();
  await expect(page.getByRole('list', { name: 'Long list' }).getByRole('listitem')).toHaveCount(48);
  expect(app.getMaximumActiveCardRequests()).toBeGreaterThan(1);
  expect(app.getMaximumActiveCardRequests()).toBeLessThanOrEqual(6);
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  await expect(page.getByRole('list', { name: 'Long list' }).getByRole('link', { name: 'Card 49' }).first()).toBeVisible();
  await expect(page.getByText('2 / 50')).toBeVisible();
  await context.close();
});


test('multilingual binder quantities, filters, removal and series ownership stay independent across reloads', async ({ browser }, testInfo) => {
  test.skip(!customE2EEnabled, 'Requires the isolated local session.');
  test.setTimeout(120_000);
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const initial = makeState();
  // A real serialized v3 series record, deliberately already owned before adding to a binder.
  initial.tcgCollections = ['tcg2:fr:base1'];
  initial.tcgActiveCollections = ['tcg2:fr:base1'];
  initial.tcgCollectionCards = ['tcg2:fr:base1|base1-4|normal|3'];
  initial.tcgOwnedCards = ['base1-4'];
  const app = await mockAuthenticatedApp(context, initial);
  const page = await context.newPage();
  const errors: string[] = [];
  const consoleErrors: string[] = [];
  page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()); });
  page.on('pageerror', (error) => { errors.push(error.stack ?? error.message); console.error(error.stack ?? error.message); });
  await createBinderAndOpen(page, 'Multilingual binder');
  const binderUrl = page.url();
  const seriesBefore = app.getState().tcgCollectionCards;
  await page.getByRole('button', { name: 'Add cards', exact: true }).first().click();
  const panel = page.getByRole('dialog');
  await panel.getByRole('combobox', { name: 'Card language' }).selectOption('fr');
  await panel.getByRole('textbox').fill('Dracaufeu');
  await expect(panel.getByText('Dracaufeu', { exact: true })).toBeVisible();
  await panel.getByRole('button', { name: 'Add', exact: true }).click();
  await expect(panel.getByRole('button', { name: 'Already added' })).toBeVisible();
  await panel.getByRole('combobox', { name: 'Card language' }).selectOption('ja');
  await panel.getByRole('textbox').fill('リザードン');
  await expect(panel.getByText('リザードン', { exact: true })).toBeVisible();
  await panel.getByRole('button', { name: 'Add', exact: true }).click();
  await expect(panel.getByRole('button', { name: 'Already added' })).toBeVisible();
  await page.keyboard.press('Escape');
  const list = page.getByRole('list', { name: 'Multilingual binder', exact: true });
  await expect(list.getByRole('listitem')).toHaveCount(2);
  await expect(list.getByText('Set de Base', { exact: true })).toBeVisible();
  await expect(list.getByText('第1弾', { exact: true })).toBeVisible();
  await expect(list.locator('img').first()).toHaveAttribute('src', /\/fr\//);
  await expect(list.locator('img').last()).toHaveAttribute('src', /\/ja\//);
  const frQuantity = list.getByRole('spinbutton', { name: 'Binder quantity: Dracaufeu (fr)', exact: true });
  await frQuantity.focus();
  await frQuantity.press('End');
  await frQuantity.press('Backspace');
  await expect(frQuantity).toHaveValue('');
  await frQuantity.press('4');
  await frQuantity.blur();
  await expect.poll(() => (app.getState().tcgCustomCollectionCards as { language: string; quantity: number }[]).find((card) => card.language === 'fr')?.quantity).toBe(4);
  expect(app.getState().tcgCollectionCards).toEqual(seriesBefore);
  await page.screenshot({ path: testInfo.outputPath('multilingual-binder-desktop.png'), fullPage: true });
  await page.getByRole('combobox', { name: 'Card language', exact: true }).selectOption('ja');
  await expect(list.getByRole('listitem')).toHaveCount(1);
  await expect(list.getByText('リザードン', { exact: true })).toHaveCount(1);
  await page.getByRole('combobox', { name: 'Card language', exact: true }).selectOption('');
  await page.getByRole('searchbox', { name: 'Search cards', exact: true }).fill('Drac');
  await expect(list.getByRole('listitem')).toHaveCount(1);
  await page.getByRole('searchbox', { name: 'Search cards', exact: true }).fill('');
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Multilingual binder', exact: true })).toBeVisible({ timeout: 20_000 });
  await expect(frQuantity).toHaveValue('4');
  await expect(list.getByRole('spinbutton', { name: 'Binder quantity: リザードン (ja)', exact: true })).toHaveValue('1');
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('multilingual-binder-mobile.png'), fullPage: true });
  await page.setViewportSize({ width: 1440, height: 1000 });
  const binderBefore = app.getState().tcgCustomCollectionCards;
  // Change the series through its existing UI, then return to the binder.
  await page.goto('/en/tcg/collection/fr/base1');
  await page.getByRole('button', { name: /Manage Dracaufeu/ }).click();
  await page.getByRole('spinbutton', { name: /Normal quantity/i }).fill('2');
  await page.getByRole('spinbutton', { name: /Normal quantity/i }).blur();
  await expect.poll(() => app.getState().tcgCollectionCards).not.toEqual(seriesBefore);
  expect(app.getState().tcgCustomCollectionCards).toEqual(binderBefore);
  const seriesAfter = app.getState().tcgCollectionCards;
  await page.goto(binderUrl);
  await expect(page.getByRole('heading', { name: 'Multilingual binder', exact: true })).toBeVisible({ timeout: 20_000 });
  await expect(frQuantity).toHaveValue('4');
  await list.getByRole('button', { name: 'Remove from this collection: Dracaufeu', exact: true }).click();
  await expect(list.getByRole('listitem')).toHaveCount(1);
  await expect.poll(() => (app.getState().tcgCustomCollectionCards as unknown[]).length).toBe(1);
  expect(app.getState().tcgCollectionCards).toEqual(seriesAfter);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Multilingual binder', exact: true })).toBeVisible({ timeout: 20_000 });
  await expect(list.getByRole('listitem')).toHaveCount(1);
  await expect(list.getByText('リザードン', { exact: true })).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('multilingual-binder-mobile-after-removal.png'), fullPage: true });
  expect(consoleErrors).toEqual([]);
  expect(errors).toEqual([]);
  await context.close();
});
