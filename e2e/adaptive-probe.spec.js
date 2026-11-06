import { test, expect } from '@playwright/test';

test('sustained slow frames reduce graphics even when renderer identity is restricted', async ({ page }) => {
  await page.addInitScript(() => {
    const original = WebGL2RenderingContext.prototype.getExtension;
    WebGL2RenderingContext.prototype.getExtension = function(name) {
      return name === 'WEBGL_debug_renderer_info' ? null : original.call(this, name);
    };
    const nativeFrame = window.requestAnimationFrame.bind(window);
    window.requestAnimationFrame = callback => nativeFrame(() => setTimeout(() => callback(performance.now()), 140));
  });
  await page.goto('/');
  const canvas = page.locator('#scene canvas');
  await expect(canvas).toBeVisible();
  await expect.poll(() => canvas.evaluate(c => c.width), { timeout: 5000 }).toBeLessThanOrEqual(384);
  await page.locator('#relax').click();
  await page.locator('[data-action="tea"]').click();
  await expect(page.locator('#journey-state')).toHaveText('따뜻한 차를 마시는 중');
  await page.locator('#stand').click();
  await expect(page.locator('#sit')).toBeEnabled();
});
