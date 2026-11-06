import { defineConfig } from '@playwright/test';
import release from './release.config.js';

export default defineConfig({
  ...release,
  projects: release.projects.map(project => ({
    ...project,
    use: {
      ...project.use,
      channel: project.use.browserName === 'chromium' ? 'chromium' : undefined,
    },
  })),
});
