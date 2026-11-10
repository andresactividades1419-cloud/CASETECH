import { defineConfig, devices } from '@playwright/test';

const port = Number(process.env.FRONT_PORT ?? 3000);

export default defineConfig({
  testDir: './tests',
  use: {
    baseURL: `http://localhost:${port}`,
    trace: 'on-first-retry',
  },
  reporter: [['list'], ['html', { open: 'never' }]],
  retries: process.env.CI ? 1 : 0,
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: `pnpm run dev`,
    cwd: '../frontend',
    url: `http://localhost:${port}`,
    reuseExistingServer: !process.env.CI,
  },
});
