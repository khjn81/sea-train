import { defineConfig } from '@playwright/test';
import historical from './playwright.config.js';

// Use the full pinned browser in new headless mode, matching real Chrome behavior.
// The historical evaluator and all assertions/timeouts remain unchanged.
export default defineConfig({
  ...historical,
  use: { ...historical.use, channel: 'chromium' },
});
