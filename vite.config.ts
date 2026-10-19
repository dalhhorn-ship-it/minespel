/// <reference types="vitest/config" />
import { defineConfig } from 'vite';

export default defineConfig(({ mode }) => ({
  define: {
    __E2E__: JSON.stringify(mode === 'e2e'),
  },
  server: { host: true },
  build: { target: 'safari15' },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'tests/unit/**/*.test.ts'],
    setupFiles: ['tests/setup/vitest.setup.ts'],
    define: { __E2E__: false },
  },
}));
