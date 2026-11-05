import { defineConfig, devices } from '@playwright/test';
import { existsSync } from 'node:fs';

const external = process.env.E2E_BASE_URL;
const channel = existsSync('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome') ? 'chrome' : undefined;
export default defineConfig({
  testDir: './e2e',
  timeout: 25_000,
  expect: { timeout: 15_000 },
  globalTimeout: 180_000,
  workers: 1,
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: external || 'http://127.0.0.1:4180',
    channel,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    actionTimeout: 8_000,
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } } },
    { name: 'mobile', use: { ...devices['Pixel 5'], viewport: { width: 360, height: 740 } } },
  ],
  webServer: external ? undefined : [
    { command: 'node server.js', port: 3001, reuseExistingServer: false, timeout: 15_000 },
    { command: 'node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 4180 --strictPort', url: 'http://127.0.0.1:4180', reuseExistingServer: false, timeout: 20_000 },
  ],
});
