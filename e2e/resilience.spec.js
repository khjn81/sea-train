import { test, expect } from '@playwright/test';

async function boot(page) {
  await page.goto('/');
  await expect(page.locator('#scene canvas')).toBeVisible();
}

test('denied local storage cannot prevent a visit', async ({ page }) => {
  await page.addInitScript(() => {
    Storage.prototype.getItem = () => { throw new DOMException('Storage denied', 'SecurityError'); };
    Storage.prototype.setItem = () => { throw new DOMException('Storage denied', 'SecurityError'); };
  });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await boot(page);
  await page.locator('#settings').click();
  await page.locator('#reduce').check();
  await page.keyboard.press('Escape');
  await page.locator('#sit').click();
  await expect(page.locator('#journey-state')).toContainText('가만히 쉬는 중');
  expect(errors).toEqual([]);
});

test('corrupt and out-of-range volume uses a finite bounded default', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('sea:volume', 'not-a-number'));
  await boot(page);
  await page.locator('#settings').click();
  await expect(page.locator('#volume')).toHaveValue('45');
  await expect(page.locator('#volume-value')).toHaveText('45%');
});

test('Escape closes the action menu and restores its expanded state', async ({ page }) => {
  await boot(page);
  await page.locator('#relax').click();
  await expect(page.locator('#relax')).toHaveAttribute('aria-expanded', 'true');
  await page.keyboard.press('Escape');
  await expect(page.locator('#action-panel')).toBeHidden();
  await expect(page.locator('#relax')).toHaveAttribute('aria-expanded', 'false');
  await expect(page.locator('#relax')).toBeFocused();
});

test('modal isolates background controls and traps keyboard focus', async ({ page }) => {
  await boot(page);
  await page.locator('#settings').click();
  await page.keyboard.press('Shift+Tab');
  await expect(page.locator('#reduce')).toBeFocused();
  expect(await page.locator('.top').evaluate(el => el.inert)).toBe(true);
  await page.keyboard.press('Escape');
  expect(await page.locator('.top').evaluate(el => el.inert)).toBe(false);
  await expect(page.locator('#settings')).toBeFocused();
});

test('system reduced motion changes are respected when no explicit override exists', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await boot(page);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.locator('#settings').click();
  await expect(page.locator('#reduce')).toBeChecked();
});

test('the scene is keyboard focusable and arrow movement can be cancelled', async ({ page }) => {
  await boot(page);
  await page.locator('#scene canvas').focus();
  await expect(page.locator('#scene canvas')).toBeFocused();
  await page.keyboard.down('ArrowUp');
  await expect(page.locator('#journey-state')).toContainText('걷');
  await page.keyboard.up('ArrowUp');
  await page.keyboard.press('Escape');
  await expect(page.locator('#sit')).toBeEnabled();
});

test('the visit needs no cross-origin fonts or assets', async ({ page }) => {
  const external = [];
  const origin = new URL(test.info().project.use.baseURL || 'http://127.0.0.1:4180').origin;
  page.on('request', request => {
    const url = request.url();
    if (url.startsWith('http') && new URL(url).origin !== origin) external.push(url);
  });
  await boot(page);
  await page.locator('#settings').click();
  expect(external).toEqual([]);
});

test('audio startup failure gives feedback without an unhandled error', async ({ page }) => {
  await page.addInitScript(() => { window.AudioContext = class { constructor() { throw new Error('Audio unavailable'); } }; });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await boot(page);
  await page.locator('#sound').click();
  await expect(page.locator('.toast')).toContainText('소리');
  await expect(page.locator('#sound')).toHaveAttribute('aria-pressed', 'false');
  expect(errors).toEqual([]);
});

test('WebGL unavailable shows an actionable fallback rather than a broken visit', async ({ page }) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function(type, ...args) {
      return String(type).startsWith('webgl') ? null : original.call(this, type, ...args);
    };
  });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await expect(page.getByRole('alert')).toContainText('3D');
  await expect(page.getByRole('button', { name: /다시/ })).toBeVisible();
  expect(errors).toEqual([]);
});

test('simulated graphics context loss offers a deliberate reload', async ({ page }) => {
  await boot(page);
  await page.locator('#scene canvas').evaluate(canvas => canvas.dispatchEvent(new Event('webglcontextlost', { cancelable: true })));
  await expect(page.getByRole('alert')).toContainText('3D');
  await page.getByRole('button', { name: /다시/ }).click();
  await expect(page.locator('#scene canvas')).toBeVisible();
});

test('connection loss and recovery have an explicit user-visible status', async ({ page, context }) => {
  await boot(page);
  await expect(page.locator('#connection-state')).toContainText('함께');
  await context.setOffline(true);
  await expect(page.locator('#connection-state')).toContainText('혼자');
  await context.setOffline(false);
  await expect(page.locator('#connection-state')).toContainText('함께');
});

test('scene capture produces a real downloadable PNG', async ({ page }) => {
  await boot(page);
  await page.locator('#capture').click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.locator('.postcard')).toBeVisible();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('link', { name: '이미지 저장' }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/\.png$/);
  expect(await download.failure()).toBeNull();
});
