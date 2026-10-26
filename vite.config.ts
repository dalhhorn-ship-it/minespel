/// <reference types="vitest/config" />
import { defineConfig } from 'vite';

type Fs = { globSync(p: string): string[]; readFileSync(p: string, enc: string): string };
const fs = (globalThis as unknown as { process: { getBuiltinModule(n: string): unknown } }).process.getBuiltinModule('node:fs') as Fs;
const { globSync, readFileSync } = fs;

const TEST_GLOBS = ['src/**/*.test.ts', 'tests/unit/**/*.test.ts'];

/** Node test files that still leak state when workers are shared. Each keeps isolation. One line reason each. */
export const NODE_KEEP_ISOLATION: Record<string, string> = {};

const allTests = TEST_GLOBS.flatMap((g) => globSync(g))
  .map((f) => f.replaceAll('\\', '/'))
  .sort();
const isJsdom = (f: string) => /@vitest-environment\s+jsdom/.test(readFileSync(f, 'utf8'));
const jsdomFiles = allTests.filter(isJsdom);
const nodeIsolated = allTests.filter((f) => f in NODE_KEEP_ISOLATION && !jsdomFiles.includes(f));
const nodeShared = allTests.filter((f) => !jsdomFiles.includes(f) && !nodeIsolated.includes(f));

/** Which test files run in which Vitest project (checked by tests/unit/vitest-projects.test.ts). */
export const TEST_PROJECT_FILES = {
  node: nodeShared,
  'node-isolated': nodeIsolated,
  jsdom: jsdomFiles,
};

const common = {
  setupFiles: ['tests/setup/vitest.setup.ts'],
};

export default defineConfig(({ mode }) => ({
  define: {
    __E2E__: JSON.stringify(mode === 'e2e'),
  },
  server: { host: true },
  build: { target: 'safari15' },
  test: {
    projects: [
      // Node tests share a worker (no isolation): much faster start up.
      {
        define: { __E2E__: false },
        test: { name: 'node', environment: 'node', isolate: false, include: nodeShared, ...common },
      },
      {
        define: { __E2E__: false },
        test: { name: 'node-isolated', environment: 'node', isolate: true, include: nodeIsolated, ...common },
      },
      {
        define: { __E2E__: false },
        test: { name: 'jsdom', environment: 'jsdom', isolate: true, include: jsdomFiles, ...common },
      },
    ],
  },
}));
