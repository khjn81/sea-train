import { defineConfig } from '@playwright/test';
import { existsSync } from 'node:fs';

const channel = existsSync('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome') ? 'chrome' : undefined;
export default defineConfig({
  testDir: './release-checks',
  outputDir: './test-results-release',
  timeout: 35_000,
  expect: { timeout: 12_000 },
  globalTimeout: 240_000,
  workers: 1,
  retries: 0,
  forbidOnly: Boolean(process.env.CI),
  reporter: [['list'], ['json', { outputFile: 'test-results-release/summary.json' }]],
  use: { baseURL: 'http://127.0.0.1:4185', trace: 'retain-on-failure', screenshot: 'only-on-failure' },
  projects: [
    { name: 'chrome-production', use: { browserName: 'chromium', channel, viewport: { width: 1366, height: 768 } } },
    { name: 'touch-production', use: { browserName: 'chromium', channel, viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 } },
    { name: 'webkit-production', use: { browserName: 'webkit', viewport: { width: 1024, height: 768 } } },
  ],
  webServer: {
    command: 'node server.js',
    env: { HOST: '127.0.0.1', PORT: '4185' },
    url: 'http://127.0.0.1:4185/healthz',
    reuseExistingServer: false,
    timeout: 15_000,
  },
});
