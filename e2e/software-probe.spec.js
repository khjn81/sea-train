import { test, expect } from '@playwright/test';

test('software graphics keeps a bounded scene and usable controls', async ({ page }, info) => {
  await page.addInitScript(() => {
    const native = WebGL2RenderingContext.prototype.getParameter;
    WebGL2RenderingContext.prototype.getParameter = function(parameter) {
      if (parameter === 0x9246) return 'ANGLE (Software SwiftShader Device)';
      return native.call(this, parameter);
    };
  });
  await page.goto('/');
  const canvas = page.locator('#scene canvas');
  await expect(canvas).toBeVisible();
  expect(await canvas.evaluate(c => c.width)).toBeLessThanOrEqual(640);
  await page.locator('#relax').click();
  await page.locator('[data-action="read"]').click();
  await expect(page.locator('#journey-state')).toHaveText('책을 읽는 중');
  await page.screenshot({ path: info.outputPath('software-graphics.png') });
});
