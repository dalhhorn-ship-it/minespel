/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import pkg from './package.json';

export default defineConfig(({ mode }) => ({
  define: {
    __E2E__: JSON.stringify(mode === 'e2e'),
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  server: { host: true },
  build: { target: 'safari15' },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'tests/unit/**/*.test.ts'],
    setupFiles: ['tests/setup/vitest.setup.ts'],
    define: { __E2E__: false, __APP_VERSION__: JSON.stringify(pkg.version) },
  },
}));
