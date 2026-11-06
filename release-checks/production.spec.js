import { test, expect } from '@playwright/test';

test('production serves a complete four-action visit including actual touch input', async ({ page, request }, testInfo) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const activate = locator => testInfo.project.use.hasTouch ? locator.tap() : locator.click();
  await page.goto('/');
  await expect(page.locator('#scene canvas')).toBeVisible();
  await expect(page.locator('#connection-state')).toContainText('함께');
  await page.waitForLoadState('networkidle');
  await page.screenshot({ path: testInfo.outputPath('train-initial.png') });
  for (const [action, label] of [
    ['tea', '따뜻한 차를 마시는 중'], ['stretch', '기지개를 켜는 중'],
    ['idle', '가만히 쉬는 중'], ['read', '책을 읽는 중'],
  ]) {
    await activate(page.locator('#relax'));
    await activate(page.locator(`[data-action="${action}"]`));
    await expect(page.locator('#journey-state')).toHaveText(label);
  }
  await activate(page.locator('#look'));
  await expect(page.locator('#look')).toHaveAttribute('aria-pressed', 'true');
  await activate(page.locator('#look'));
  await activate(page.locator('#stand'));
  await expect(page.locator('#sit')).toBeEnabled();
  expect((await (await request.get('/healthz')).json()).status).toBe('ok');
  expect((await request.get('/src/main.js')).status()).toBe(404);
  const mime = await request.get('/');
  expect(mime.headers()['content-type']).toContain('text/html');
  expect(errors).toEqual([]);
});

test('production shares real greetings and produces a downloadable scene', async ({ page, browser }, testInfo) => {
  const activate = locator => testInfo.project.use.hasTouch ? locator.tap() : locator.click();
  await page.goto('/');
  await expect(page.locator('#scene canvas')).toBeVisible();
  const otherContext = await browser.newContext();
  try {
    const other = await otherContext.newPage();
    await other.goto(page.url());
    await expect(page.locator('#count')).toHaveText('2');
    await activate(page.locator('#greet'));
    await expect(other.locator('.toast')).toContainText('님이 손을 흔들었어요');
    await otherContext.close();
    await expect(page.locator('#count')).toHaveText('1');
    await activate(page.locator('#capture'));
    await expect(page.locator('.postcard')).toBeVisible();
    const downloading = page.waitForEvent('download');
    await activate(page.getByRole('link', { name: '이미지 저장' }));
    expect(await (await downloading).failure()).toBeNull();
  } finally { await otherContext.close(); }
});
