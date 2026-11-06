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

test('a hidden document pauses scene drawing and sound without automatic audio restart', async ({ page }) => {
  await page.addInitScript(() => {
    window.__sceneDraws = 0;
    for (const method of ['drawElements', 'drawElementsInstanced', 'drawArrays']) {
      const original = WebGL2RenderingContext.prototype[method];
      WebGL2RenderingContext.prototype[method] = function(...args) {
        window.__sceneDraws++;
        return original.apply(this, args);
      };
    }
  });
  await page.goto('/');
  await expect(page.locator('#scene canvas')).toBeVisible();
  await page.waitForLoadState('networkidle');
  await page.locator('#sound').click();
  await expect(page.locator('#sound')).toHaveAttribute('aria-pressed', 'true');
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, value: true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await expect(page.locator('#sound')).toHaveAttribute('aria-pressed', 'false');
  const before = await page.evaluate(() => window.__sceneDraws);
  await page.waitForTimeout(150); // Bounded drawing interval, not a loading workaround.
  expect(await page.evaluate(() => window.__sceneDraws)).toBe(before);
  await page.evaluate(() => {
    delete document.hidden;
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await expect.poll(() => page.evaluate(() => window.__sceneDraws)).toBeGreaterThan(before);
  await expect(page.locator('#sound')).toHaveAttribute('aria-pressed', 'false');
});
