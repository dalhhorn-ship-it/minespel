// AC177: the v10 build has version 0.4.0 and a kid readable 0.4.0 changelog entry above 0.3.0.
import { describe, expect, it } from 'vitest';

interface Fs {
  readFileSync(p: string, enc: string): string;
}
const getModule = (globalThis as unknown as { process: { getBuiltinModule(n: string): unknown } }).process.getBuiltinModule;
const fs = getModule('node:fs') as Fs;

describe('v10 release', () => {
  it('AC177: package.json has version 0.4.0 or later (0.5.0 shipped v11)', () => {
    const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8')) as { version: string };
    const [major = 0, minor = 0] = pkg.version.split('.').map(Number);
    expect(major > 0 || minor >= 4).toBe(true);
  });

  it('AC177: CHANGELOG has a 0.4.0 entry about points for every round and the mistake choice', () => {
    const log = fs.readFileSync('CHANGELOG.md', 'utf8');
    const v4 = log.indexOf('## 0.4.0 (2026-10-24)');
    const v3 = log.indexOf('## 0.3.0');
    expect(v4).toBeGreaterThan(-1);
    expect(v4).toBeLessThan(v3);
    const entry = log.slice(v4, v3);
    expect(entry).toMatch(/every round/i);
    expect(entry).toMatch(/mom or dad/i);
    expect(entry).toMatch(/mistake/i);
  });
});
