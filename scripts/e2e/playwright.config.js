// Copy to the project root as playwright.config.js, or run with: npx playwright test -c scripts/e2e
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: '.',                       // scripts/e2e; move your own e2e specs to a sibling folder and set testDir accordingly
  testMatch: /.*\.spec\.js/,
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['list']] : 'list',
  use: { baseURL: process.env.BASE_URL ?? 'http://localhost:4173' },
  webServer: process.env.BASE_URL
    ? undefined
    : {
        command: 'npm run build && npm run preview -- --port 4173 --strictPort',
        url: 'http://localhost:4173',
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
});
