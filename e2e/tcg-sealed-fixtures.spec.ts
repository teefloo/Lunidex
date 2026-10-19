import { expect, test, type BrowserContext, type Route } from '@playwright/test';

const fixtureSessionEnabled = process.env.E2E_CUSTOM_COLLECTIONS === '1' && !process.env.E2E_BASE_URL;
const userId = '00000000-0000-4000-8000-000000000001';
const fixtureTimestamp = '2026-10-19T10:00:00.000Z';

const product = {
  cardmarketProductId: 600001,
  name: 'Booster de test',
  categoryId: 52,
  categoryName: 'Booster',
  expansionId: 1,
  cardmarketUrl: 'https://www.cardmarket.com/en/Pokemon/Products/Booster-Boxes/Fixture',
  imageAvailable: false,
  sourceAt: fixtureTimestamp,
  updatedAt: fixtureTimestamp,
  active: true,
};

function emptyOverview() {
  return {
    revision: 1,
    priceRevision: 1,
    totals: {
      units: 0, costCents: 0, valueCents: null, latentCents: null, realizedCents: 0, totalCents: null,
      spentCents: 0, grossSalesCents: 0, netSalesCents: 0, buyFeesCents: 0, sellFeesCents: 0,
      bought: 0, sold: 0, exchangeIn: 0, exchangeOut: 0, distinct: 0, missingPrices: 0, roi: null,
      cashFlowCents: 0, soldCostCents: 0, averageEntryCents: null, averageExitCents: null,
      holdingDays: null, winningSales: null, losingSales: null, profitPerSoldUnitCents: null, sellThrough: null,
    },
    positions: [], lots: [], sales: [], exchanges: [], history: [], recent: [], cashflow: [], sync: [], lastSync: null,
    period: {
      from: '2026-01-01', to: '2026-10-19', buysCents: 0, netSalesCents: 0, realizedCents: 0,
      cashFlowCents: 0, endStockCostCents: 0, valueChangeCents: null,
    },
  };
}

async function fulfillJson(route: Route, body: unknown, status = 200) {
  await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
}

async function mockPrivateSession(context: BrowserContext) {
  let state: Record<string, unknown> = {
    tcgOwnedCards: [], tcgLegacyOwnedCards: [], tcgCollections: [], tcgCollectionCards: [], tcgActiveCollections: [],
    tcgCollectionModelVersion: 3, tcgBrowseLanguage: 'en', tcgDisplayCurrency: 'EUR', tcgWishlistCards: [],
    tcgCustomCollections: [], tcgCustomCollectionCards: [],
  };
  let createdTransaction: Record<string, unknown> | null = null;
  const catalogueQueries: string[] = [];
  const mutationRequests: Array<{ method: string; path: string }> = [];

  // Every external request is blocked. Specific local mocks below intercept all
  // account and sealed-workspace reads and writes before they reach the server.
  await context.route('**/*', async (route) => {
    const requestUrl = new URL(route.request().url());
    if (requestUrl.hostname === '127.0.0.1' || requestUrl.hostname === 'localhost') {
      await route.continue();
      return;
    }
    await route.abort();
  });

  await context.route('**/api/auth/**', async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith('/get-session')) {
      await fulfillJson(route, {
        user: { id: userId, email: 'fixture-trainer@example.test', name: 'Fixture Trainer', createdAt: fixtureTimestamp },
        session: { id: 'local-fixture-session', token: 'local-fixture-token', expiresAt: '2027-10-19T10:00:00.000Z' },
      });
      return;
    }
    await fulfillJson(route, { token: 'local-fixture-token' });
  });

  await context.route('**/api/user-state', async (route) => {
    if (route.request().method() === 'GET') {
      await fulfillJson(route, { data: state, updatedAt: fixtureTimestamp });
      return;
    }
    const payload = route.request().postDataJSON() as { data?: Record<string, unknown> };
    state = payload.data ?? state;
    await fulfillJson(route, { ok: true, data: state, updatedAt: fixtureTimestamp });
  });

  await context.route('**/api/tcg/sealed/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname;
    if (path.endsWith('/guide')) {
      await fulfillJson(route, { error: 'fixture guide unavailable' }, 503);
    } else if (path.endsWith('/overview')) {
      await fulfillJson(route, emptyOverview());
    } else if (path.endsWith('/catalogue')) {
      catalogueQueries.push(url.searchParams.get('q') ?? '');
      await fulfillJson(route, { products: [product], prices: [], total: 1, page: 0, pageSize: 20 });
    } else if (path.endsWith('/transactions') && request.method() === 'POST') {
      mutationRequests.push({ method: request.method(), path });
      const draft = request.postDataJSON() as Record<string, unknown>;
      createdTransaction = {
        ...draft,
        id: 'fixture-transaction-1',
        revision: 1,
        createdAt: fixtureTimestamp,
        updatedAt: fixtureTimestamp,
        voided: false,
      };
      await fulfillJson(route, { transaction: createdTransaction, revision: 2 });
    } else if (path.endsWith('/void') && request.method() === 'POST') {
      mutationRequests.push({ method: request.method(), path });
      createdTransaction = { ...createdTransaction, voided: true, revision: 3, updatedAt: fixtureTimestamp };
      await fulfillJson(route, { transaction: createdTransaction, revision: 3 });
    } else if (path.includes('/transactions/') && request.method() === 'PATCH') {
      mutationRequests.push({ method: request.method(), path });
      const draft = request.postDataJSON() as Record<string, unknown>;
      createdTransaction = { ...createdTransaction, ...draft, id: 'fixture-transaction-1', revision: 2, updatedAt: fixtureTimestamp };
      await fulfillJson(route, { transaction: createdTransaction, revision: 3 });
    } else if (path.endsWith('/transactions')) {
      await fulfillJson(route, { revision: 2, transactions: createdTransaction ? [createdTransaction] : [] });
    } else {
      await fulfillJson(route, {});
    }
  });

  return {
    catalogueQueries,
    mutationRequests,
    getCreatedTransaction: () => createdTransaction,
  };
}

test('sealed transaction form searches and saves using local fixtures on a short mobile viewport', async ({ browser }) => {
  test.skip(!fixtureSessionEnabled, 'Run locally with E2E_CUSTOM_COLLECTIONS=1 to enable the mocked private session and API fixtures.');

  const context = await browser.newContext({
    viewport: { width: 320, height: 568 },
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
    locale: 'fr-FR',
  });
  const fixture = await mockPrivateSession(context);
  const page = await context.newPage();
  const pageErrors: string[] = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));

  await page.goto('/fr/tcg/sealed', { waitUntil: 'networkidle' });
  await page.waitForResponse((response) => (
    new URL(response.url()).pathname === '/api/user-state'
    && response.request().method() === 'GET'
  ));
  await expect(page.locator('main h1')).toHaveText('Tableau de bord');
  await expect(page.getByRole('heading', { name: 'Votre portefeuille scellés est vide.' })).toBeVisible();

  await page.getByRole('button', { name: 'Ajouter une transaction' }).first().tap();
  const dialog = page.getByRole('dialog', { name: 'Ajouter une transaction' });
  await expect(dialog).toBeVisible();
  const bounds = await dialog.boundingBox();
  expect(bounds?.y).toBeGreaterThanOrEqual(0);
  expect((bounds?.y ?? 0) + (bounds?.height ?? 0)).toBeLessThanOrEqual(568);

  const productSearch = dialog.getByRole('textbox', { name: 'Produit', exact: true });
  await productSearch.fill('Booster');
  const productOption = dialog.getByRole('option', { name: 'Booster de test' });
  await expect(productOption).toBeVisible();
  await productOption.tap();

  await dialog.getByLabel('Quantité').fill('2');
  await dialog.locator('#sealed-unitPriceCents').fill('10,50');
  await dialog.getByLabel('Notes').fill('Transaction de fixture');
  const saveButton = dialog.getByRole('button', { name: 'Enregistrer', exact: true });
  expect((await saveButton.boundingBox())?.height).toBeGreaterThanOrEqual(44);
  await saveButton.tap();
  await expect(dialog).toBeHidden();

  expect(fixture.catalogueQueries).toContain('Booster');
  expect(fixture.getCreatedTransaction()).toMatchObject({
    kind: 'buy',
    cardmarketProductId: 600001,
    quantity: 2,
    unitPriceCents: 1050,
    notes: 'Transaction de fixture',
  });

  const journal = page.getByRole('navigation', { name: 'Portefeuille scellés' })
    .getByRole('link', { name: 'Journal', exact: true });
  await journal.tap();
  await page.waitForURL('**/fr/tcg/sealed/journal');
  await expect(page.getByText('#600001', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Modifier', exact: true })).toBeVisible();

  await page.getByRole('button', { name: 'Modifier', exact: true }).tap();
  const editDialog = page.getByRole('dialog', { name: 'Modifier la transaction' });
  await expect(editDialog).toBeVisible();
  const editProduct = editDialog.getByRole('textbox', { name: 'Produit', exact: true });
  await editProduct.fill('Booster');
  await editDialog.getByRole('option', { name: 'Booster de test' }).tap();
  await editDialog.getByLabel('Notes').fill('Transaction ajustée');
  await editDialog.getByRole('button', { name: 'Enregistrer', exact: true }).tap();
  await expect(editDialog).toBeHidden();
  expect(fixture.getCreatedTransaction()).toMatchObject({ notes: 'Transaction ajustée' });

  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: 'Annuler la transaction', exact: true }).tap();
  await expect(page.getByText('Transaction annulée')).toBeVisible();
  expect(fixture.getCreatedTransaction()).toMatchObject({ voided: true });
  expect(fixture.mutationRequests.map(({ method }) => method)).toEqual(['POST', 'PATCH', 'POST']);
  expect(pageErrors).toEqual([]);
  await context.close();
});

test('public sealed market filters preserve their query and product detail offers a route back', async ({ browser }) => {
  const context = await browser.newContext({
    viewport: { width: 320, height: 568 },
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
    locale: 'fr-FR',
  });
  const page = await context.newPage();

  await page.goto('/fr/tcg/sealed/market', { waitUntil: 'networkidle' });
  await expect(page.locator('main h1')).toHaveText('Marché des produits scellés');
  await expect(page.getByRole('alert')).toBeVisible();

  const filters = page.locator('form[action="/fr/tcg/sealed/market"]');
  await filters.getByRole('searchbox', { name: 'Rechercher des produits scellés' }).fill('Booster');
  await filters.getByRole('spinbutton', { name: 'ID extension' }).fill('123');
  const applyFilters = filters.getByRole('button', { name: 'Appliquer les filtres' });
  expect((await applyFilters.boundingBox())?.height).toBeGreaterThanOrEqual(44);
  await applyFilters.tap();
  await page.waitForURL((url) => (
    url.pathname === '/fr/tcg/sealed/market'
    && url.searchParams.get('q') === 'Booster'
    && url.searchParams.get('expansion') === '123'
  ));
  await expect(page.getByRole('link', { name: 'Effacer les filtres' })).toBeVisible();
  await page.getByRole('link', { name: 'Effacer les filtres' }).tap();
  await page.waitForURL('**/fr/tcg/sealed/market');

  await page.goto('/fr/tcg/sealed/market/products/611877', { waitUntil: 'networkidle' });
  await expect(page.locator('main h1')).toBeVisible();
  await expect(page.locator('main h1')).not.toHaveText('Fiche produit indisponible');
  await expect(page.getByRole('heading', { name: 'Historique des prix' })).toBeVisible();
  await page.getByRole('link', { name: /Retour au marché/i }).tap();
  await page.waitForURL('**/fr/tcg/sealed/market');

  const dimensions = await page.evaluate(() => ({
    width: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.width);
  await context.close();
});
