import { expect, test, type BrowserContext, type Locator, type Page, type Route } from '@playwright/test';

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
    tcgCustomCollectionLayouts: [],
  };
}

function cardPayload(cardId: string, language = 'en') {
  const suffix = cardId.slice(cardId.lastIndexOf('-') + 1);
  const numeric = Number.parseInt(suffix, 10);
  const setId = cardId === 'base1-001' ? 'base2' : 'base1';
  const rarity = cardId === 'base1-4' ? 'Rare' : cardId === 'base1-001' ? 'Uncommon' : 'Common';
  const pricing = cardId === 'base1-10'
    ? undefined
    : { tcgplayer: { unit: 'USD', normal: { marketPrice: cardId === 'base1-4' ? 2 : cardId === 'base1-001' ? 3 : 50 } } };
  return {
    id: cardId,
    localId: suffix,
    name: cardId === 'base1-long'
      ? ({ en: 'A collector card with a deliberately long localized title', fr: 'Une carte de collection avec un titre localisé volontairement très long', ja: 'コレクション用の非常に長いローカライズされたカード名のテスト' }[language] ?? 'A collector card with a deliberately long localized title')
      : cardId === 'base1-4'
      ? ({ fr: 'Dracaufeu', ja: 'リザードン', en: 'Charizard' }[language] ?? 'Charizard')
      : cardId === 'base1-001' ? 'Alakazam' : Number.isFinite(numeric) ? `Card ${numeric}` : 'Alakazam',
    image: `https://assets.tcgdex.net/${language}/base/base1/${suffix}`,
    rarity,
    category: 'Pokemon',
    stage: 'Basic',
    types: ['Psychic'],
    set: { id: setId, name: setId === 'base2' ? (language === 'fr' ? 'Jungle' : 'Jungle') : language === 'fr' ? 'Set de Base' : language === 'ja' ? '第1弾' : 'Base Set', cardCount: { total: 102, official: 102 } },
    variants: { normal: true },
    ...(pricing ? { pricing } : {}),
  };
}

function makeBinderState(name: string, cardCount: number, gridPreset: '2x2' | '3x3' | '4x3' | '4x4' = '3x3'): E2EState {
  const binder = { id: collectionId, name, createdAt: updatedAt, updatedAt };
  const cards = Array.from({ length: cardCount }, (_, index) => ({
    collectionId,
    cardId: `base1-${String(index + 1).padStart(4, '0')}`,
    language: 'en',
    cardName: `Card ${index + 1}`,
    addedAt: new Date(Date.parse(updatedAt) + index * 1_000).toISOString(),
  }));
  const state = makeState([binder], cards);
  state.tcgCustomCollectionLayouts = [{
    collectionId,
    gridPreset,
    cardOrder: cards.map(({ cardId, language }) => ({ cardId, language, copyIndex: 0 })),
  }];
  return state;
}

function getLayoutOrder(state: E2EState) {
  const layouts = state.tcgCustomCollectionLayouts as { collectionId: string; gridPreset: string; cardOrder: { cardId: string; language: string; copyIndex?: number; copyCount?: number }[] }[] | undefined;
  return layouts?.find((layout) => layout.collectionId === collectionId);
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
  const collection = page.getByRole('list', { name: 'Custom collections' }).getByRole('listitem').filter({
    has: page.getByRole('heading', { name, exact: true }),
  });
  await expect(collection).toBeVisible();
  await collection.getByRole('link', { name: 'Open collection', exact: true }).click();
  await expect(page.getByRole('heading', { name, level: 1 })).toBeVisible({ timeout: 15_000 });
}

async function openCardActions(card: Locator, name: string) {
  const trigger = card.getByRole('button', { name: `Card actions for ${name}`, exact: true });
  if (await trigger.getAttribute('aria-expanded') !== 'true') await trigger.click();
}

test('shows the estimated value of positive custom binder quantities across languages', async ({ browser }) => {
  test.skip(!customE2EEnabled, 'Run with npm run test:e2e:tcg-custom to enable the locally mocked Neon session.');
  const binder = { id: collectionId, name: 'Valuation binder', createdAt: updatedAt, updatedAt };
  const references = [
    { collectionId, cardId: 'base1-4', language: 'en', cardName: 'Charizard', addedAt: updatedAt, quantity: 2 },
    { collectionId, cardId: 'base1-001', language: 'fr', cardName: 'Card 1', addedAt: updatedAt, quantity: 1 },
    { collectionId, cardId: 'base1-5', language: 'ja', cardName: 'カード5', addedAt: updatedAt, quantity: 0 },
  ];
  const initial = makeState([binder], references);
  initial.tcgDisplayCurrency = 'USD';
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const app = await mockAuthenticatedApp(context, initial);
  const page = await context.newPage();

  await page.goto(`/en/tcg/collection/custom/${collectionId}`);
  await expect(page.getByRole('heading', { name: 'Valuation binder', level: 1 })).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText('Estimated binder value', { exact: true })).toBeVisible();
  await expect(page.getByText('$7.00', { exact: true })).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText('3/3 cards priced', { exact: true })).toBeVisible();
  expect(app.getState().tcgCollectionCards).toEqual([]);
  await context.close();
});

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
    const addCardsTrigger = page.getByRole('button', { name: 'Add cards' }).first();
    const emptyStateAddCardsTrigger = page.getByRole('button', { name: 'Add cards' }).last();
    await emptyStateAddCardsTrigger.click();
    const panel = page.getByRole('dialog');
    await expect(panel).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(panel).toBeHidden();
    await expect(emptyStateAddCardsTrigger).toBeFocused();
    await addCardsTrigger.click();
    await expect(panel).toBeVisible();
    const panelBounds = await panel.boundingBox();
    expect(panelBounds?.width).toBeGreaterThan(viewport.mobile ? 370 : 600);
    const search = panel.getByRole('searchbox', { name: 'Search cards', exact: true });
    await search.fill('Alakazam');
    const cardResult = page.getByRole('list', { name: 'Search cards' }).getByText('Alakazam', { exact: true });
    await expect(cardResult).toBeVisible();
    await expect(search).toBeFocused();
    // The development issues badge can cover mobile app controls. Collapse the badge through its UI.
    const collapseIssues = page.getByRole('button', { name: 'Collapse issues badge', exact: true });
    if (await collapseIssues.isVisible()) await collapseIssues.click();
    await page.getByRole('button', { name: 'Select', exact: true }).click();
    const selectedQuantity = panel.getByRole('spinbutton', { name: 'Binder quantity: Alakazam (en)', exact: true });
    await selectedQuantity.fill('2');
    await search.fill('Charizard');
    await expect(page.getByRole('list', { name: 'Search cards' }).getByText('Charizard', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Select', exact: true }).click();
    const writeCountBeforeBatch = app.getStateWriteCount();
    await expect(panel.getByText('2 cards', { exact: true })).toBeVisible();
    await panel.getByRole('button', { name: 'Add (2 cards)', exact: true }).click();
    await expect.poll(() => app.getStateWriteCount()).toBe(writeCountBeforeBatch + 1);
    await expect.poll(() => (app.getState().tcgCustomCollectionCards as { cardId: string; quantity: number }[]).length).toBe(2);
    expect(app.getState().tcgCustomCollectionCards).toEqual(expect.arrayContaining([
      expect.objectContaining({ cardId: 'base1-001', quantity: 2 }),
      expect.objectContaining({ cardId: 'base1-4', quantity: 1 }),
    ]));
    await expect(panel.getByText('2 cards added. You can keep searching.', { exact: true })).toBeVisible();
    await search.fill('Alakazam');
    const existingResult = page.getByRole('list', { name: 'Search cards' }).getByRole('listitem').first();
    await expect(existingResult.getByRole('button', { name: 'In this binder', exact: true })).toBeDisabled();
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
    await expect(page.getByRole('list', { name: 'Search cards' }).getByText('Charizard', { exact: true })).toBeVisible();

    app.setCatalogResponseHeld(true);
    requestCount = app.getCatalogRequestCount();
    await search.fill('controlled wait');
    await expect.poll(() => app.getCatalogRequestCount()).toBeGreaterThan(requestCount);
    await expect(panel.locator('[aria-busy="true"]')).toBeVisible();
    app.setCatalogResponseHeld(false);
    await expect(page.getByRole('list', { name: 'Search cards' }).getByText('Charizard', { exact: true })).toBeVisible();

    app.setCatalogOutcome('empty');
    requestCount = app.getCatalogRequestCount();
    await search.fill('empty search');
    await expect.poll(() => app.getCatalogRequestCount()).toBeGreaterThan(requestCount);
    await expect(panel.getByText('No matching collections or cards.', { exact: true })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(panel).toBeHidden();
    await expect(addCardsTrigger).toBeFocused();
    await expect.poll(() => (app.getState().tcgCustomCollectionCards as unknown[] | undefined)?.length).toBe(2);

    await page.reload();
    await expect(page.getByRole('heading', { name: 'Favorites', level: 1 })).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText('Alakazam', { exact: true })).toBeVisible();
    await expect(page.getByText('Charizard', { exact: true })).toBeVisible();
    await expect(page.getByRole('spinbutton', { name: 'Binder quantity: Alakazam, copy 1 (en)', exact: true })).toHaveValue('2');
    await expect(page.getByRole('list', { name: 'Favorites', exact: true }).locator('[data-sortable-id]')).toHaveCount(3);
    await expect(page.locator('main')).toContainText('2 cards');

    await page.getByRole('button', { name: 'Delete: Favorites' }).click();
    await expect(page.getByText('Cards in your global inventory will be kept.')).toBeVisible();
    await page.getByRole('button', { name: 'Cancel' }).click();
    await expect(page.getByRole('heading', { name: 'Favorites', level: 1 })).toBeVisible();
    await context.close();
  });
}

test('custom binder combines rarity and set filters and sorts missing prices last', async ({ browser }) => {
  test.skip(!customE2EEnabled, 'Run with npm run test:e2e:tcg-custom to enable the locally mocked Neon session.');
  const references = [
    { collectionId, cardId: 'base1-4', language: 'en', cardName: 'Charizard', addedAt: updatedAt, quantity: 1 },
    { collectionId, cardId: 'base1-001', language: 'en', cardName: 'Alakazam', addedAt: updatedAt, quantity: 1 },
    { collectionId, cardId: 'base1-10', language: 'en', cardName: 'Card 10', addedAt: updatedAt, quantity: 1 },
  ];
  const binder = { id: collectionId, name: 'Filter binder', createdAt: updatedAt, updatedAt };
  const initial = makeState([binder], references);
  initial.tcgDisplayCurrency = 'USD';
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await mockAuthenticatedApp(context, initial);
  const page = await context.newPage();

  await page.goto(`/en/tcg/collection/custom/${collectionId}`);
  await expect(page.getByRole('heading', { name: 'Filter binder', level: 1 })).toBeVisible({ timeout: 15_000 });
  await page.getByRole('button', { name: 'Catalog filters', exact: true }).click();
  const rarity = page.getByRole('combobox', { name: 'Rarity', exact: true });
  const set = page.getByRole('combobox', { name: 'Set', exact: true });
  await expect(rarity).toBeVisible();
  await rarity.selectOption('Common');
  await set.selectOption('base1');
  const list = page.getByRole('list', { name: 'Filter binder', exact: true });
  const cardSlots = list.locator('[data-sortable-id]');
  await expect(cardSlots).toHaveCount(1);
  await expect(list.getByText('Card 10', { exact: true })).toBeVisible();

  await rarity.selectOption('');
  await set.selectOption('');
  const sort = page.getByRole('combobox', { name: 'Sort cards', exact: true });
  await sort.selectOption('asc');
  await expect(cardSlots).toHaveCount(3);
  const unpricedItem = cardSlots.filter({ hasText: 'Card 10' });
  await expect(unpricedItem.getByRole('img', { name: 'No price in USD', exact: true })).toBeVisible();
  const ascendingNames = (await cardSlots.allTextContents()).map((text) =>
    ['Charizard', 'Alakazam', 'Card 10'].find((name) => text.includes(name)) ?? '',
  );
  expect(ascendingNames).toEqual(['Charizard', 'Alakazam', 'Card 10']);

  await sort.selectOption('desc');
  const descendingNames = (await cardSlots.allTextContents()).map((text) =>
    ['Charizard', 'Alakazam', 'Card 10'].find((name) => text.includes(name)) ?? '',
  );
  expect(descendingNames).toEqual(['Alakazam', 'Charizard', 'Card 10']);

  await page.getByRole('button', { name: 'Reset all filters', exact: true }).click();
  await expect(cardSlots).toHaveCount(3);
  await expect(sort).toHaveValue('none');
  await context.close();
});

test('desktop pointer reorder saves one complete binder order and grid format across reloads', async ({ browser }) => {
  test.skip(!customE2EEnabled, 'Run with npm run test:e2e:tcg-custom to enable the locally mocked Neon session.');
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const app = await mockAuthenticatedApp(context, makeBinderState('Pointer binder', 4, '2x2'));
  const page = await context.newPage();

  await page.goto(`/en/tcg/collection/custom/${collectionId}`);
  await expect(page.getByRole('heading', { name: 'Pointer binder', level: 1 })).toBeVisible({ timeout: 15_000 });
  const list = page.getByRole('list', { name: 'Pointer binder', exact: true });
  await expect(list.getByRole('listitem')).toHaveCount(4);
  const first = list.getByRole('listitem').nth(0);
  const second = list.getByRole('listitem').nth(1);
  const writesBeforeReorder = app.getStateWriteCount();
  await first.getByRole('button', { name: 'Drag Card 1 to reorder' }).dragTo(second);

  await expect.poll(() => getLayoutOrder(app.getState())?.cardOrder[0]?.cardId).toBe('base1-0002');
  await expect.poll(() => app.getStateWriteCount()).toBe(writesBeforeReorder + 1);
  expect(getLayoutOrder(app.getState())?.cardOrder).toEqual([
    { cardId: 'base1-0002', language: 'en', copyIndex: 0 },
    { cardId: 'base1-0001', language: 'en', copyIndex: 0 },
    { cardId: 'base1-0003', language: 'en', copyIndex: 0 },
    { cardId: 'base1-0004', language: 'en', copyIndex: 0 },
  ]);

  const grid = page.getByRole('combobox', { name: 'Pockets per page', exact: true });
  await grid.selectOption('4x4');
  await expect.poll(() => getLayoutOrder(app.getState())?.gridPreset).toBe('4x4');
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Pointer binder', level: 1 })).toBeVisible({ timeout: 20_000 });
  await expect(page.getByRole('combobox', { name: 'Pockets per page', exact: true })).toHaveValue('4x4');
  await expect(page.getByRole('list', { name: 'Pointer binder', exact: true }).getByRole('listitem')).toHaveCount(16);
  await context.close();
});

test('quantity expands physical pockets and one duplicate copy moves independently', async ({ browser }) => {
  test.skip(!customE2EEnabled, 'Run with npm run test:e2e:tcg-custom to enable the locally mocked Neon session.');
  const initial = makeBinderState('Repeated card binder', 2, '2x2');
  const members = initial.tcgCustomCollectionCards as { cardId: string; language: string; quantity?: number }[];
  members[0].quantity = 5;
  members[1].quantity = 0;
  // Keep the pre-copy-index layout shape to exercise lazy migration from legacy data.
  initial.tcgCustomCollectionLayouts = [{
    collectionId,
    gridPreset: '2x2',
    cardOrder: members.map(({ cardId, language }) => ({ cardId, language })),
  }];
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const app = await mockAuthenticatedApp(context, initial);
  const page = await context.newPage();

  await page.goto(`/en/tcg/collection/custom/${collectionId}`);
  await expect(page.getByRole('heading', { name: 'Repeated card binder', level: 1 })).toBeVisible({ timeout: 15_000 });
  const list = page.getByRole('list', { name: 'Repeated card binder', exact: true });
  const slots = list.locator('[data-sortable-id]');
  await expect(page.getByText('Page 1 of 2', { exact: true })).toBeVisible();
  await expect(slots).toHaveCount(4);
  await expect(slots.nth(0)).toHaveAttribute('data-sortable-id', 'binder-card:base1-0001:en:0');
  await expect(slots.nth(1)).toHaveAttribute('data-sortable-id', 'binder-card:base1-0001:en:1');
  await expect(slots.nth(2)).toHaveAttribute('data-sortable-id', 'binder-card:base1-0001:en:2');
  await expect(slots.nth(3)).toHaveAttribute('data-sortable-id', 'binder-card:base1-0001:en:3');

  const copyThree = list.locator('[data-sortable-id="binder-card:base1-0001:en:2"]');
  await expect(copyThree.getByRole('button', { name: 'Drag Card 1, copy 3, to reorder', exact: true })).toBeVisible();
  await openCardActions(copyThree, 'Card 1, copy 3');
  await copyThree.getByRole('button', { name: 'Move Card 1 one pocket earlier', exact: true }).click();

  await expect.poll(() => getLayoutOrder(app.getState())?.cardOrder).toEqual([
    { cardId: 'base1-0001', language: 'en', copyIndex: 0 },
    { cardId: 'base1-0001', language: 'en', copyIndex: 2 },
    { cardId: 'base1-0001', language: 'en', copyIndex: 1 },
    { cardId: 'base1-0001', language: 'en', copyIndex: 3, copyCount: 2 },
    { cardId: 'base1-0002', language: 'en', copyIndex: 0 },
  ]);
  await expect(slots.nth(1)).toHaveAttribute('data-sortable-id', 'binder-card:base1-0001:en:2');
  await expect(slots).toHaveCount(4);

  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.getByRole('searchbox', { name: 'Search cards', exact: true }).fill('Card 2');
  await expect(slots).toHaveCount(1);
  await page.getByRole('button', { name: 'Copy all cards', exact: true }).click();
  const copyPreview = page.getByRole('textbox', { name: 'Physical card list preview', exact: true });
  const expectedCopyText = [
    ...Array.from({ length: 5 }, () => 'Card 1 BASE1 0001/102'),
    'Card 2 BASE1 0002/102',
  ].join(', ');
  await expect(copyPreview).toHaveValue(expectedCopyText);
  await page.getByRole('button', { name: 'Copy list', exact: true }).click();
  await expect(page.getByText('Card list copied to clipboard.', { exact: true })).toBeVisible();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(expectedCopyText);
  await page.keyboard.press('Escape');
  await page.getByRole('searchbox', { name: 'Search cards', exact: true }).fill('');

  await page.getByRole('button', { name: 'Next', exact: true }).click();
  await expect(page.getByText('Page 2 of 2', { exact: true })).toBeVisible();
  await expect(slots).toHaveCount(2);
  await expect(slots.nth(0)).toHaveAttribute('data-sortable-id', 'binder-card:base1-0001:en:4');
  await expect(slots.nth(1)).toHaveAttribute('data-sortable-id', 'binder-card:base1-0002:en:0');
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Repeated card binder', level: 1 })).toBeVisible({ timeout: 20_000 });
  await expect(page.getByRole('list', { name: 'Repeated card binder', exact: true }).locator('[data-sortable-id]')).toHaveCount(4);
  await context.close();
});

test('binder inspector stays beside the grid on desktop and uses modal fallbacks below the breakpoint', async ({ browser }) => {
  test.skip(!customE2EEnabled, 'Run with npm run test:e2e:tcg-custom to enable the locally mocked Neon session.');
  const context = await browser.newContext({ viewport: { width: 1450, height: 800 } });
  await mockAuthenticatedApp(context, makeBinderState('Whole page binder', 12, '4x3'));
  const page = await context.newPage();

  await page.goto(`/en/tcg/collection/custom/${collectionId}`);
  await expect(page.getByRole('heading', { name: 'Whole page binder', level: 1 })).toBeVisible({ timeout: 15_000 });
  const list = page.getByRole('list', { name: 'Whole page binder', exact: true });
  const pockets = list.locator('[data-sortable-id]');
  await expect(pockets).toHaveCount(12);
  await expect(list).toHaveAttribute('data-binder-pocket-target', '232');
  await expect(list).toHaveAttribute('data-binder-page-target', '952');
  const layout = page.locator('[data-binder-actions-presentation]');
  await expect(layout).toHaveAttribute('data-binder-actions-presentation', 'sidebar');
  const firstPocket = pockets.first();
  const nextPocket = pockets.nth(1);
  const secondRowPocket = pockets.nth(4);
  const getDocumentBox = (locator: Locator) => locator.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return { x: rect.left + window.scrollX, y: rect.top + window.scrollY, width: rect.width, height: rect.height };
  });
  const firstPocketBefore = await getDocumentBox(firstPocket);
  const nextPocketBefore = await getDocumentBox(nextPocket);
  const secondRowBefore = await getDocumentBox(secondRowPocket);
  expect(firstPocketBefore.width).toBeGreaterThanOrEqual(220);
  expect(firstPocketBefore.width).toBeLessThanOrEqual(240);

  const actionTrigger = firstPocket.getByRole('button', { name: 'Card actions for Card 1', exact: true });
  await actionTrigger.click();
  const inspector = page.getByRole('complementary', { name: 'Card actions for Card 1', exact: true });
  await expect(inspector).toBeVisible();
  await expect(inspector.getByRole('spinbutton', { name: 'Binder quantity: Card 1 (en)', exact: true })).toBeVisible();
  const [listBox, inspectorBox] = await Promise.all([getDocumentBox(list), getDocumentBox(inspector)]);
  expect(listBox.x + listBox.width).toBeLessThanOrEqual(inspectorBox.x);
  const artworkBoxes = await list.locator('[data-sortable-id] img[alt]').evaluateAll((images) => images.map((image) => {
    const rect = image.getBoundingClientRect();
    return { left: rect.left + window.scrollX, right: rect.right + window.scrollX, top: rect.top + window.scrollY, bottom: rect.bottom + window.scrollY };
  }));
  expect(artworkBoxes.some((artworkBox) => artworkBox.left < inspectorBox.x + inspectorBox.width
    && artworkBox.right > inspectorBox.x
    && artworkBox.top < inspectorBox.y + inspectorBox.height
    && artworkBox.bottom > inspectorBox.y)).toBe(false);
  const [firstPocketAfter, nextPocketAfter, secondRowAfter] = await Promise.all([
    getDocumentBox(firstPocket),
    getDocumentBox(nextPocket),
    getDocumentBox(secondRowPocket),
  ]);
  expect(firstPocketAfter.height).toBe(firstPocketBefore.height);
  expect(nextPocketAfter.y).toBe(nextPocketBefore.y);
  expect(secondRowAfter.y).toBe(secondRowBefore.y);
  await inspector.getByRole('button', { name: 'Close', exact: true }).click();
  await expect(actionTrigger).toBeFocused();

  await page.setViewportSize({ width: 1024, height: 800 });
  await expect(layout).toHaveAttribute('data-binder-actions-presentation', 'dialog');
  await actionTrigger.click();
  const dialogActions = page.getByRole('dialog', { name: 'Card actions for Card 1', exact: true });
  await expect(dialogActions).toBeVisible();
  await expect(dialogActions.getByRole('spinbutton', { name: 'Binder quantity: Card 1 (en)', exact: true })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dialogActions).toBeHidden();
  await expect(actionTrigger).toBeFocused();

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(layout).toHaveAttribute('data-binder-actions-presentation', 'sheet');
  await actionTrigger.click();
  const sheetActions = page.getByRole('dialog', { name: 'Card actions for Card 1', exact: true });
  await expect(sheetActions).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(sheetActions).toBeHidden();
  await expect(actionTrigger).toBeFocused();
  await context.close();
});

test('binder grids from 2×2 to 4×4 fit a narrow screen with long localized card names', async ({ browser }) => {
  test.skip(!customE2EEnabled, 'Run with npm run test:e2e:tcg-custom to enable the locally mocked Neon session.');
  const binder = { id: collectionId, name: 'Responsive binder', createdAt: updatedAt, updatedAt };
  const card = { collectionId, cardId: 'base1-long', language: 'ja', cardName: '長いカード名', addedAt: updatedAt, quantity: 1 };
  const initial = makeState([binder], [card]);
  initial.tcgCustomCollectionLayouts = [{ collectionId, gridPreset: '2x2', cardOrder: [{ cardId: card.cardId, language: card.language, copyIndex: 0 }] }];
  const context = await browser.newContext({ viewport: { width: 320, height: 844 }, isMobile: true, hasTouch: true });
  const app = await mockAuthenticatedApp(context, initial);
  const page = await context.newPage();

  await page.goto(`/en/tcg/collection/custom/${collectionId}`);
  await expect(page.getByRole('heading', { name: 'Responsive binder', level: 1 })).toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole('list', { name: 'Responsive binder', exact: true }).getByRole('link', { name: /非常に長い/ }).first()).toBeVisible();
  const grid = page.getByRole('combobox', { name: 'Pockets per page', exact: true });
  const expected = [
    { preset: '2x2', columns: '2', rows: '2', capacity: '4' },
    { preset: '3x3', columns: '3', rows: '3', capacity: '9' },
    { preset: '4x3', columns: '4', rows: '3', capacity: '12' },
    { preset: '4x4', columns: '4', rows: '4', capacity: '16' },
  ];
  for (const layout of expected) {
    await grid.selectOption(layout.preset);
    await expect.poll(() => getLayoutOrder(app.getState())?.gridPreset).toBe(layout.preset);
    const binderPage = page.locator('[data-capacity]').first();
    await expect(binderPage).toHaveAttribute('data-columns', layout.columns);
    await expect(binderPage).toHaveAttribute('data-rows', layout.rows);
    await expect(binderPage).toHaveAttribute('data-capacity', layout.capacity);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  }
  await context.close();
});

test('touch long press starts binder card reordering after the hold threshold', async ({ browser }) => {
  test.skip(!customE2EEnabled, 'Run with npm run test:e2e:tcg-custom to enable the locally mocked Neon session.');
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  const app = await mockAuthenticatedApp(context, makeBinderState('Touch binder', 4, '2x2'));
  const page = await context.newPage();

  await page.goto(`/en/tcg/collection/custom/${collectionId}`);
  await expect(page.getByRole('heading', { name: 'Touch binder', level: 1 })).toBeVisible({ timeout: 15_000 });
  const list = page.getByRole('list', { name: 'Touch binder', exact: true });
  const firstHandle = list.getByRole('button', { name: 'Drag Card 1 to reorder' });
  const secondCard = list.getByRole('listitem').nth(1);
  await firstHandle.scrollIntoViewIfNeeded();
  const start = await firstHandle.boundingBox();
  const target = await secondCard.boundingBox();
  expect(start).not.toBeNull();
  expect(target).not.toBeNull();
  const cdp = await context.newCDPSession(page);
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [{ id: 1, x: start!.x + start!.width / 2, y: start!.y + start!.height / 2, radiusX: 1, radiusY: 1, force: 1 }],
  });
  await page.waitForTimeout(350);
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchMove',
    touchPoints: [{ id: 1, x: target!.x + target!.width / 2, y: target!.y + target!.height / 2, radiusX: 1, radiusY: 1, force: 1 }],
  });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });

  await expect.poll(() => getLayoutOrder(app.getState())?.cardOrder[0]?.cardId).toBe('base1-0002');
  await context.close();
});

test('keyboard sorting and pocket controls reorder the complete binder without dragging', async ({ browser }) => {
  test.skip(!customE2EEnabled, 'Run with npm run test:e2e:tcg-custom to enable the locally mocked Neon session.');
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const app = await mockAuthenticatedApp(context, makeBinderState('Accessible binder', 4, '2x2'));
  const page = await context.newPage();

  await page.goto(`/en/tcg/collection/custom/${collectionId}`);
  await expect(page.getByRole('heading', { name: 'Accessible binder', level: 1 })).toBeVisible({ timeout: 15_000 });
  const list = page.getByRole('list', { name: 'Accessible binder', exact: true });
  const firstHandle = list.getByRole('button', { name: 'Drag Card 1 to reorder' });
  await firstHandle.focus();
  await page.keyboard.press('Space');
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('Space');
  await expect.poll(() => getLayoutOrder(app.getState())?.cardOrder[0]?.cardId).toBe('base1-0002');

  const movedCard = list.getByRole('listitem').filter({ has: page.getByRole('link', { name: 'Card 2', exact: true }) });
  await openCardActions(movedCard, 'Card 2');
  await movedCard.getByRole('button', { name: 'Move Card 2 one pocket later', exact: true }).click();
  await expect.poll(() => getLayoutOrder(app.getState())?.cardOrder[0]?.cardId).toBe('base1-0001');
  await expect.poll(() => getLayoutOrder(app.getState())?.cardOrder.map(({ cardId }) => cardId)).toEqual([
    'base1-0001', 'base1-0002', 'base1-0003', 'base1-0004',
  ]);
  await context.close();
});

test('keyboard pocket move across pages restores focus to the moved card', async ({ browser }) => {
  test.skip(!customE2EEnabled, 'Run with npm run test:e2e:tcg-custom to enable the locally mocked Neon session.');
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const app = await mockAuthenticatedApp(context, makeBinderState('Focus binder', 6, '2x2'));
  const page = await context.newPage();

  await page.goto(`/en/tcg/collection/custom/${collectionId}`);
  await expect(page.getByRole('heading', { name: 'Focus binder', level: 1 })).toBeVisible({ timeout: 15_000 });
  const list = page.getByRole('list', { name: 'Focus binder', exact: true });
  const movedCard = list.locator('[data-sortable-id="binder-card:base1-0004:en:0"]');
  await openCardActions(movedCard, 'Card 4');
  const moveLater = movedCard.getByRole('button', { name: 'Move Card 4 one pocket later', exact: true });
  await moveLater.focus();
  await expect(moveLater).toBeFocused();
  await page.keyboard.press('Enter');

  await expect(page.getByText('Page 2 of 2', { exact: true })).toBeVisible();
  const destinationCard = list.locator('[data-sortable-id="binder-card:base1-0004:en:0"]');
  await expect(destinationCard.getByRole('button', { name: 'Drag Card 4 to reorder', exact: true })).toBeFocused();
  await expect.poll(() => getLayoutOrder(app.getState())?.cardOrder.map(({ cardId }) => cardId)).toEqual([
    'base1-0001', 'base1-0002', 'base1-0003', 'base1-0005', 'base1-0004', 'base1-0006',
  ]);
  await context.close();
});

test('dropping on a page target inserts at its first pocket and navigates there', async ({ browser }) => {
  test.skip(!customE2EEnabled, 'Run with npm run test:e2e:tcg-custom to enable the locally mocked Neon session.');
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const app = await mockAuthenticatedApp(context, makeBinderState('Cross-page binder', 6, '2x2'));
  const page = await context.newPage();

  await page.goto(`/en/tcg/collection/custom/${collectionId}`);
  await expect(page.getByRole('heading', { name: 'Cross-page binder', level: 1 })).toBeVisible({ timeout: 15_000 });
  const dropIds = await page.locator('[data-binder-drop-id]').evaluateAll((targets) => targets.map((target) => target.getAttribute('data-binder-drop-id')));
  expect(new Set(dropIds).size).toBe(dropIds.length);
  const list = page.getByRole('list', { name: 'Cross-page binder', exact: true });
  const first = list.getByRole('listitem').nth(0);
  await first.getByRole('button', { name: 'Drag Card 1 to reorder' }).dragTo(page.getByRole('button', { name: 'Next', exact: true }));

  await expect(page.getByText('Page 2 of 2', { exact: true })).toBeVisible();
  await expect(list.locator('[data-sortable-id]').first().getByText('Card 1', { exact: true })).toBeVisible();
  await expect.poll(() => getLayoutOrder(app.getState())?.cardOrder.map(({ cardId }) => cardId)).toEqual([
    'base1-0002', 'base1-0003', 'base1-0004', 'base1-0005', 'base1-0001', 'base1-0006',
  ]);
  await context.close();
});

test('a missing binder card becomes owned without changing series after tapping it on mobile', async ({ browser }) => {
  test.skip(!customE2EEnabled, 'Run with npm run test:e2e:tcg-custom to enable the locally mocked Neon session.');
  const binder = { id: collectionId, name: 'Ownership check', createdAt: updatedAt, updatedAt };
  const reference = {
    collectionId,
    cardId: 'base1-001',
    language: 'en',
    cardName: 'Alakazam',
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
  const addCardButton = card.getByRole('button', { name: 'Add Alakazam to my collection' });
  await expect(addCardButton.locator('img')).toHaveClass(/grayscale/);
  await addCardButton.click();

  await expect(card.locator('img')).not.toHaveClass(/grayscale/);
  await openCardActions(card, 'Alakazam');
  await expect(card.getByRole('spinbutton', { name: 'Binder quantity: Alakazam (en)', exact: true })).toHaveValue('1');
  await expect(card.getByRole('button', { name: 'Add Alakazam to my collection' })).toHaveCount(0);
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

test('large binders render ordered 3×3 pages with at most six detail requests at once', async ({ browser }) => {
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
  await expect(page.getByText('Page 1 of 267', { exact: true })).toBeVisible();
  await expect(page.getByRole('list', { name: 'Long list' }).getByRole('listitem')).toHaveCount(9);
  expect(app.getMaximumActiveCardRequests()).toBeGreaterThan(1);
  expect(app.getMaximumActiveCardRequests()).toBeLessThanOrEqual(6);
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  await expect(page.getByRole('list', { name: 'Long list' }).getByRole('link', { name: 'Card 10' }).first()).toBeVisible();
  await expect(page.getByText('Page 2 of 267', { exact: true })).toBeVisible();
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
  const search = panel.getByRole('searchbox', { name: 'Search cards', exact: true });
  await search.fill('Dracaufeu');
  await expect(panel.getByText('Dracaufeu', { exact: true })).toBeVisible();
  await panel.getByRole('button', { name: 'Select', exact: true }).click();
  await expect(panel.getByRole('button', { name: 'Selected', exact: true })).toBeVisible();
  await panel.getByRole('combobox', { name: 'Card language' }).selectOption('ja');
  await search.fill('リザードン');
  await expect(panel.getByText('リザードン', { exact: true })).toBeVisible();
  await panel.getByRole('button', { name: 'Select', exact: true }).click();
  await panel.getByRole('button', { name: 'Add (2 cards)', exact: true }).click();
  await page.keyboard.press('Escape');
  const list = page.getByRole('list', { name: 'Multilingual binder', exact: true });
  const cardSlots = list.locator('[data-sortable-id]');
  const frCard = list.locator('[data-sortable-id="binder-card:base1-4:fr:0"]');
  const jaCard = list.locator('[data-sortable-id="binder-card:base1-4:ja:0"]');
  await expect(cardSlots).toHaveCount(2);
  await expect(list.getByText('Set de Base · 4', { exact: true })).toBeVisible();
  await expect(list.getByText('第1弾 · 4', { exact: true })).toBeVisible();
  await expect(list.locator('img').first()).toHaveAttribute('src', /\/fr\//);
  await expect(list.locator('img').last()).toHaveAttribute('src', /\/ja\//);
  await openCardActions(frCard, 'Dracaufeu');
  const frQuantity = frCard.getByRole('spinbutton', { name: 'Binder quantity: Dracaufeu (fr)', exact: true });
  const binderLanguageFilter = page.getByRole('combobox', { name: 'Card language', exact: true })
    .filter({ has: page.getByRole('option', { name: 'All languages', exact: true }) });
  await frQuantity.focus();
  await frQuantity.press('End');
  await frQuantity.press('Backspace');
  await expect(frQuantity).toHaveValue('');
  await frQuantity.press('4');
  await frQuantity.blur();
  await expect.poll(() => (app.getState().tcgCustomCollectionCards as { language: string; quantity: number }[]).find((card) => card.language === 'fr')?.quantity).toBe(4);
  expect(app.getState().tcgCollectionCards).toEqual(seriesBefore);
  await page.screenshot({ path: testInfo.outputPath('multilingual-binder-desktop.png'), fullPage: true });
  await binderLanguageFilter.selectOption('ja');
  await expect(cardSlots).toHaveCount(1);
  await expect(list.getByText('リザードン', { exact: true })).toHaveCount(1);
  await binderLanguageFilter.selectOption('');
  await page.getByRole('searchbox', { name: 'Search cards', exact: true }).fill('Drac');
  await expect(cardSlots).toHaveCount(4);
  await page.getByRole('searchbox', { name: 'Search cards', exact: true }).fill('');
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Multilingual binder', exact: true })).toBeVisible({ timeout: 20_000 });
  await openCardActions(frCard, 'Dracaufeu, copy 1');
  const frQuantityCopy1 = frCard.getByRole('spinbutton', { name: 'Binder quantity: Dracaufeu, copy 1 (fr)', exact: true });
  await expect(frQuantityCopy1).toHaveValue('4');
  await openCardActions(jaCard, 'リザードン');
  await expect(jaCard.getByRole('spinbutton', { name: 'Binder quantity: リザードン (ja)', exact: true })).toHaveValue('1');
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
  await openCardActions(frCard, 'Dracaufeu, copy 1');
  await expect(frQuantityCopy1).toHaveValue('4');
  await page.getByRole('complementary', { name: 'Card actions for Dracaufeu, copy 1', exact: true })
    .getByRole('button', { name: 'Remove from this collection: Dracaufeu', exact: true }).click();
  await expect(cardSlots).toHaveCount(1);
  await expect.poll(() => (app.getState().tcgCustomCollectionCards as unknown[]).length).toBe(1);
  expect(app.getState().tcgCollectionCards).toEqual(seriesAfter);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Multilingual binder', exact: true })).toBeVisible({ timeout: 20_000 });
  await expect(cardSlots).toHaveCount(1);
  await expect(list.getByText('リザードン', { exact: true })).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('multilingual-binder-mobile-after-removal.png'), fullPage: true });
  expect(consoleErrors).toEqual([]);
  expect(errors).toEqual([]);
  await context.close();
});
