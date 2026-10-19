import { expect, test } from '@playwright/test';

const resetToken = 'fixture-reset-token';
const newPassword = 'fixture-password-123';

test('reset token is removed from the URL and retained for the password update', async ({ browser }) => {
  const context = await browser.newContext({ locale: 'fr-FR' });
  const authRequests: Array<{ path: string; method: string; body: unknown }> = [];

  await context.route('**/*', async (route) => {
    const hostname = new URL(route.request().url()).hostname;
    if (hostname === '127.0.0.1' || hostname === 'localhost') {
      await route.continue();
      return;
    }
    await route.abort();
  });

  await context.route('**/api/auth/**', async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    if (path.endsWith('/get-session')) {
      await route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ error: 'No test session' }) });
      return;
    }

    const body = request.postDataJSON() as unknown;
    authRequests.push({ path, method: request.method(), body });
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: {}, error: null }) });
  });

  const page = await context.newPage();
  await page.goto(`/fr/auth/reset-password?token=${resetToken}&source=e2e`, { waitUntil: 'networkidle' });

  await expect.poll(() => new URL(page.url()).searchParams.has('token')).toBe(false);
  await expect(page).toHaveURL(/source=e2e/);
  const passwordFields = page.locator('input[type="password"]');
  await expect(passwordFields).toHaveCount(2);
  await passwordFields.nth(0).fill(newPassword);
  await passwordFields.nth(1).fill(newPassword);
  await page.locator('form button[type="submit"]').click();

  await expect.poll(() => authRequests.some(({ method, body }) => (
    method === 'POST'
    && typeof body === 'object'
    && body !== null
    && 'token' in body
    && body.token === resetToken
  ))).toBe(true);

  expect(authRequests.every(({ path }) => path.startsWith('/api/auth/'))).toBe(true);
  await context.close();
});
