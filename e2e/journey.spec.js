import { test, expect } from '@playwright/test';

async function enter(page) {
  await page.goto('/');
  await expect(page.locator('#scene canvas')).toBeVisible();
  await expect(page.locator('#people')).toHaveAttribute('title', /실제 접속/);
}

test('renders the train and completes seating, reading, window view and standing', async ({ page }, testInfo) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await enter(page);
  await page.locator('#relax').click();
  await page.locator('[data-action="read"]').click();
  await expect(page.locator('#journey-state')).toHaveText('책을 읽는 중');
  await page.locator('#look').click();
  await expect(page.locator('#look')).toHaveAttribute('aria-pressed', 'true');
  await page.locator('#look').click();
  await expect(page.locator('#look')).toHaveAttribute('aria-pressed', 'false');
  await page.screenshot({ path: testInfo.outputPath('resting.png') });
  await page.locator('#stand').click();
  await expect(page.locator('#sit')).toBeEnabled();
  expect(errors).toEqual([]);
});

test('real people receive greetings and resting actions from a second browser context', async ({ page, browser }) => {
  await enter(page);
  const otherContext = await browser.newContext();
  const other = await otherContext.newPage();
  try {
    await other.goto(page.url());
    await expect(page.locator('#count')).toHaveText('2');
    await expect(other.locator('#count')).toHaveText('2');
    await page.locator('#greet').click();
    await expect(other.locator('.toast')).toContainText('님이 손을 흔들었어요');
    await page.locator('#relax').click();
    await page.locator('[data-action="tea"]').click();
    await expect(page.locator('#journey-state')).toHaveText('따뜻한 차를 마시는 중');
    await other.locator('#people').click();
    await expect(other.locator('#modal-content')).toContainText('따뜻한 차를 마시는 중');
    await expect(other.locator('#modal-content')).toContainText('데모 동승 10명');
  } finally {
    await otherContext.close();
  }
  await expect(page.locator('#count')).toHaveText('1');
});

test('settings survive reload and modal focus returns to its trigger', async ({ page }) => {
  await enter(page);
  await page.locator('#settings').click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.locator('#reduce').check();
  await page.locator('#volume').focus();
  await page.keyboard.press('Home');
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('Escape');
  await expect(page.locator('#settings')).toBeFocused();
  await page.reload();
  await expect(page.locator('#scene canvas')).toBeVisible();
  await page.locator('#settings').click();
  await expect(page.locator('#reduce')).toBeChecked();
  await expect(page.locator('#volume')).toHaveValue('1');
});

test('small viewports keep every primary action reachable without horizontal overflow', async ({ page }) => {
  await enter(page);
  const width = await page.evaluate(() => ({ document: document.documentElement.scrollWidth, viewport: innerWidth }));
  expect(width.document).toBeLessThanOrEqual(width.viewport);
  for (const id of ['greet', 'sit', 'relax', 'look', 'stand']) {
    const box = await page.locator('#' + id).boundingBox();
    expect(box.width).toBeGreaterThanOrEqual(44);
    expect(box.height).toBeGreaterThanOrEqual(44);
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(width.viewport);
  }
});
