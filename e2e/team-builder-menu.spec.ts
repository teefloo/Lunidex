import { expect, test } from '@playwright/test';

test('team actions stay visible above the mobile navigation at 320px', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 720 });
  await page.goto('/en/team');

  const menu = page.locator('main details.team-actions-menu');
  const summary = menu.locator('summary');
  await summary.focus();
  await page.keyboard.press('Enter');

  await expect(menu).toHaveAttribute('open', '');
  const panel = menu.locator('.team-actions-menu-panel');
  const importButton = panel.getByRole('button', { name: 'Import Showdown' });
  await expect(importButton).toBeVisible();
  await expect(summary).toBeFocused();

  const bounds = await panel.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    const bottomNav = document.querySelector('.primary-bottom-nav')?.getBoundingClientRect();
    return {
      left: rect.left,
      right: rect.right,
      bottom: rect.bottom,
      bottomNavTop: bottomNav?.top ?? window.innerHeight,
    };
  });

  expect(bounds.left).toBeGreaterThanOrEqual(0);
  expect(bounds.right).toBeLessThanOrEqual(320);
  expect(bounds.bottom).toBeLessThanOrEqual(bounds.bottomNavTop);

  await page.keyboard.press('Tab');
  await expect(importButton).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('dialog')).toBeVisible();
});

test('team actions are clickable beyond the header surface at 390px', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/en/team');

  const menu = page.locator('main details.team-actions-menu');
  const summary = menu.locator('summary');
  await summary.focus();
  await page.keyboard.press('Enter');

  const importButton = menu.getByRole('button', { name: 'Import Showdown' });
  await expect(importButton).toBeVisible();
  const canReachButton = await importButton.evaluate((button) => {
    const rect = button.getBoundingClientRect();
    const hit = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
    return hit === button || (hit instanceof Node && button.contains(hit));
  });

  expect(canReachButton).toBe(true);
});
