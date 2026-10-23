import { defineConfig, devices } from '@playwright/test';

const PORT = 4173;

// R1a: E2E_LOCAL=1 runs the same projects in the Chromium on disk (the cloud
// container cannot download WebKit). CI never sets it and keeps WebKit.
const env = (globalThis as unknown as { process: { env: Record<string, string | undefined> } }).process.env;
const local = env.E2E_LOCAL === '1';
const localUse = local
  ? {
      defaultBrowserType: 'chromium' as const,
      launchOptions: {
        executablePath: env.E2E_CHROMIUM || '/opt/pw-browsers/chromium',
        args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
      },
    }
  : {};

export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: true,
  ...(local ? { workers: 2 } : {}),
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
      use: { ...devices['iPad (gen 6) landscape'], hasTouch: true, ...localUse },
      grepInvert: /@portrait|@layout/,
    },
    {
      name: 'ipad-portrait',
      use: { ...devices['iPad (gen 6)'], hasTouch: true, ...localUse },
      grep: /@portrait/,
    },
    {
      name: 'ipad-pro-landscape',
      use: { ...devices['iPad Pro 11 landscape'], hasTouch: true, ...localUse },
      grep: /@layout/,
    },
  ],
});
