import { expect, test, type BrowserContext, type Page, type Route } from '@playwright/test';

const userId = '00000000-0000-4000-8000-000000000001';
const updatedAt = '2026-10-19T10:00:00.000Z';
const collectionId = '126e8648-39da-4fc9-88b2-fd194d28cc5a';
const e2eBaseUrl = process.env.E2E_BASE_URL;
const localMockBaseUrl = !e2eBaseUrl || /^http:\/\/(localhost|127\.0\.0\.1):3000$/.test(e2eBaseUrl);
const customE2EEnabled = process.env.E2E_CUSTOM_COLLECTIONS === '1' && localMockBaseUrl;

type E2EState = Record<string, unknown>;

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

function cardPayload(cardId: string) {
  const suffix = cardId.slice(cardId.lastIndexOf('-') + 1);
  const numeric = Number.parseInt(suffix, 10);
  return {
    id: cardId,
    localId: suffix,
    name: Number.isFinite(numeric) ? `Card ${numeric}` : 'Alakazam',
    image: 'https://assets.tcgdex.net/en/base/base1/1',
    rarity: 'Rare',
    category: 'Pokemon',
    stage: 'Basic',
    types: ['Psychic'],
    set: { id: 'base1', name: 'Base Set', cardCount: { total: 102, official: 102 } },
    variants: { normal: true },
  };
}

async function mockAuthenticatedApp(context: BrowserContext, initialState: E2EState) {
  let state = initialState;
  let stateVersion = updatedAt;
  let activeCardRequests = 0;
  let maximumActiveCardRequests = 0;
  let catalogFailure = false;
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
    const body = route.request().postDataJSON() as { data?: E2EState };
    state = body.data ?? state;
    stateVersion = new Date(Date.parse(stateVersion) + 1_000).toISOString();
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, data: state, updatedAt: stateVersion }) });
  });

  await context.route('https://api.tcgdex.net/v2/**', async (route: Route) => {
    const url = new URL(route.request().url());
    const cardPath = url.pathname.match(/\/cards\/([^/]+)$/);
    if (cardPath) {
      activeCardRequests += 1;
      maximumActiveCardRequests = Math.max(maximumActiveCardRequests, activeCardRequests);
      await new Promise((resolve) => setTimeout(resolve, cardRequestDelayMs));
      activeCardRequests -= 1;
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(cardPayload(decodeURIComponent(cardPath[1]))) });
      return;
    }
    if (url.pathname.endsWith('/cards')) {
      if (catalogFailure) {
        await route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ error: 'catalog unavailable' }) });
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([{ ...cardPayload('base1-001'), name: 'Alakazam', localId: '001', stage: 'Stage2' }]),
      });
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

  return {
    getState: () => state,
    getMaximumActiveCardRequests: () => maximumActiveCardRequests,
    setCatalogFailure: (failed: boolean) => { catalogFailure = failed; },
  };
}

async function createBinderAndOpen(page: Page, name: string) {
  await page.goto('/en/tcg/collection?view=custom');
  await expect(page.getByRole('heading', { name: 'Custom collections', exact: true })).toBeVisible({ timeout: 15_000 });
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
    await page.getByRole('button', { name: 'Add', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Already added' })).toBeVisible();
    app.setCatalogFailure(true);
    await search.fill('offline lookup');
    await expect(panel.getByRole('alert')).toContainText('Cards could not be searched. Check your connection and try again.');
    app.setCatalogFailure(false);
    await page.keyboard.press('Escape');
    await expect(panel).toBeHidden();
    await expect(page.getByRole('button', { name: 'Add cards' }).first()).toBeFocused();
    await expect.poll(() => (app.getState().tcgCustomCollectionCards as unknown[] | undefined)?.length).toBe(1);

    await page.reload();
    await expect(page.getByRole('heading', { name: 'Favorites', level: 1 })).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText('Card 1')).toBeVisible();
    await expect(page.getByText('Not owned')).toBeVisible();
    await expect(page.locator('main')).toContainText('1 cards');

    await page.getByRole('button', { name: 'Delete: Favorites' }).click();
    await expect(page.getByText('Cards in your global inventory will be kept.')).toBeVisible();
    await page.getByRole('button', { name: 'Cancel' }).click();
    await expect(page.getByRole('heading', { name: 'Favorites', level: 1 })).toBeVisible();
    await context.close();
  });
}

test('a missing binder card becomes owned and colorful after tapping it on mobile', async ({ browser }) => {
  test.skip(!customE2EEnabled, 'Run with npm run test:e2e:tcg-custom to enable the locally mocked Neon session.');
  const binder = { id: collectionId, name: 'Ownership check', createdAt: updatedAt, updatedAt };
  const reference = {
    collectionId,
    cardId: 'base1-001',
    language: 'en',
    cardName: 'Card 1',
    addedAt: updatedAt,
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
  await expect.poll(() => (app.getState().tcgOwnedCards as string[] | undefined)?.includes('base1-001')).toBe(true);
  await expect.poll(() => (app.getState().tcgCollectionCards as unknown[] | undefined)?.length).toBe(1);

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
