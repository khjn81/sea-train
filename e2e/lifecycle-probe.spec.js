import { test, expect } from '@playwright/test';

// A bounded real-time leak check: the original guide timer fires after 8 seconds.
// This supplements the frozen core evaluator and is compared before/after cleanup.
test('context-loss fallback remains safe after delayed timers and connectivity changes', async ({ page, context }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await expect(page.locator('#scene canvas')).toBeVisible();
  await page.locator('#scene canvas').evaluate(canvas => canvas.dispatchEvent(new Event('webglcontextlost', { cancelable: true })));
  await expect(page.getByRole('alert')).toBeVisible();
  await page.waitForTimeout(9_000);
  await context.setOffline(true);
  await context.setOffline(false);
  await expect(page.getByRole('alert')).toBeVisible();
  expect(errors).toEqual([]);
});

test('a missing panorama preserves an interactive train with a readable fallback sky', async ({ page }, testInfo) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/landscape-panorama.jpg', route => route.abort('failed'));
  await page.goto('/');
  await expect(page.locator('#scene canvas')).toBeVisible();
  await expect(page.locator('#people')).toHaveAttribute('title', /실제 접속/);
  await page.locator('#settings').click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await page.screenshot({ path: testInfo.outputPath('asset-fallback.png') });
  expect(errors).toEqual([]);
});
