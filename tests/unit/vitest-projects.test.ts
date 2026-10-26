// Vitest projects (R2d): Node tests share workers, jsdom tests keep isolation.
import { describe, expect, it } from 'vitest';
import { NODE_KEEP_ISOLATION, TEST_PROJECT_FILES } from '../../vite.config';

type Fs = { globSync(p: string): string[]; readFileSync(p: string, enc: string): string };
const fs = (globalThis as unknown as { process: { getBuiltinModule(n: string): unknown } }).process.getBuiltinModule('node:fs') as Fs;
const { globSync, readFileSync } = fs;

const allTests = ['src/**/*.test.ts', 'tests/unit/**/*.test.ts']
  .flatMap((g) => globSync(g))
  .map((f) => f.replaceAll('\\', '/'));

describe('Vitest projects (R2d)', () => {
  it('R2d: every test file is in exactly one project', () => {
    expect(allTests.length).toBeGreaterThan(50);
    for (const f of allTests) {
      const owners = Object.entries(TEST_PROJECT_FILES)
        .filter(([, files]) => files.includes(f))
        .map(([name]) => name);
      expect(owners, f).toHaveLength(1);
    }
  });

  it('R2d: every file with the jsdom comment is in the jsdom project, and only those', () => {
    for (const f of allTests) {
      const hasComment = /@vitest-environment\s+jsdom/.test(readFileSync(f, 'utf8'));
      expect(TEST_PROJECT_FILES.jsdom.includes(f), f).toBe(hasComment);
    }
  });

  it('R2d: the keep-isolation list for Node tests stays short and explains itself', () => {
    const entries = Object.entries(NODE_KEEP_ISOLATION);
    expect(entries.length).toBeLessThanOrEqual(5);
    for (const [file, reason] of entries) {
      expect(reason.length, file).toBeGreaterThan(10);
      expect(TEST_PROJECT_FILES['node-isolated']).toContain(file);
    }
  });
});
