import { defineConfig, devices } from '@playwright/test';

const PORT = 4173;

export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: true,
  reporter: 'list',
  use: {
    baseURL: `http://localhost:${PORT}`,
    hasTouch: true,
  },
  webServer: {
    command: `npm run build:e2e && npx vite preview --outDir dist-e2e --port ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: false,
    timeout: 180_000,
  },
  projects: [
    {
      name: 'ipad-landscape',
      use: { ...devices['iPad (gen 6) landscape'], hasTouch: true },
      grepInvert: /@portrait|@layout/,
    },
    {
      name: 'ipad-portrait',
      use: { ...devices['iPad (gen 6)'], hasTouch: true },
      grep: /@portrait/,
    },
    {
      name: 'ipad-pro-landscape',
      use: { ...devices['iPad Pro 11 landscape'], hasTouch: true },
      grep: /@layout/,
    },
  ],
});
